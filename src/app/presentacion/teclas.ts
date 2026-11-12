import { MOMENTOS } from './momento';
import type { Momento } from './momento';

export type AccionTecla = { tipo: 'cerrar' } | { tipo: 'momento'; momento: Momento };

interface Tecla {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * Qué hace cada tecla de la oficina; `null` = no es suya. `escribiendo` = el foco está en un
 * campo de texto. Función pura.
 */
export function accionDeTecla(e: Tecla, escribiendo: boolean): AccionTecla | null {
  if (e.key === 'Escape') return { tipo: 'cerrar' };
  if (e.ctrlKey || e.metaKey || e.altKey || escribiendo) return null;
  const m = MOMENTOS.find((x) => x.tecla === e.key);
  return m ? { tipo: 'momento', momento: m.id } : null;
}
