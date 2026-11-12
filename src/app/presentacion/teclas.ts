import { MOMENTOS } from './momento';
import type { Momento } from './momento';
import type { Fase } from './recorrido';

export type AccionTecla =
  | { tipo: 'pausa' }
  | { tipo: 'reiniciar' }
  | { tipo: 'grabacion' }
  | { tipo: 'cerrar' }
  | { tipo: 'momento'; momento: Momento };

export interface Contexto {
  /** El foco está en un campo de texto. */
  escribiendo: boolean;
  fase: Fase;
  /** Ya se tocó «Empezar». */
  empezado: boolean;
}

interface Tecla {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** Qué hace cada tecla del modo Presentación; `null` = no es suya. Función pura. */
export function accionDeTecla(e: Tecla, c: Contexto): AccionTecla | null {
  if (e.key === 'Escape') return { tipo: 'cerrar' };
  if (e.ctrlKey || e.metaKey || e.altKey || c.escribiendo) return null;
  if (e.key === ' ') return c.empezado ? { tipo: 'pausa' } : null;
  const k = e.key.toLowerCase();
  if (k === 'r') return { tipo: 'reiniciar' };
  if (k === 'h') return { tipo: 'grabacion' };
  if (c.fase === 'espera' && !c.empezado) {
    const m = MOMENTOS.find((x) => x.tecla === e.key);
    if (m) return { tipo: 'momento', momento: m.id };
  }
  return null;
}
