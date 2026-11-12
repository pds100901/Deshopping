/**
 * Dónde va cada cosa fija de la pantalla (en % del alto del visor). Es la fuente única: el CSS
 * lee estos números como variables y `disposicion.test.ts` comprueba que nada se pise.
 */
export const ROTULO_FIJO = { arriba: 3, alto: 15 } as const;
/** El CTA se apoya sobre los subtítulos: su borde inferior está a `abajo` % del borde de abajo. */
export const CTA = { abajo: 19, abajoVertical: 30, alto: 8 } as const;
/** Relleno de la placa del subtítulo, en múltiplos de la fuente. */
export const PLACA = { vertical: 0.4, horizontal: 0.55 } as const;
export const SUBTITULO = {
  abajo: 7,
  fuente: 4,
  interlinea: 1.2,
  anchoGuiado: 0.8,
  anchoLibre: 0.44,
  anchoLibreVertical: 0.8,
} as const;

export interface Visor {
  ancho: number;
  alto: number;
}

/** Tramo vertical [arriba, abajo] en píxeles, medido desde el borde superior. */
export type Tramo = [number, number];

export const tramoRotuloFijo = (v: Visor): Tramo => [
  (ROTULO_FIJO.arriba / 100) * v.alto,
  ((ROTULO_FIJO.arriba + ROTULO_FIJO.alto) / 100) * v.alto,
];

export const tramoCta = (v: Visor): Tramo => {
  const base = v.ancho > v.alto ? CTA.abajo : CTA.abajoVertical;
  const abajo = v.alto - (base / 100) * v.alto;
  return [abajo - (CTA.alto / 100) * v.alto, abajo];
};

/** Alto estimado del subtítulo (~0,55 de la fuente por carácter) para un texto y un visor. */
export function tramoSubtitulo(texto: string, v: Visor, enLibre: boolean): Tramo {
  const fuente = Math.min(56, Math.max(26, (SUBTITULO.fuente / 100) * v.alto));
  const anchoLibre = v.ancho > v.alto ? SUBTITULO.anchoLibre : SUBTITULO.anchoLibreVertical;
  const ancho = (enLibre ? anchoLibre : SUBTITULO.anchoGuiado) * v.ancho;
  const porLinea = Math.max(
    1,
    Math.floor((ancho - 2 * PLACA.horizontal * fuente) / (fuente * 0.55)),
  );
  const lineas = Math.ceil(texto.length / porLinea);
  const abajo = v.alto - (SUBTITULO.abajo / 100) * v.alto;
  return [abajo - lineas * fuente * SUBTITULO.interlinea - PLACA.vertical * fuente, abajo];
}

export const seSolapan = (a: Tramo, b: Tramo) => a[0] < b[1] && b[0] < a[1];
