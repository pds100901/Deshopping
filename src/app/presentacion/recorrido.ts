import { buscarFrase, normalizar } from './alineacion';
import type { Palabra } from './alineacion';
import type { Paso } from './guion';

export type Fase = 'espera' | 'guiado' | 'libre';
/** Quién habla en el dúo. */
export type Voz = 'pau' | 'jules';

export interface Estado {
  fase: Fase;
  /** Ambiente en el que está la cámara (`null` = casa completa). En `libre` lo lleva el usuario. */
  ambienteId: string | null;
  enfocadoId: string | null;
  /** Contador para `vistaGeneral` de `<Oficina>`: sube cada vez que se pide volver al encuadre inicial. */
  vistaGeneral: number;
  subtitulo: string;
  /** De quién es el subtítulo en pantalla. */
  vozSubtitulo: Voz;
  /** Quién habla ahora mismo (`null` en los silencios entre líneas). */
  voz: Voz | null;
  /** Ya se muestra el llamado a la acción (con la última línea de Jules). */
  cta: boolean;
  /** Plano base de la toma (1 = medio; más cerrado = primer plano). */
  plano: number;
  /** Jules mira directo a cámara. */
  julesDeFrente: boolean;
  /** Cuántos cortes secos de cámara van hasta ahora (la cámara salta cuando sube). */
  cortesSecos: number;
  /** Jules está de pie en su sitio, nunca como orbe (de «Ella es Jules» al final de «Hola…»). */
  julesPresente: boolean;
}

export interface Evento {
  t: number;
  ambienteId?: string | null;
  enfocadoId?: string | null;
  vistaGeneral?: true;
  libre?: true;
  plano?: number;
  /** La cámara llega de golpe (sin viaje). */
  corte?: true;
}

interface Bloque {
  t0: number;
  t1: number;
  texto: string;
  voz: Voz;
}

/** Una línea del guion con su voz y sus tiempos. */
export interface Linea {
  texto: string;
  voz: Voz;
  t0: number;
  t1: number;
}

export interface Plan {
  /** Cambios de cámara, ordenados por tiempo. */
  eventos: Evento[];
  bloques: Bloque[];
  /** Segundo en que se dice cada ancla del guion (para revisar tiempos). */
  anclas: { ancla: string; t: number }[];
  /** Instantes anotados por el guion para la demo (`{ marca: 'x' }`). */
  marcas: Record<string, number>;
  lineas: Linea[];
  /** Instantes en que la cámara cambia de toma (sala, enfoque o vista general), ordenados. */
  cortes: number[];
  /** De los cortes, los que son secos: la cámara llega de golpe y el empuje se reinicia sin fundido. */
  secos: number[];
}

/** Segundos antes del siguiente nombre en que se suelta el enfoque para que la cámara respire. */
const SUELTA_ANTES = 0.4;
/** Si entre dos enfoques del mismo ambiente hay menos que esto, se encadenan sin soltar. */
const HOLGURA_MINIMA = 0.8;
const PALABRAS_MAX = 7;
/** Una coma solo corta el subtítulo si ya lleva al menos esto. */
const PALABRAS_MIN_CORTE = 3;
/** Cuánto se queda un subtítulo después de su última palabra. */
const COLA_SUBTITULO = 0.4;
/** Cuánto sigue "hablando" una voz tras su última palabra (la boca no se corta en seco). */
const COLA_VOZ = 0.25;

/** Quita al mostrar lo que no puede quedar colgando al final de un subtítulo. */
const sinColgante = (texto: string) => texto.replace(/[,;:]+$/, '');

function armarBloques(palabras: Palabra[], vozDe: (linea: number) => Voz): Bloque[] {
  const bloques: Bloque[] = [];
  let acumuladas: Palabra[] = [];
  const cerrar = () => {
    if (acumuladas.length === 0) return;
    bloques.push({
      t0: acumuladas[0]!.t0,
      t1: acumuladas[acumuladas.length - 1]!.t1,
      texto: sinColgante(acumuladas.map((p) => p.texto).join(' ')),
      voz: vozDe(acumuladas[0]!.linea),
    });
    acumuladas = [];
  };
  palabras.forEach((p, i) => {
    acumuladas.push(p);
    const fuerte = /[.?!…]$/.test(p.texto);
    const suave = /[,;:]$/.test(p.texto) && acumuladas.length >= PALABRAS_MIN_CORTE;
    const finDeLinea = palabras[i + 1]?.linea !== p.linea;
    if (fuerte || suave || finDeLinea || acumuladas.length >= PALABRAS_MAX) cerrar();
  });
  return bloques;
}

