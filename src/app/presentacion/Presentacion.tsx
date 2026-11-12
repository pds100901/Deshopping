import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Oficina } from '@jules/oficina';
import type { AgenteOficina as Agente, PresenciaJules } from '@jules/oficina';
import { fechaChileA } from '../hora';
import { IndicadorAmbiente } from '../IndicadorAmbiente';
import { Leyenda } from '../Leyenda';
import { PanelEquipo } from '../PanelEquipo';
import { armarRosterReal } from '../roster';
import { avisoModoLocal, desenlace, pedirRespuesta } from './cliente-orden';
import {
  FRASE_ORDEN_DELICADA,
  aprobar,
  elegirClip,
  encolar,
  esperarDecision,
  ordenar,
  rechazar,
  respuestaDe,
  siguiente,
} from './ordenes';
import type { Clip } from './ordenes';
import { MOMENTOS, cargarMomento, guardarMomento, horaDe } from './momento';
import type { Momento } from './momento';
import { PanelOrden } from './PanelOrden';
import { RETRASO_SALUDO_MS, crearSfx } from './sonidos';
import { accionDeTecla } from './teclas';
import { BandejaEntregas } from '../trabajo/BandejaEntregas';
import { useTrabajo } from '../trabajo/useTrabajo';
import type { Novedad } from '../trabajo/useTrabajo';
import '../estilos.css';

const BASE = `${import.meta.env.BASE_URL}presentacion/`.replace(/\/{2,}/g, '/');
/** Deriva lenta de la cámara (rad/s de pico): ningún plano queda quieto. */
const DERIVA = 0.06;
/** Segundos en silencio, por debajo del umbral, tras los que Jules deja de hablar. */
const SILENCIO_LARGO = 0.6;
const UMBRAL_SILENCIO = 0.02;
const SEGUNDOS_PISTA = 4;
/** Segundos que se queda el toast con la frase de Jules tras terminar el clip. */
const COLA_TOAST = 1.5;
/** La oficina corre dentro de un artefacto de claude.ai (ahí el modelo es `sample`, sin servidor local). */
const enArtefacto = () => typeof window !== 'undefined' && 'claude' in window;
const ALIVIO_ENTREGA = 'Gracias. Queda aprobada.';

/**
 * La oficina: la cámara es libre y los agentes reciben órdenes desde que carga. Jules confirma
 * cada orden con un clip pregrabado. Teclas: `1`/`2`/`3` eligen la hora del día y `Esc` cierra
 * el panel.
 */
