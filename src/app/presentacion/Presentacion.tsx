import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Oficina } from '@jules/oficina';
import type { AgenteOficina as Agente, PresenciaJules, Proyector } from '@jules/oficina';
import { fechaChileA } from '../hora';
import { IndicadorAmbiente } from '../IndicadorAmbiente';
import { Leyenda } from '../Leyenda';
import { armarRosterRecorrido } from '../roster';
import { palabrasDe } from './alineacion';
import type { Alineacion } from './alineacion';
import { GUION } from './guion';
import { CursorDemo } from './CursorDemo';
import { conZoom, zoomEn } from './encuadre';
import { LineasReparto } from './LineasReparto';
import { avisoModoLocal, desenlace, pedirRespuesta } from './cliente-orden';
import { agentesDemo, armarDemo, demoEn, respuestaDemo } from './demo';
import type { EstadoDemo } from './demo';
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
import { armarPlan, estadoEn } from './recorrido';
import type { Estado, Plan, Voz } from './recorrido';
import { RotuloDeAgente, RotuloFijo, RotuloSala } from './RotulosEnPantalla';
import { ROTULO_JULES, rotuloAgente, rotuloAmbiente } from './rotulos';
import { CTA, ROTULO_FIJO, SUBTITULO } from './disposicion';
import { TarjetasFlotantes } from './TarjetasFlotantes';
import { RETRASO_SALUDO_MS, crearSfx } from './sonidos';
import { accionDeTecla } from './teclas';
import '../estilos.css';

const BASE = `${import.meta.env.BASE_URL}presentacion/`.replace(/\/{2,}/g, '/');
/** Deriva lenta de la cámara (rad/s de pico): ningún plano queda quieto. */
const DERIVA = 0.06;
/** En los planos de Jules la órbita se nota: ±~25° en lugar de ±7°. */
const DERIVA_JULES = 0.2;
/** Segundos en silencio, por debajo del umbral, tras los que Jules vuelve a `reposo`. */
const SILENCIO_LARGO = 0.6;
const UMBRAL_SILENCIO = 0.02;
const SEGUNDOS_PISTA = 4;
/** Segundos que se queda el toast con la frase de Jules tras terminar el clip. */
const COLA_TOAST = 1.5;
/** Fundido desde negro al tocar «Empezar», y cuánto tarda la voz en arrancar dentro de él. */
const FUNDIDO_MS = 800;
const VOZ_TRAS_FUNDIDO_MS = 600;
/** Sin mover el mouse, el botón de pausa se oculta tras esto. */
const OCULTAR_PAUSA_MS = 2000;
/** Cuánto se queda el rótulo de sala al entrar a un ambiente. */
const ROTULO_SALA_MS = 3500;
const AVISO_GRABACION_MS = 1000;
const TEXTO_CTA = 'Pedí por WhatsApp · De Shopping con Pau 🛍️';

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esperaInicial: Estado = {
  fase: 'espera',
  ambienteId: null,
  enfocadoId: null,
  vistaGeneral: 0,
  subtitulo: '',
  vozSubtitulo: 'pau',
  voz: null,
  cta: false,
  plano: 1,
  julesDeFrente: false,
  cortesSecos: 0,
  julesPresente: false,
};

const demoVacia: EstadoDemo = {
  cursor: null,
  panel: null,
  bruno: 'espera',
  nico: 'pendiente',
  valentinaEscribiendoGuion: false,
};

const guiadoInicial: Estado = { ...esperaInicial, fase: 'guiado' };

const igual = (a: Estado, b: Estado) =>
  a.fase === b.fase &&
  a.ambienteId === b.ambienteId &&
  a.enfocadoId === b.enfocadoId &&
  a.vistaGeneral === b.vistaGeneral &&
  a.subtitulo === b.subtitulo &&
  a.vozSubtitulo === b.vozSubtitulo &&
  a.voz === b.voz &&
  a.cta === b.cta &&
  a.plano === b.plano &&
  a.julesDeFrente === b.julesDeFrente &&
  a.cortesSecos === b.cortesSecos &&
  a.julesPresente === b.julesPresente;

