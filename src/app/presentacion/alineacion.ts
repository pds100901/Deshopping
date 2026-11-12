/** Alineación por carácter con el formato `with-timestamps` de ElevenLabs. */
export interface Alineacion {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Una palabra dicha: texto con su puntuación, segundos de inicio y fin, y línea del guion. */
export interface Palabra {
  texto: string;
  t0: number;
  t1: number;
  linea: number;
}

/** Minúsculas, sin tildes ni signos: la forma en que se comparan las palabras. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Agrupa los caracteres en palabras (separadas por espacios o saltos). Las líneas del guion
 * se separan por una línea en blanco (`\n\n`) en el texto.
 */
export function palabrasDe(al: Alineacion): Palabra[] {
  const palabras: Palabra[] = [];
  let linea = 0;
  let actual: Palabra | null = null;
  let saltos = 0;
  al.characters.forEach((c, i) => {
    const t0 = al.character_start_times_seconds[i] ?? 0;
    const t1 = al.character_end_times_seconds[i] ?? t0;
    if (/\s/.test(c)) {
      if (c === '\n') saltos++;
      actual = null;
      return;
    }
    if (!actual) {
      if (saltos >= 2 && palabras.length > 0) linea++;
      saltos = 0;
      actual = { texto: '', t0, t1, linea };
      palabras.push(actual);
    }
    actual.texto += c;
    actual.t1 = t1;
  });
  return palabras;
}

/**
 * Primera aparición de una frase de 1+ palabras (comparadas con `normalizar`), opcionalmente
 * dentro de una línea. Devuelve su primera palabra, con `t1` al final de la última.
 */
export function buscarFrase(
  palabras: Palabra[],
  frase: string,
  linea?: number,
): Palabra | undefined {
  const buscadas = frase.split(/\s+/).map(normalizar).filter(Boolean);
  if (buscadas.length === 0) return undefined;
  for (let i = 0; i + buscadas.length <= palabras.length; i++) {
    const primera = palabras[i]!;
    if (linea !== undefined && primera.linea !== linea) continue;
    const coincide = buscadas.every((b, k) => {
      const w = palabras[i + k]!;
      return w.linea === primera.linea && normalizar(w.texto) === b;
    });
    if (coincide) return { ...primera, t1: palabras[i + buscadas.length - 1]!.t1 };
  }
  return undefined;
}