export function Presentacion() {
  const [agentes, setAgentes] = useState(armarRosterReal);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [vistaGeneral, setVistaGeneral] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [presencia, setPresencia] = useState<PresenciaJules>('escuchando');
  const [nivel, setNivel] = useState(0);
  const [ambienteId, setAmbienteId] = useState<string | null>(null);
  /** Agentes cuya respuesta del modelo aún no llega: el panel muestra «…». */
  const [pensando, setPensando] = useState<Record<string, true>>({});
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);
  const [pista, setPista] = useState<'visible' | 'saliendo'>('visible');
  const [momento, setMomento] = useState<Momento>(cargarMomento);
  const [sfx] = useState(() =>
    crearSfx((nombre) => fetch(`${BASE}sfx/${nombre}.mp3`).then((r) => r.arrayBuffer())),
  );

  const analizador = useRef<AnalyserNode | null>(null);
  const audioOrden = useRef<HTMLAudioElement>(null);
  const contexto = useRef<AudioContext | null>(null);
  const ordenConectado = useRef(false);
  const cola = useRef<Clip[]>([]);
  const ultimoClip = useRef<string | null>(null);
  const ordenes = useRef(0);
  /** Época global (sube con Aprobar/Rechazar) y secuencia por agente: invalidan respuestas viejas. */
  const epoca = useRef(0);
  const secuencias = useRef<Record<string, number>>({});
  const pendientes = useRef(new Map<string, AbortController>());
  const avisoDado = useRef(false);

  useEffect(() => {
    let vivo = true;
    fetch(`${BASE}ordenes/frases.json`)
      .then((r) => r.json() as Promise<Clip[]>)
      .then((c) => vivo && setClips(c))
      .catch(() => undefined); // sin clips las órdenes funcionan igual, solo sin la voz de Jules
    return () => {
      vivo = false;
    };
  }, []);

  /** Crea (una vez) el analizador que mide el volumen de la voz de Jules. */
  const asegurarAnalizador = useCallback(() => {
    if (!contexto.current || !analizador.current) {
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      an.connect(ctx.destination);
      contexto.current = ctx;
      analizador.current = an;
    }
    return { ctx: contexto.current, an: analizador.current };
  }, []);

  /** Activa el audio (hay que llamarlo desde un gesto del usuario) y deja listos los efectos. */
  const prepararAudio = useCallback(() => {
    try {
      const { ctx } = asegurarAnalizador();
      void ctx.resume();
      sfx.preparar(ctx);
    } catch {
      // sin Web Audio la oficina sigue, solo sin efectos
    }
  }, [asegurarAnalizador, sfx]);

  /** Sube la época, aborta lo que viaja y quita los «…»: toda respuesta en camino quedará descartada. */
  const invalidarPeticiones = useCallback(() => {
    epoca.current++;
    for (const c of pendientes.current.values()) c.abort();
    pendientes.current.clear();
    setPensando({});
  }, []);

  // Al cerrar o cambiar de panel se cancela lo que viajaba (el texto local ya está guardado).
  useEffect(() => {
    for (const [id, control] of pendientes.current) {
      if (id === seleccionadoId) continue;
      control.abort();
      pendientes.current.delete(id);
      setPensando((prev) => {
        const resto = { ...prev };
        delete resto[id];
        return resto;
      });
    }
    setAvisoLocal(null);
  }, [seleccionadoId]);

  // Al desmontar no queda nada viajando.
  useEffect(() => invalidarPeticiones, [invalidarPeticiones]);

  /** Reproduce el siguiente clip de la cola si no hay otro sonando. */
  const reproducirSiguiente = useCallback(() => {
    const orden = audioOrden.current;
    if (!orden || (!orden.paused && !orden.ended)) return;
    const { clip, resto } = siguiente(cola.current);
    if (!clip) return;
    cola.current = resto;
    try {
      if (!ordenConectado.current) {
        const { ctx, an } = asegurarAnalizador();
        ctx.createMediaElementSource(orden).connect(an);
        ordenConectado.current = true;
      }
      orden.src = `${BASE}ordenes/${clip.archivo}`;
      void orden.play().then(
        () => setToast(clip.texto),
        () => undefined,
      );
    } catch {
      // sin audio el toast igual confirma la orden
      setToast(clip.texto);
    }
  }, [asegurarAnalizador]);

  const elegirMomento = useCallback((m: Momento) => {
    setMomento(m);
    guardarMomento(m);
  }, []);

  useEffect(() => {
    const escribiendoEn = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches('input, textarea, select, [contenteditable="true"]');
    const alTecla = (e: KeyboardEvent) => {
      const accion = accionDeTecla(e, escribiendoEn(e.target));
      if (!accion) return;
      if (accion.tipo === 'momento') elegirMomento(accion.momento);
      else setSeleccionadoId(null);
    };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [elegirMomento]);

  // Jules habla mientras suena su clip: se mide el volumen cada cuadro y solo se renderiza
  // cuando algo cambia. El resto del tiempo escucha.
  useEffect(() => {
    const muestras = new Float32Array(1024);
    let suave = 0;
    let silencio = 0;
    let ultimo = performance.now();
    let ultimoNivel = 0;
    let cuadro = 0;
    const paso = (ahora: number) => {
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      const an = analizador.current;
      const orden = audioOrden.current;
      if (an && orden && !orden.paused) {
        an.getFloatTimeDomainData(muestras);
        let suma = 0;
        for (const m of muestras) suma += m * m;
        const rms = Math.min(1, Math.sqrt(suma / muestras.length) * 4);
        suave += (rms - suave) * (rms > suave ? 0.5 : 0.15);
        silencio = suave < UMBRAL_SILENCIO ? silencio + dt : 0;
        setPresencia(silencio > SILENCIO_LARGO ? 'escuchando' : 'hablando');
      } else {
        suave = 0;
        setPresencia('escuchando');
      }
      if (Math.abs(suave - ultimoNivel) > 0.02) {
        ultimoNivel = suave;
        setNivel(suave);
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  // Pista de controles al abrir la oficina: se va sola a los 4 s.
  useEffect(() => {
    const sale = window.setTimeout(() => setPista('saliendo'), SEGUNDOS_PISTA * 1000);
    return () => window.clearTimeout(sale);
  }, []);

  // El toast con la frase de Jules se va solo, un poco después de que termina el clip.
  useEffect(() => {
    if (toast === null) return;
    const el = audioOrden.current;
    const quitar = () => window.setTimeout(() => setToast(null), COLA_TOAST * 1000);
    let t = 0;
    const alTerminar = () => {
      t = quitar();
    };
    el?.addEventListener('ended', alTerminar, { once: true });
    const tope = window.setTimeout(() => setToast(null), 9000);
    return () => {
      el?.removeEventListener('ended', alTerminar);
      window.clearTimeout(t);
      window.clearTimeout(tope);
    };
  }, [toast]);

  // Saludo: poco después de tocar a un agente.
  useEffect(() => {
    if (seleccionadoId) sfx.sonar('saludo', RETRASO_SALUDO_MS);
  }, [seleccionadoId, sfx]);

  const horaSimulada = useMemo(() => fechaChileA(horaDe(momento)), [momento]);

  const seleccionado = agentes.find((a) => a.id === seleccionadoId);

  const alSeleccionar = (id: string | null) => {
    if (id) prepararAudio();
    setSeleccionadoId(id);
  };

  const alAmbiente = (id: string | null) => {
    if (id) {
      prepararAudio();
      sfx.sonar('transicion');
    }
    setAmbienteId(id);
  };

  const actualizar = (id: string, agente: Agente, frase: string) => {
    setAgentes((prev) => prev.map((a) => (a.id === id ? agente : a)));
    setRespuestas((prev) => ({ ...prev, [id]: frase }));
  };

  /**
   * Pide el TEXTO de la respuesta al modelo. El estado del agente ya se aplicó en local; si el
   * texto no llega o llega viejo, queda la frase local. Si la respuesta vigente dice que la
   * orden exige aprobación (el cerebro la vio delicada), el agente pasa a esperar tu decisión
   * aunque su rol actúe solo.
   */
  const pedirAlModelo = (agente: Agente, orden: string) => {
    const secuencia = (secuencias.current[agente.id] ?? 0) + 1;
    secuencias.current[agente.id] = secuencia;
    const pedida = { secuencia, epoca: epoca.current };
    pendientes.current.get(agente.id)?.abort();
    const control = new AbortController();
    pendientes.current.set(agente.id, control);
    setPensando((prev) => ({ ...prev, [agente.id]: true }));
    setAvisoLocal(null);
    void pedirRespuesta(
      { agente: agente.nombre, rol: agente.rol, tarea: agente.tarea, orden },
      { fetch: (u, i) => fetch(u, i), signal: control.signal },
    ).then((resultado) => {
      if (control.signal.aborted) return;
      const actual = { secuencia: secuencias.current[agente.id] ?? 0, epoca: epoca.current };
      const fin = desenlace(pedida, actual, agente.rol, resultado);
      if (!fin) return;
      pendientes.current.delete(agente.id);
      setPensando((prev) => {
        const resto = { ...prev };
        delete resto[agente.id];
        return resto;
      });
      if (fin.escalar) {
        setAgentes((prev) => prev.map((a) => (a.id === agente.id ? esperarDecision(a, orden) : a)));
      }
      const frase = fin.texto ?? (fin.escalar ? FRASE_ORDEN_DELICADA : null);
      if (frase) setRespuestas((prev) => ({ ...prev, [agente.id]: frase }));
      if (!fin.texto && !avisoDado.current) {
        avisoDado.current = true;
        setAvisoLocal(avisoModoLocal(fin.motivo));
      }
    });
  };

  /** Lo que le pasa a un agente por su entrega se ve en la casa: su estado, su tarea y su frase. */
  const alNovedad = (agenteId: string, novedad: Novedad) => {
    const cambio: Record<Novedad['tipo'], [Agente['estado'], Agente['actividad'], string, string]> = {
      escribiendo: ['trabajando', 'escribiendo', novedad.orden, 'Voy. Te dejo la entrega en la bandeja.'],
      lista: [
        'esperando_decision',
        'pensando',
        `Entrega lista: «${novedad.orden}». Espera el visto bueno de ${'aprueba' in novedad ? novedad.aprueba : 'Pau'}.`,
        'Listo. Te dejé la entrega en la bandeja.',
      ],
      aprobada: ['libre', undefined, `Entrega aprobada: «${novedad.orden}».`, ALIVIO_ENTREGA],
      rechazada: ['libre', undefined, `Entrega rechazada: «${novedad.orden}».`, 'Entendido. La descarto.'],
      fallo: ['libre', undefined, `No pude entregar: «${novedad.orden}».`, 'No pude terminar. Mirá la bandeja.'],
    };
    const [estado, actividad, tarea, frase] = cambio[novedad.tipo];
    setAgentes((prev) => prev.map((a) => (a.id === agenteId ? { ...a, estado, actividad, tarea } : a)));
    setRespuestas((prev) => ({ ...prev, [agenteId]: frase }));
  };
  const trabajo = useTrabajo(alNovedad);
  const [bandejaAbierta, setBandejaAbierta] = useState(false);
  const pendienteDe = (agenteId: string) =>
    trabajo.entregas.find((e) => e.agenteId === agenteId && e.estado === 'por_revisar');

  // Quien tiene una entrega por revisar aparece esperando, también al volver a abrir la oficina.
  // No toca a quien está escribiendo una nueva versión.
  const { entregas, enCurso } = trabajo;
  const escribiendo = useRef(new Set<string>());
  escribiendo.current = new Set(enCurso.filter((c) => !c.fallo).map((c) => c.agenteId));
  useEffect(() => {
    const esperan = new Map(
      entregas.filter((e) => e.estado === 'por_revisar').map((e) => [e.agenteId, e]),
    );
    if (esperan.size === 0) return;
    setAgentes((prev) => {
      let cambio = false;
      const siguiente = prev.map((a) => {
        const e = esperan.get(a.id);
        if (!e || a.estado === 'esperando_decision' || escribiendo.current.has(a.id)) return a;
        cambio = true;
        return {
          ...a,
          estado: 'esperando_decision' as const,
          actividad: 'pensando' as const,
          tarea: `Entrega lista: «${e.orden}». Espera el visto bueno de ${e.aprueba}.`,
        };
      });
      return cambio ? siguiente : prev;
    });
  }, [entregas]);

  const darOrden = (texto: string) => {
    if (!seleccionado) return;
    const nuevo = ordenar(seleccionado, texto);
    if (nuevo === seleccionado) return;
    prepararAudio();
    sfx.sonar('orden');
    actualizar(seleccionado.id, nuevo, respuestaDe(seleccionado.rol, ordenes.current++));
    // El trabajo de verdad: la entrega llega a la bandeja. La frase corta del modelo solo se
    // pide en la computadora (en el artefacto no hay servidor local).
    if (!enArtefacto()) pedirAlModelo(seleccionado, texto);
    trabajo.encargar(seleccionado, texto);
    const clip = elegirClip(clips, ultimoClip.current, Math.random, seleccionado.rol);
    if (clip) {
      ultimoClip.current = clip.archivo;
      cola.current = encolar(cola.current, clip);
      reproducirSiguiente();
    }
  };

  const resolver = (transicion: typeof aprobar) => {
    if (!seleccionado) return;
    // Si hay una entrega esperando, aprobar o rechazar al agente es aprobar o rechazar su entrega.
    const pendiente = pendienteDe(seleccionado.id);
    if (pendiente) {
      if (transicion === aprobar) trabajo.aprobar(pendiente);
      else trabajo.rechazar(pendiente);
      return;
    }
    invalidarPeticiones();
    const { agente, frase } = transicion(seleccionado);
    actualizar(seleccionado.id, agente, frase);
  };

  return (
    <div className="lab presentacion">
      <div className="escena">
        <Oficina
          agentes={agentes}
          encuadreLibre
          calidad="alta"
          visible
          horaChile={horaSimulada}
          ambienteId={ambienteId}
          onAmbiente={alAmbiente}
          enfocadoId={seleccionadoId}
          seleccionadoId={seleccionadoId}
          onSeleccionar={alSeleccionar}
          vistaGeneral={vistaGeneral}
          presenciaJules={presencia}
          nivelVozJules={presencia === 'hablando' ? nivel : undefined}
          derivaCamara={DERIVA}
        />
      </div>
      <audio ref={audioOrden} preload="auto" onEnded={reproducirSiguiente} />
      <div className="pres-hora" role="group" aria-label="Hora del día">
        {MOMENTOS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === momento ? 'activo' : undefined}
            aria-pressed={m.id === momento}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => elegirMomento(m.id)}
          >
            <kbd>{m.tecla}</kbd>
            {m.nombre}
          </button>
        ))}
      </div>
      <Leyenda />
      <PanelEquipo agentes={agentes} seleccionadoId={seleccionadoId} onSeleccionar={alSeleccionar} />
      <BandejaEntregas
        entregas={trabajo.entregas}
        enCurso={trabajo.enCurso}
        compartido={trabajo.compartido}
        abierta={bandejaAbierta}
        onAbrir={setBandejaAbierta}
        onAprobar={trabajo.aprobar}
        onRechazar={trabajo.rechazar}
        onCambios={trabajo.pedirCambios}
        onBorrar={trabajo.borrar}
        onReintentar={trabajo.reintentar}
        onDescartar={trabajo.descartar}
      />
      <IndicadorAmbiente
        ambienteId={ambienteId}
        onSalir={() => setAmbienteId(null)}
        onVistaGeneral={() => {
          setAmbienteId(null);
          setSeleccionadoId(null);
          setVistaGeneral((v) => v + 1);
        }}
      />
      {seleccionado && (
        <PanelOrden
          key={seleccionado.id}
          agente={seleccionado}
          respuesta={respuestas[seleccionado.id]}
          pensando={pensando[seleccionado.id] === true}
          aviso={avisoLocal}
          onOrden={darOrden}
          onAprobar={() => resolver(aprobar)}
          onRechazar={() => resolver(rechazar)}
          onCerrar={() => setSeleccionadoId(null)}
          onVerEntregas={() => setBandejaAbierta(true)}
        />
      )}
      {toast && (
        <p className="pres-toast" role="status" key={toast}>
          <b>Jules</b>
          {toast}
        </p>
      )}
      <p className={pista === 'saliendo' ? 'pres-pista oculto' : 'pres-pista'}>
        Arrastrá para girar · rueda para acercar · tocá una sala
      </p>
    </div>
  );
}
