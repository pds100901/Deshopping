import type { Plan } from './recorrido';

/** Cuánto se cierra la toma (fracción) como máximo durante su duración. */
const EMPUJE_MAX = 0.18;
/** Rapidez máxima del empuje (fracción por segundo): en tomas cortas no se nota un salto. */
const RITMO_MAX = 0.025;
/** Segundos que tarda en fundirse el cierre de la toma anterior con la nueva (sin salto). */
const FUNDIDO = 0.9;

const liso = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/**
 * Escala de la toma en el segundo `t` (1 = sin empuje). Ninguna toma queda quieta: desde cada
 * corte la cámara se cierra a ritmo constante hasta el siguiente corte (o `fin`). El plano base
 * de la toma (primer plano de Jules, p. ej.) multiplica el empuje. Función pura de `t`.
 */
export function zoomEn(t: number, plan: Plan): number {
  const planos = plan.eventos.flatMap((e) =>
    e.plano === undefined ? [] : [{ t: e.t, plano: e.plano }],
  );
  const fin = plan.eventos.find((e) => e.libre)?.t ?? Infinity;
  const cortes = [0, ...plan.cortes.filter((c) => c > 0)].filter(
    (c, i, todos) => i === 0 || c - todos[i - 1]! > 0.05,
  );
  let k = 0;
  while (k + 1 < cortes.length && cortes[k + 1]! <= t) k++;
  const toma = (i: number, tt: number, tBase = tt) => {
    const s = cortes[i]!;
    const e = Math.min(cortes[i + 1] ?? fin, fin);
    const base = [...planos].reverse().find((p) => p.t <= tBase)?.plano ?? 1;
    const ritmo = Number.isFinite(e)
      ? Math.min(RITMO_MAX, EMPUJE_MAX / Math.max(0.1, e - s))
      : RITMO_MAX;
    return base * (1 + ritmo * Math.min(tt, e) - ritmo * s);
  };
  /** Escala en `tt` estando en la toma `i`: la toma propia, fundida con lo que traía la anterior. */
  const en = (i: number, tt: number): number => {
    const ahora = toma(i, tt);
    if (i === 0) return ahora;
    const s = cortes[i]!;
    if (plan.secos.some((c) => Math.abs(c - s) < 0.05)) return ahora; // corte seco: el empuje se reinicia
    const antes = en(i - 1, s - 1e-6);
    return antes + (ahora - antes) * liso((tt - s) / FUNDIDO);
  };
  return en(k, t);
}

/** Lleva un punto proyectado sobre el lienzo a su lugar tras escalar el lienzo desde su centro. */
export const conZoom = (p: { x: number; y: number }, z: number, ancho: number, alto: number) => ({
  x: ancho / 2 + (p.x - ancho / 2) * z,
  y: alto / 2 + (p.y - alto / 2) * z,
});
