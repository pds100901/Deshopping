import type { AgenteOficina } from '@jules/oficina';
import { aprobar } from './ordenes';

/** Lo que el cursor puede perseguir: la cabeza de un agente o un botón del panel. */
export type Objetivo =
  { tipo: 'agente'; id: string } | { tipo: 'boton'; nombre: 'aprobar' | 'enviar' };

export interface Segmento {
  /** Empieza a moverse. */
  t0: number;
  /** Llega al objetivo (puede esperar ahí hasta `clic`). */
  t1: number;
  /** De dónde sale (`null` = entra desde fuera de la zona de trabajo). */
  desde: Objetivo | null;
  hasta: Objetivo;
  clic: number;
}

export interface Demo {
  segmentos: Segmento[];
  paneles: { agenteId: string; t0: number; t1: number }[];
  aprobado: number;
  envio: number;
  escribeDesde: number;
  escribeHasta: number;
  valentinaDesde: number;
}

export const ORDEN_NICO = 'Avisales que su pedido ya llegó';
export const RESPUESTA_NICO = 'Hecho. Empiezo ahora mismo.';
export const TAREA_VALENTINA = 'Guion del reel: «Tengo diecinueve ayudantes y ninguno es humano…»';

/**
 * Los nombres internos vienen del guion original: «tomas» es Vicky Vitrina
 * (Catálogo), «bruno» es Clara Clic (Publicación), «valentina» es Gigi Guion (Guiones) y «nico»
 * es Coco Caja (Ventas).
 */
const VIAJE = 0.9;
/** Duración del pulso del clic y cuánto se queda el cursor después de él. */
export const PULSO = 0.4;
const SALE = 0.8;
const ESCRIBE_DESPUES = 0.4;
const ESCRIBE_MAX = 1.5;

const TOMAS = '0:Catálogo';
const BRUNO = '0:Publicación';
const VALENTINA = '2:Guiones';
const NICO = '1:Ventas';

const marca = (m: Record<string, number>, id: string) => {
  const t = m[id];
  if (t === undefined) throw new Error(`Falta la marca «${id}» en el guion`);
  return t;
};

/** Arma la coreografía de la demo a partir de las marcas del guion. */
export function armarDemo(marcas: Record<string, number>): Demo {
  const m = (id: string) => marca(marcas, id);
  const agente = (id: string): Objetivo => ({ tipo: 'agente', id });
  const hacia = (clic: number, id: string): Segmento => ({
    t0: clic - VIAJE,
    t1: clic,
    desde: null,
    hasta: agente(id),
    clic,
  });

  const tomas = hacia(m('tomas-toca') + VIAJE + 0.2, TOMAS);
  const bruno = hacia(m('bruno-panel'), BRUNO);
  const clicAprobar = Math.max(bruno.clic + SALE + VIAJE, m('bruno-aprueba') + 0.3);
  const aprueba: Segmento = {
    t0: bruno.clic + 0.4,
    t1: bruno.clic + 0.4 + VIAJE,
    desde: bruno.hasta,
    hasta: { tipo: 'boton', nombre: 'aprobar' },
    clic: clicAprobar,
  };
  const valentina = hacia(m('valentina-panel'), VALENTINA);
  const nico = hacia(m('nico-pide'), NICO);
  const clicEnviar = m('nico-envia');
  const envia: Segmento = {
    t0: Math.max(nico.clic + 0.4, clicEnviar - VIAJE),
    t1: clicEnviar,
    desde: nico.hasta,
    hasta: { tipo: 'boton', nombre: 'enviar' },
    clic: clicEnviar,
  };

  const escribeDesde = nico.clic + ESCRIBE_DESPUES;
  return {
    segmentos: [tomas, bruno, aprueba, valentina, nico, envia],
    paneles: [
      { agenteId: TOMAS, t0: tomas.clic, t1: m('tomas-fin') },
      { agenteId: BRUNO, t0: bruno.clic, t1: m('bruno-fin') },
      { agenteId: VALENTINA, t0: valentina.clic, t1: m('valentina-fin') },
      { agenteId: NICO, t0: nico.clic, t1: m('nico-fin') },
    ],
    aprobado: clicAprobar,
    envio: clicEnviar,
    escribeDesde,
    escribeHasta: Math.min(
      escribeDesde + ESCRIBE_MAX,
      Math.max(escribeDesde + 0.3, envia.t0 - 0.1),
    ),
    valentinaDesde: valentina.clic,
  };
}

