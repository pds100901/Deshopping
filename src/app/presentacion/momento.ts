import { almacenLocal } from '../persistencia';
import type { Almacen } from '../persistencia';

export type Momento = 'atardecer' | 'noche' | 'dia';

export interface InfoMomento {
  id: Momento;
  nombre: string;
  /** Tecla que lo elige en la fase de espera. */
  tecla: string;
  /** Hora de America/Santiago (0–24, decimal) que se pasa a `horaChile` de `<Oficina>`. */
  hora: number;
}

export const MOMENTOS: InfoMomento[] = [
  { id: 'atardecer', nombre: 'Atardecer', tecla: '1', hora: 19.3 },
  { id: 'noche', nombre: 'Noche', tecla: '2', hora: 22 },
  { id: 'dia', nombre: 'Día', tecla: '3', hora: 12 },
];

export const MOMENTO_INICIAL: Momento = 'dia';

export const CLAVE_MOMENTO = 'oficina-jules-presentacion-momento';

export const horaDe = (id: Momento) => MOMENTOS.find((m) => m.id === id)?.hora ?? 19.3;

/** Lee el momento guardado; sin almacenamiento o con un valor desconocido, atardecer. */
export function cargarMomento(
  almacen: Pick<Almacen, 'getItem'> | undefined = almacenLocal(),
): Momento {
  try {
    const id = almacen?.getItem(CLAVE_MOMENTO);
    return MOMENTOS.find((m) => m.id === id)?.id ?? MOMENTO_INICIAL;
  } catch {
    return MOMENTO_INICIAL;
  }
}

/** Guarda el momento elegido; si no hay almacenamiento (modo privado) queda solo en la sesión. */
export function guardarMomento(
  id: Momento,
  almacen: Pick<Almacen, 'setItem'> | undefined = almacenLocal(),
): void {
  try {
    almacen?.setItem(CLAVE_MOMENTO, id);
  } catch {
    // Sin almacenamiento (modo privado o cuota llena): el momento queda solo en esta sesión.
  }
}