const igualDemo = (a: EstadoDemo, b: EstadoDemo) =>
  a.bruno === b.bruno &&
  a.nico === b.nico &&
  a.valentinaEscribiendoGuion === b.valentinaEscribiendoGuion &&
  a.panel?.agenteId === b.panel?.agenteId &&
  a.panel?.texto === b.panel?.texto &&
  a.panel?.resaltarAprobar === b.panel?.resaltarAprobar;

/**
 * Modo Presentación: Pau y Jules narran a dúo un recorrido por la casa con una pista pregrabada; la cámara
 * viaja sola por los ambientes y enfoca a cada agente cuando la voz dice su nombre. Antes de
 * «Empezar» y en «Ahora la manejas tú» la cámara es libre y los agentes reciben órdenes.
 * Teclas: `R` reinicia (para repetir tomas), espacio pausa, `1`/`2`/`3` la hora del día
 * (antes de empezar) y `H` el modo grabación.
 */
export function Presentacion() {
  const [agentes, setAgentes] = useState(armarRosterRecorrido);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [vistaLibre, setVistaLibre] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [demoEstado, setDemoEstado] = useState<EstadoDemo>(demoVacia);
  const [estado, setEstado] = useState<Estado>(esperaInicial);
  const [empezado, setEmpezado] = useState(false);
  const [falloAudio, setFalloAudio] = useState(false);
  const [presencia, setPresencia] = useState<PresenciaJules>('escuchando');
  const [nivel, setNivel] = useState(0);
  const [ambienteLibre, setAmbienteLibre] = useState<string | null>(null);
  const [reinicios, setReinicios] = useState(0);
  /** Agentes cuya respuesta del modelo aún no llega: el panel muestra «…». */
  const [pensando, setPensando] = useState<Record<string, true>>({});
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);
  const [pista, setPista] = useState<'oculta' | 'visible' | 'saliendo'>('oculta');
  const [momento, setMomento] = useState<Momento>(cargarMomento);
  const [pausado, setPausado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [avisoGrabacion, setAvisoGrabacion] = useState<string | null>(null);
  const [telon, setTelon] = useState<'oculto' | 'negro' | 'sale'>('oculto');
  const [ratonActivo, setRatonActivo] = useState(true);
  const [salaRotulada, setSalaRotulada] = useState<string | null>(null);
  const [sfx] = useState(() =>
    crearSfx((nombre) => fetch(`${BASE}sfx/${nombre}.mp3`).then((r) => r.arrayBuffer())),
  );

  const audio = useRef<HTMLAudioElement>(null);
  const analizador = useRef<AnalyserNode | null>(null);
  const planRef = useRef<Plan | null>(null);
  const tiempo = useRef(0);
  const proyector = useRef<Proyector | null>(null);
  const zoom = useRef(1);
  const escena = useRef<HTMLDivElement>(null);
  const agentesVistos = useRef<Agente[]>([]);
  const vozRef = useRef<Voz | null>(null);
  const demoRef = useRef<ReturnType<typeof armarDemo> | null>(null);
  const audioOrden = useRef<HTMLAudioElement>(null);
  const contexto = useRef<AudioContext | null>(null);
  const principalConectado = useRef(false);
  const ordenConectado = useRef(false);
  const cola = useRef<Clip[]>([]);
  const ultimoClip = useRef<string | null>(null);
  const ordenes = useRef(0);
  /** Época global (sube con reinicio y con Aprobar/Rechazar) y secuencia por agente: invalidan respuestas viejas. */
  const epoca = useRef(0);
  const secuencias = useRef<Record<string, number>>({});
  const pendientes = useRef(new Map<string, AbortController>());
  const avisoDado = useRef(false);
  const pausadoRef = useRef(false);
  const arranqueVoz = useRef(0);

  useEffect(() => {
    let vivo = true;
    fetch(`${BASE}ordenes/frases.json`)
      .then((r) => r.json() as Promise<Clip[]>)
      .then((c) => vivo && setClips(c))
      .catch(() => undefined); // sin clips las órdenes funcionan igual, solo sin la voz de Jules
    fetch(`${BASE}dueto-recorrido.alineacion.json`)
      .then((r) => r.json() as Promise<{ alineacion: Alineacion; voces: Voz[] }>)
      .then((d) => {
        if (!vivo) return;
        const p = armarPlan(palabrasDe(d.alineacion), GUION, d.voces);
        planRef.current = p;
        demoRef.current = armarDemo(p.marcas);
        setPlan(p);
      })
      .catch(() => vivo && setFalloAudio(true));
    return () => {
      vivo = false;
    };
  }, []);

  /** Crea (una vez) el analizador que mide el volumen de cualquiera de las dos voces. */
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
      // sin Web Audio la presentación sigue, solo sin efectos
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

  /**
   * Arranca (o reinicia) el recorrido: deja la casa como al principio, entra con un fundido
   * desde negro y la voz empieza dentro del fundido. Sirve para «Empezar» y para `R`.
   */
  const comenzar = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    window.clearTimeout(arranqueVoz.current);
    sfx.detener();
    cola.current = [];
    audioOrden.current?.pause();
    ordenes.current = 0;
    ultimoClip.current = null;
    invalidarPeticiones();
    setAvisoLocal(null);
    pausadoRef.current = false;
    setPausado(false);
    setTerminado(false);
    setAgentes(armarRosterRecorrido());
    setRespuestas({});
    setSeleccionadoId(null);
    setToast(null);
    setDemoEstado(demoVacia);
    tiempo.current = 0;
    setAmbienteLibre(null);
    setReinicios((n) => n + 1);
    setPista('oculta');
    setSalaRotulada(null);
    setEstado(guiadoInicial);
    setRatonActivo(true);
    try {
      if (!principalConectado.current) {
        const { ctx, an } = asegurarAnalizador();
        ctx.createMediaElementSource(el).connect(an);
        principalConectado.current = true;
      }
      prepararAudio();
    } catch {
      setFalloAudio(true);
      return;
    }
    el.pause();
    el.currentTime = 0;
    setEmpezado(true);
    const arrancar = () => {
      if (pausadoRef.current) return;
      el.play().catch(() => setFalloAudio(true));
    };
    if (sinMovimiento()) {
      setTelon('oculto');
      arrancar();
    } else {
      setTelon('negro');
      arranqueVoz.current = window.setTimeout(arrancar, 60 + VOZ_TRAS_FUNDIDO_MS);
    }
  }, [asegurarAnalizador, prepararAudio, sfx, invalidarPeticiones]);

  // El telón negro se desvanece en FUNDIDO_MS y luego se quita.
  useEffect(() => {
    if (telon === 'negro') {
      const t = window.setTimeout(() => setTelon('sale'), 60);
      return () => window.clearTimeout(t);
    }
    if (telon === 'sale') {
      const t = window.setTimeout(() => setTelon('oculto'), FUNDIDO_MS + 50);
      return () => window.clearTimeout(t);
    }
  }, [telon]);

  /** Reproduce el siguiente clip de la cola si no hay ninguna voz sonando. */
  const reproducirSiguiente = useCallback(() => {
    const orden = audioOrden.current;
    const principal = audio.current;
    if (pausadoRef.current) return;
    if (!orden || (!orden.paused && !orden.ended) || (principal && !principal.paused)) return;
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

  /** Pausa o reanuda la voz; con ella se detiene la línea de tiempo (depende de `currentTime`). */
  const alternarPausa = useCallback(() => {
    const el = audio.current;
    const orden = audioOrden.current;
    if (!el) return;
    if (pausadoRef.current) {
      pausadoRef.current = false;
      setPausado(false);
      void el.play();
      if (orden && orden.currentTime > 0 && !orden.ended) void orden.play();
      return;
    }
    if (el.ended) return;
    window.clearTimeout(arranqueVoz.current);
    pausadoRef.current = true;
    setPausado(true);
    el.pause();
    orden?.pause();
    sfx.detener();
  }, [sfx]);

  const alternarGrabacion = useCallback(() => {
    setGrabando((g) => {
      setAvisoGrabacion(g ? 'Modo grabación desactivado' : 'Modo grabación activado');
      return !g;
    });
  }, []);

  // El aviso del modo grabación dura un segundo y se va solo.
  useEffect(() => {
    if (avisoGrabacion === null) return;
    const t = window.setTimeout(() => setAvisoGrabacion(null), AVISO_GRABACION_MS);
    return () => window.clearTimeout(t);
  }, [avisoGrabacion]);

  const elegirMomento = useCallback((m: Momento) => {
    setMomento(m);
    guardarMomento(m);
  }, []);

  // Si la voz no carga, el recorrido pasa directo al modo libre.
  const fase = falloAudio ? 'libre' : empezado ? estado.fase : 'espera';
  /** En espera y en libre el usuario maneja la cámara y los agentes. */
  const interactivo = fase !== 'guiado';

  useEffect(() => {
    const escribiendoEn = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches('input, textarea, select, [contenteditable="true"]');
    const alTecla = (e: KeyboardEvent) => {
      const accion = accionDeTecla(e, { escribiendo: escribiendoEn(e.target), fase, empezado });
      if (!accion) return;
      switch (accion.tipo) {
        case 'pausa':
          e.preventDefault();
          if (!e.repeat) alternarPausa();
          break;
        case 'reiniciar':
          comenzar();
          break;
        case 'grabacion':
          if (!e.repeat) alternarGrabacion();
          break;
        case 'momento':
          elegirMomento(accion.momento);
          break;
        case 'cerrar':
          setSeleccionadoId(null);
          break;
      }
    };
    // Un botón enfocado activaría su clic al soltar el espacio: la pausa manda.
    const alSoltar = (e: KeyboardEvent) => {
      if (e.key === ' ' && empezado && !escribiendoEn(e.target)) e.preventDefault();
    };
    window.addEventListener('keydown', alTecla);
    window.addEventListener('keyup', alSoltar);
    return () => {
      window.removeEventListener('keydown', alTecla);
      window.removeEventListener('keyup', alSoltar);
    };
  }, [fase, empezado, alternarPausa, comenzar, alternarGrabacion, elegirMomento]);

  // Reloj del recorrido: lee el audio cada cuadro y solo renderiza cuando algo cambia.
  useEffect(() => {
    if (!empezado && !falloAudio) return;
    const muestras = new Float32Array(1024);
    let suave = 0;
    let silencio = 0;
    let ultimo = performance.now();
    let ultimoNivel = 0;
    let cuadro = 0;
    const paso = (ahora: number) => {
      const el = audio.current;
      const p = planRef.current;
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      if (el && p) {
        tiempo.current = el.currentTime;
        const nuevo = estadoEn(el.currentTime, p);
        vozRef.current = nuevo.voz;
        const d = demoRef.current;
        if (d) {
          const de = demoEn(el.currentTime, d);
          setDemoEstado((prev) => (igualDemo(prev, de) ? prev : de));
        }
        const e = escena.current;
        if (e) {
          zoom.current = nuevo.fase === 'guiado' ? zoomEn(el.currentTime, p) : 1;
          e.style.transform = zoom.current === 1 ? '' : `scale(${zoom.current})`;
        }
        // Antes de que la voz arranque (fundido de entrada) todavía no hay subtítulo.
        if (el.currentTime === 0 && el.paused) nuevo.subtitulo = '';
        setEstado((prev) => (igual(prev, nuevo) ? prev : nuevo));
      }
      const an = analizador.current;
      const orden = audioOrden.current;
      if (an && ((el && !el.paused && vozRef.current === 'jules') || (orden && !orden.paused))) {
        an.getFloatTimeDomainData(muestras);
        let suma = 0;
        for (const m of muestras) suma += m * m;
        const rms = Math.min(1, Math.sqrt(suma / muestras.length) * 4);
        suave += (rms - suave) * (rms > suave ? 0.5 : 0.15);
        silencio = suave < UMBRAL_SILENCIO ? silencio + dt : 0;
        setPresencia(silencio > SILENCIO_LARGO ? 'reposo' : 'hablando');
      } else {
        suave = 0;
        setPresencia('reposo');
      }
      if (Math.abs(suave - ultimoNivel) > 0.02) {
        ultimoNivel = suave;
        setNivel(suave);
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [empezado, falloAudio, reinicios]);

  // Pista al entrar en libre: se va sola a los 4 s.
  useEffect(() => {
    if (fase !== 'libre' || falloAudio) return;
    setPista('visible');
    const sale = window.setTimeout(() => setPista('saliendo'), SEGUNDOS_PISTA * 1000);
    return () => window.clearTimeout(sale);
  }, [fase, falloAudio, reinicios]);

  // Al volver al recorrido guiado (reinicio) no queda nada seleccionado.
  useEffect(() => {
    if (!interactivo) setSeleccionadoId(null);
  }, [interactivo]);

  // El botón de pausa se oculta tras 2 s sin mover el mouse.
  useEffect(() => {
    let t = 0;
    const mover = () => {
      setRatonActivo(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setRatonActivo(false), OCULTAR_PAUSA_MS);
    };
    mover();
    window.addEventListener('mousemove', mover);
    window.addEventListener('pointerdown', mover);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('pointerdown', mover);
    };
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

  // Sonidos y rótulos del recorrido guiado: transición y rótulo de sala al cambiar de ambiente.
  const ambienteGuiado = fase === 'guiado' ? estado.ambienteId : null;
  useEffect(() => {
    if (!ambienteGuiado) return;
    sfx.sonar('transicion');
    const rotulo = rotuloAmbiente(ambienteGuiado);
    if (!rotulo) return;
    setSalaRotulada(rotulo);
    const t = window.setTimeout(() => setSalaRotulada(null), ROTULO_SALA_MS);
    return () => window.clearTimeout(t);
  }, [ambienteGuiado, sfx]);
  useEffect(() => {
    if (fase !== 'guiado') setSalaRotulada(null);
  }, [fase]);

  // Saludo: poco después de que la cámara enfoca a un agente (guiado) o de tocarlo (libre).
  const enfoqueActual = fase === 'guiado' ? estado.enfocadoId : seleccionadoId;
  useEffect(() => {
    if (enfoqueActual) sfx.sonar('saludo', RETRASO_SALUDO_MS);
  }, [enfoqueActual, sfx]);

  const rotuloDelAgente = useMemo(() => {
    if (fase !== 'guiado') return null;
    if (estado.enfocadoId === 'jules') return ROTULO_JULES;
    return estado.enfocadoId ? rotuloAgente(estado.enfocadoId, agentes) : null;
  }, [fase, estado.enfocadoId, estado.ambienteId, agentes]);

  /** En el recorrido, el roster lleva lo que la demo ya cambió (Bruno aprobado, Nico con su orden). */
  const agentesEnPantalla = useMemo(
    () => (fase === 'guiado' ? agentesDemo(agentes, demoEstado) : agentes),
    [fase, agentes, demoEstado],
  );
  agentesVistos.current = agentesEnPantalla;

  // Al pasar a libre la demo queda hecha: lo que cambió se vuelve parte del roster.
  const demoVista = useRef(demoEstado);
  demoVista.current = demoEstado;
  useEffect(() => {
    if (fase === 'libre' && !falloAudio) setAgentes((prev) => agentesDemo(prev, demoVista.current));
  }, [fase, falloAudio]);

  // El envío de la orden de Nico suena igual que una orden dada a mano.
  useEffect(() => {
    if (demoEstado.nico === 'enviado') sfx.sonar('orden');
  }, [demoEstado.nico, sfx]);

  const horaSimulada = useMemo(() => fechaChileA(horaDe(momento)), [momento]);

  const enfocadoDeLaCamara = estado.enfocadoId === 'jules' ? null : estado.enfocadoId;
  const seleccionado = agentes.find((a) => a.id === seleccionadoId);
  const panelDemo = fase === 'guiado' ? demoEstado.panel : null;
  const agenteDemo = panelDemo
    ? agentesEnPantalla.find((a) => a.id === panelDemo.agenteId)
    : undefined;

  const alSeleccionar = (id: string | null) => {
    if (id) prepararAudio();
    setSeleccionadoId(id);
  };

  const alAmbiente = (id: string | null) => {
    if (id) {
      prepararAudio();
      sfx.sonar('transicion');
    }
    setAmbienteLibre(id);
  };

  const actualizar = (id: string, agente: Agente, frase: string) => {
    setAgentes((prev) => prev.map((a) => (a.id === id ? agente : a)));
    setRespuestas((prev) => ({ ...prev, [id]: frase }));
  };

  /**
   * Pide el TEXTO de la respuesta al modelo (fases espera y libre). El estado del agente ya se
   * aplicó en local; si el texto no llega o llega viejo, queda la frase local. Si la respuesta
   * vigente dice que la orden exige aprobación (el cerebro la vio delicada), el agente pasa a
   * esperar tu decisión aunque su rol actúe solo.
   */
  const pedirAlModelo = (agente: Agente, orden: string) => {
    if (fase === 'guiado') return;
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
      { fetch: (u, i) => fetch(u, i), signal: control.signal, fase },
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

  const darOrden = (texto: string) => {
    if (!seleccionado) return;
    const nuevo = ordenar(seleccionado, texto);
    if (nuevo === seleccionado) return;
    prepararAudio();
    sfx.sonar('orden');
    actualizar(seleccionado.id, nuevo, respuestaDe(seleccionado.rol, ordenes.current++));
    pedirAlModelo(seleccionado, texto);
    const clip = elegirClip(clips, ultimoClip.current, Math.random, seleccionado.rol);
    if (clip) {
      ultimoClip.current = clip.archivo;
      cola.current = encolar(cola.current, clip);
      reproducirSiguiente();
    }
  };

  const resolver = (transicion: typeof aprobar) => {
    if (!seleccionado) return;
    invalidarPeticiones();
    const { agente, frase } = transicion(seleccionado);
    actualizar(seleccionado.id, agente, frase);
  };

  const enEspera = fase === 'espera';
  const puedePausar = empezado && !terminado && !falloAudio;
  return (
    <div
      className={`lab presentacion fase-${fase}${grabando ? ' grabando' : ''}`}
      style={
        {
          '--fijo-arriba': `${ROTULO_FIJO.arriba}vh`,
          '--fijo-alto': `${ROTULO_FIJO.alto}vh`,
          '--cta-abajo': `${CTA.abajo}vh`,
          '--cta-abajo-vertical': `${CTA.abajoVertical}vh`,
          '--cta-alto': `${CTA.alto}vh`,
          '--sub-abajo': `${SUBTITULO.abajo}vh`,
        } as CSSProperties
      }
    >
      <div className={interactivo ? 'escena' : 'escena sin-mando'} ref={escena}>
        <Oficina
          agentes={agentesEnPantalla}
          onProyector={(f) => {
            proyector.current = (objetivo) => {
              const p = f(objetivo);
              if (!p) return p;
              const q = conZoom(p, zoom.current, innerWidth, innerHeight);
              return { ...q, visible: p.visible };
            };
          }}
          encuadreLibre
          calidad="alta"
          visible
          horaChile={horaSimulada}
          ambienteId={interactivo ? ambienteLibre : estado.ambienteId}
          retenerEnSala={!interactivo}
          onAmbiente={interactivo ? alAmbiente : undefined}
          enfocadoId={interactivo ? seleccionadoId : enfocadoDeLaCamara}
          enfocaJules={!interactivo && estado.enfocadoId === 'jules'}
          julesDeFrente={!interactivo && estado.julesDeFrente}
          julesPresente={!interactivo && estado.julesPresente}
          corteCamara={estado.cortesSecos}
          seleccionadoId={interactivo ? seleccionadoId : null}
          onSeleccionar={interactivo ? alSeleccionar : undefined}
          vistaGeneral={estado.vistaGeneral + reinicios * 10 + vistaLibre * 1000}
          presenciaJules={pausado || !(empezado || falloAudio) ? 'escuchando' : presencia}
          nivelVozJules={empezado || falloAudio ? (pausado ? 0 : nivel) : undefined}
          derivaCamara={estado.enfocadoId === 'jules' ? DERIVA_JULES : DERIVA}
        />
      </div>
      <audio
        ref={audio}
        src={`${BASE}dueto-recorrido.mp3`}
        preload="auto"
        onEnded={() => {
          setTerminado(true);
          reproducirSiguiente();
        }}
      />
      <audio ref={audioOrden} preload="auto" onEnded={reproducirSiguiente} />
      {estado.subtitulo && !falloAudio && (
        <p
          className={[
            'pres-subtitulo',
            interactivo && 'en-libre',
            estado.vozSubtitulo === 'jules' && 'de-jules',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="off"
        >
          {estado.vozSubtitulo === 'jules' && <b>Jules: </b>}
          {estado.subtitulo}
        </p>
      )}
      {(empezado || falloAudio) && !falloAudio && <RotuloFijo />}
      <RotuloSala texto={salaRotulada} />
      <RotuloDeAgente rotulo={panelDemo ? null : rotuloDelAgente} />
      <button
        type="button"
        className={empezado ? 'pres-empezar oculto' : 'pres-empezar'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={comenzar}
        disabled={!plan && !falloAudio}
        tabIndex={empezado ? -1 : 0}
      >
        Empezar
      </button>
      {enEspera && !grabando && (
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
      )}
      {falloAudio && <p className="pres-aviso">No se pudo cargar el recorrido. La cámara es tuya.</p>}
      {interactivo && (
        <>
          <Leyenda />
          <IndicadorAmbiente
            ambienteId={ambienteLibre}
            onSalir={() => setAmbienteLibre(null)}
            onVistaGeneral={() => {
              setAmbienteLibre(null);
              setSeleccionadoId(null);
              setVistaLibre((v) => v + 1);
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
            />
          )}
        </>
      )}
      {estado.cta && fase === 'libre' && !falloAudio && <p className="pres-cta">{TEXTO_CTA}</p>}
      {panelDemo && agenteDemo && (
        <PanelOrden
          key={agenteDemo.id}
          agente={agenteDemo}
          respuesta={respuestaDemo(demoEstado)}
          textoForzado={panelDemo.texto}
          resaltarAprobar={panelDemo.resaltarAprobar}
          onOrden={() => undefined}
          onAprobar={() => undefined}
          onRechazar={() => undefined}
          onCerrar={() => undefined}
        />
      )}
      {plan && demoRef.current && fase !== 'espera' && (
        <>
          <CursorDemo demo={demoRef.current} tiempo={tiempo} proyector={proyector} />
          <LineasReparto
            desde={plan.marcas['reparte']!}
            hasta={plan.anclas.find((a) => a.ancla === 'revisa todo')!.t}
            tiempo={tiempo}
            proyector={proyector}
          />
          <TarjetasFlotantes
            desde={plan.marcas['tarjetas']!}
            hasta={plan.marcas['tarjetas-fin']!}
            tiempo={tiempo}
            proyector={proyector}
            agentes={agentesVistos}
          />
        </>
      )}
      {toast && (
        <p className="pres-toast" role="status" key={toast}>
          <b>Jules</b>
          {toast}
        </p>
      )}
      {pista !== 'oculta' && !grabando && (
        <p className={pista === 'saliendo' ? 'pres-pista oculto' : 'pres-pista'}>
          Arrastrá para girar · rueda para acercar · tocá una sala
        </p>
      )}
      {pausado && !grabando && <p className="pres-enpausa">En pausa</p>}
      {puedePausar && !grabando && (
        <button
          type="button"
          className={ratonActivo ? 'pres-pausa' : 'pres-pausa oculto'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={alternarPausa}
          aria-label={pausado ? 'Reanudar' : 'Pausar'}
          tabIndex={ratonActivo ? 0 : -1}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">
            {pausado ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
          </svg>
        </button>
      )}
      {avisoGrabacion && (
        <p className="pres-aviso-grabacion" role="status" key={avisoGrabacion}>
          {avisoGrabacion}
        </p>
      )}
      {telon !== 'oculto' && (
        <div className={telon === 'sale' ? 'pres-telon sale' : 'pres-telon'} />
      )}
    </div>
  );
}
