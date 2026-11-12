import type { Contexto } from '../tipos';
import type { ConsultaDeMemoria, Hecho, Memoria, Preferencia, RespuestaDeMemoria } from './tipos';

const MAXIMO_POR_DEFECTO = 10;
const MAXIMO_EN_PROMPT = 8;
const LARGO_MINIMO_DE_TOKEN = 4;
const PUNTOS_POR_TEMA = 2;

const SIN_HECHOS =
  'Memoria: no tienes hechos confirmados sobre esto. Si te preguntan, di «no lo sé» y ofrece averiguarlo.';
const CIERRE =
  'Si te preguntan algo que no está aquí, di «no lo sé» y ofrece averiguarlo. Nunca inventes un dato.';

/** Minúsculas y sin tildes, para comparar sin que importe cómo se escribió. */
const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const tokensDe = (texto: string): string[] => [
  ...new Set(
    normalizar(texto)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= LARGO_MINIMO_DE_TOKEN),
  ),
];

/** Candidatos a mostrar: propuestos y confirmados vigentes (rechazados y caducados quedan fuera). */
function candidatos(memoria: Memoria, ahora: string): Hecho[] {
  return memoria.hechos.filter(
    (h) =>
      h.estado === 'propuesto' ||
      (h.estado === 'confirmado' &&
        (h.caducaEn === undefined || Date.parse(h.caducaEn) >= Date.parse(ahora))),
  );
}

const masReciente = (a: Hecho, b: Hecho): number =>
  Date.parse(b.actualizadoEn) - Date.parse(a.actualizadoEn);

/** Hechos por relevancia (temas y tokens del texto), confirmados primero. */
export function hechosRelevantes(
  memoria: Memoria,
  consulta: ConsultaDeMemoria,
  ahora: string,
  maximo: number = MAXIMO_POR_DEFECTO,
): Hecho[] {
  const vivos = candidatos(memoria, ahora);
  const temas = consulta.temas ?? [];
  const tokens = tokensDe(consulta.texto ?? '');
  if (temas.length === 0 && (consulta.texto ?? '').trim() === '') {
    return vivos
      .filter((h) => h.estado === 'confirmado')
      .sort(masReciente)
      .slice(0, maximo);
  }
  return vivos
    .map((hecho) => {
      const enunciado = normalizar(hecho.enunciado);
      const puntaje =
        temas.filter((t) => hecho.temas.includes(t)).length * PUNTOS_POR_TEMA +
        tokens.filter((t) => enunciado.includes(t)).length;
      return { hecho, puntaje };
    })
    .filter(({ puntaje }) => puntaje > 0)
    .sort(
      (a, b) =>
        Number(b.hecho.estado === 'confirmado') - Number(a.hecho.estado === 'confirmado') ||
        b.puntaje - a.puntaje ||
        masReciente(a.hecho, b.hecho),
    )
    .slice(0, maximo)
    .map(({ hecho }) => hecho);
}

/** Sabe (confirmado), sabe sin confirmar (solo propuestos) o «no lo sé» y ofrece averiguarlo. */
export function consultar(
  memoria: Memoria,
  consulta: ConsultaDeMemoria,
  ahora: string,
): RespuestaDeMemoria {
  const relevantes = hechosRelevantes(memoria, consulta, ahora);
  const hechos = relevantes.filter((h) => h.estado === 'confirmado');
  const sinConfirmar = relevantes.filter((h) => h.estado === 'propuesto');
  if (hechos.length > 0) return { tipo: 'sabe', hechos, sinConfirmar };
  if (sinConfirmar.length > 0) return { tipo: 'no_confirmado', sinConfirmar };
  return { tipo: 'no_lo_se', ofrece: 'averiguarlo' };
}

/** Preferencia vigente por clave: primero la del dominio, luego la global. */
export function preferencia(
  memoria: Memoria,
  clave: string,
  dominio?: string,
): Preferencia | undefined {
  const confirmadas = memoria.preferencias.filter(
    (p) => p.estado === 'confirmado' && p.clave === clave,
  );
  return (
    (dominio === undefined ? undefined : confirmadas.find((p) => p.dominio === dominio)) ??
    confirmadas.find((p) => p.dominio === undefined)
  );
}

/** Bloque para el prompt variable: lo confirmado con su fuente, lo propuesto marcado, y la regla de abstención. */
export function seccionDeMemoriaParaPrompt(contexto: Contexto, temas: string[]): string {
  const { memoria } = contexto;
  if (!memoria) return SIN_HECHOS;
  const relevantes = hechosRelevantes(memoria, { temas }, contexto.ahora, MAXIMO_EN_PROMPT);
  const confirmados = relevantes.filter((h) => h.estado === 'confirmado');
  const propuestos = relevantes.filter((h) => h.estado === 'propuesto');
  const preferencias = memoria.preferencias.filter((p) => p.estado === 'confirmado');
  if (relevantes.length === 0 && preferencias.length === 0) return SIN_HECHOS;

  const lineas: string[] = [];
  if (confirmados.length > 0) {
    lineas.push(
      'Lo que sabes de la persona (confirmado); al usar uno, nombra su fuente en la frase:',
    );
    for (const h of confirmados) {
      const fecha = (h.confirmadoEn ?? h.actualizadoEn).slice(0, 10);
      lineas.push(
        `- ${h.enunciado} (según ${h.procedencia.nota ?? h.procedencia.origen}, ${fecha})`,
      );
    }
  }
  if (propuestos.length > 0) {
    lineas.push('Sin confirmar (no actúes con esto; si lo usas, dilo):');
    for (const h of propuestos) lineas.push(`- ${h.enunciado}`);
  }
  if (preferencias.length > 0) {
    lineas.push('Preferencias:');
    for (const p of preferencias) {
      lineas.push(`- ${p.clave}${p.dominio ? ` en ${p.dominio}` : ''}: ${p.valor}`);
    }
  }
  lineas.push(CIERRE);
  return lineas.join('\n');
}