export interface CursorEn {
  segmento: Segmento;
  /** Avance del viaje, 0..1 (queda en 1 esperando el clic). */
  p: number;
  /** Pulso del clic, 0..1 (`null` si aún no o ya pasó). */
  pulso: number | null;
  /** Opacidad: entra y sale con suavidad. */
  opacidad: number;
}

export interface EstadoDemo {
  cursor: CursorEn | null;
  panel: { agenteId: string; texto: string; resaltarAprobar: boolean } | null;
  bruno: 'espera' | 'aprobado';
  nico: 'pendiente' | 'enviado';
  valentinaEscribiendoGuion: boolean;
}

const acota = (x: number) => Math.min(1, Math.max(0, x));

/** Qué se ve de la demo en el segundo `t` de la pista. Función pura del tiempo. */
export function demoEn(t: number, demo: Demo): EstadoDemo {
  let cursor: CursorEn | null = null;
  for (const s of demo.segmentos) {
    const fin = s.clic + SALE;
    if (t < s.t0 || t > fin) continue;
    const pulso = t >= s.clic && t <= s.clic + PULSO ? (t - s.clic) / PULSO : null;
    const entra = acota((t - s.t0) / 0.25);
    const sale = acota((fin - t) / 0.25);
    cursor = {
      segmento: s,
      p: acota((t - s.t0) / (s.t1 - s.t0)),
      pulso,
      opacidad: s.desde ? sale : Math.min(entra, sale),
    };
  }
  const abierto = demo.paneles.find((p) => t >= p.t0 && t < p.t1);
  const aprobado = t >= demo.aprobado;
  const enviado = t >= demo.envio;
  let texto = '';
  if (abierto?.agenteId === NICO && !enviado) {
    const n = acota((t - demo.escribeDesde) / (demo.escribeHasta - demo.escribeDesde));
    texto = ORDEN_NICO.slice(0, Math.floor(n * ORDEN_NICO.length));
  }
  return {
    cursor,
    panel: abierto
      ? {
          agenteId: abierto.agenteId,
          texto,
          resaltarAprobar: abierto.agenteId === BRUNO && !aprobado,
        }
      : null,
    bruno: aprobado ? 'aprobado' : 'espera',
    nico: enviado ? 'enviado' : 'pendiente',
    valentinaEscribiendoGuion: t >= demo.valentinaDesde,
  };
}

/** Lo que dice el agente en el panel tras la acción de la demo (`undefined` = nada). */
export function respuestaDemo(estado: EstadoDemo): string | undefined {
  if (!estado.panel) return undefined;
  if (estado.panel.agenteId === BRUNO && estado.bruno === 'aprobado') return ALIVIO_BRUNO;
  if (estado.panel.agenteId === NICO && estado.nico === 'enviado')
    return RESPUESTA_NICO;
  return undefined;
}

const ALIVIO_BRUNO = aprobar({
  id: '',
  nombre: '',
  rol: 'Publicación',
  departamento: '',
  estado: 'esperando_decision',
  tarea: '',
}).frase;

/** Aplica al roster base lo que la demo ya cambió (Bruno aprobado, Nico con su orden, el guion de Valentina). */
export function agentesDemo(base: AgenteOficina[], estado: EstadoDemo): AgenteOficina[] {
  return base.map((a) => {
    if (a.id === BRUNO && estado.bruno === 'aprobado') return aprobar(a).agente;
    if (a.id === NICO && estado.nico === 'enviado')
      return { ...a, estado: 'trabajando', actividad: 'escribiendo', tarea: ORDEN_NICO };
    if (a.id === VALENTINA && estado.valentinaEscribiendoGuion)
      return { ...a, tarea: TAREA_VALENTINA };
    return a;
  });
}