/** Convierte el guion y las palabras con tiempos en la línea de tiempo de la cámara y la demo. */
export function armarPlan(palabras: Palabra[], guion: Paso[], voces: Voz[] = []): Plan {
  const vozDe = (linea: number): Voz => voces[linea] ?? 'pau';
  const porLinea = new Map<number, Palabra[]>();
  for (const p of palabras) porLinea.set(p.linea, [...(porLinea.get(p.linea) ?? []), p]);
  const lineas: Linea[] = [...porLinea.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, ps]) => ({
      texto: ps.map((p) => p.texto).join(' '),
      voz: vozDe(n),
      t0: ps[0]!.t0,
      t1: ps[ps.length - 1]!.t1,
    }));
  const indiceDe = (fragmento: string) => {
    const buscado = normalizar(fragmento);
    const i = lineas.findIndex((l) => normalizar(l.texto).includes(buscado));
    if (i < 0) throw new Error(`Línea sin voz: «${fragmento}»`);
    return i;
  };

  const crudos: { t: number; orden: number; paso: Paso }[] = [];
  const anclas: Plan['anclas'] = [];
  const marcas: Plan['marcas'] = {};
  guion.forEach((paso, orden) => {
    const n = indiceDe(paso.linea);
    let t: number | undefined;
    if (paso.ancla === null) {
      const fin = 'marca' in paso.accion && paso.accion.fin;
      t = fin ? lineas[n]!.t1 : lineas[n]!.t0;
    } else {
      t = buscarFrase(palabras, paso.ancla, n)?.t0;
      if (t !== undefined) anclas.push({ ancla: paso.ancla, t });
    }
    if (t === undefined) throw new Error(`Ancla sin voz: «${paso.linea}» «${paso.ancla}»`);
    if ('marca' in paso.accion) marcas[paso.accion.marca] = t;
    crudos.push({ t, orden, paso });
  });
  crudos.sort((a, b) => a.t - b.t || a.orden - b.orden);

  const eventos: Evento[] = [];
  let ambiente: string | null = null;
  let enfocadoDesde: { t: number } | null = null;
  for (const { t, paso } of crudos) {
    const a = paso.accion;
    const seco = paso.corte ? { corte: true as const } : {};
    if ('enfoca' in a) {
      // Entre enfoques de un mismo ambiente: suelta antes del nombre si alcanza el tiempo.
      if (enfocadoDesde && t - enfocadoDesde.t >= HOLGURA_MINIMA) {
        eventos.push({ t: t - SUELTA_ANTES, enfocadoId: null });
      }
      eventos.push({ t, enfocadoId: a.enfoca, ...seco });
      enfocadoDesde = { t };
    } else if ('ambiente' in a) {
      if (a.ambiente !== ambiente) enfocadoDesde = null;
      ambiente = a.ambiente;
      eventos.push({
        t,
        ambienteId: a.ambiente,
        plano: 1,
        ...seco,
        ...(enfocadoDesde ? {} : { enfocadoId: null }),
      });
    } else if ('general' in a) {
      ambiente = null;
      enfocadoDesde = null;
      eventos.push({
        t,
        ambienteId: null,
        enfocadoId: null,
        vistaGeneral: true,
        plano: 1,
        ...seco,
      });
    } else if ('libre' in a) {
      eventos.push({ t, libre: true });
    } else if ('plano' in a) {
      eventos.push({ t, plano: a.plano });
    }
  }
  eventos.sort((a, b) => a.t - b.t);
  const cortes = eventos
    .filter((e) => e.ambienteId !== undefined || e.vistaGeneral || (e.enfocadoId ?? null) !== null)
    .map((e) => e.t);
  const secos = [...new Set(eventos.filter((e) => e.corte).map((e) => e.t))];
  return {
    eventos,
    bloques: armarBloques(palabras, vozDe),
    anclas,
    marcas,
    lineas,
    cortes,
    secos,
  };
}

/**
 * Qué debe verse en el segundo `t` de la voz (`t < 0` = aún no empezó). Función pura: la
 * pantalla solo traduce este estado a props de `<Oficina>`.
 */
export function estadoEn(t: number, plan: Plan): Estado {
  if (t < 0) {
    return {
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
  }
  const estado: Estado = {
    fase: 'guiado',
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
  for (const e of plan.eventos) {
    if (e.t > t) break;
    if (e.ambienteId !== undefined) estado.ambienteId = e.ambienteId;
    if (e.enfocadoId !== undefined) estado.enfocadoId = e.enfocadoId;
    if (e.vistaGeneral) estado.vistaGeneral++;
    if (e.libre) estado.fase = 'libre';
    if (e.plano !== undefined) estado.plano = e.plano;
    if (e.corte) estado.cortesSecos++;
  }
  if (estado.fase === 'libre') {
    // La cámara pasa a ser del usuario: el recorrido ya no manda ambiente ni enfoque.
    estado.ambienteId = null;
    estado.enfocadoId = null;
  }
  let bloque: Bloque | undefined;
  for (const b of plan.bloques) {
    if (b.t0 > t) break;
    bloque = b;
  }
  if (bloque && t <= bloque.t1 + COLA_SUBTITULO) {
    estado.subtitulo = bloque.texto;
    estado.vozSubtitulo = bloque.voz;
  }
  const linea = plan.lineas.find((l) => t >= l.t0 && t <= l.t1 + COLA_VOZ);
  estado.voz = linea?.voz ?? null;
  const miraT = plan.marcas['mira-camara'];
  estado.julesDeFrente = estado.enfocadoId === 'jules' && miraT !== undefined && t >= miraT;
  const finJules = plan.marcas['jules-fin'];
  estado.julesPresente =
    estado.fase === 'guiado' && finJules !== undefined && t <= finJules + COLA_VOZ;
  estado.cta = plan.marcas['cta'] !== undefined && t >= plan.marcas['cta'];
  return estado;
}
