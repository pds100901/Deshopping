import type { Azar } from './azar';

/** Azar determinista (mulberry32) para tests reproducibles. */
export function azarSemilla(semilla: number): Azar {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Azar que devuelve los valores dados en orden y se repite al agotarlos. */
export function azarSecuencia(...valores: number[]): Azar {
  let i = 0;
  return () => valores[i++ % valores.length] ?? 0;
}
