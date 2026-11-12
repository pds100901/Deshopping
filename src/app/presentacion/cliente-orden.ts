import { requiereAprobacion as requiereAprobacionDelRol } from './aprobacion';

/** Cuánto espera la respuesta del modelo antes de volver a la frase local. */
export const TIMEOUT_MS = 17_000;
const MAX_ORDEN = 300;
const FUENTES = new Set(['modelo', 'local']);

export interface ParamsOrden {
  agente: string;
  rol: string;
  tarea?: string;
  orden: string;
}

/** Texto del modelo, o `null` (+ motivo) cuando hay que usar la frase local. */
export interface ResultadoOrden {
  texto: string | null;
  motivo?: string;
  /** Lo que dijo el servidor (rol + cerebro); falta si no hubo una respuesta válida. */
  requiereAprobacion?: boolean;
}

export type FetchFalso = (url: string, init?: RequestInit) => Promise<Response>;

interface Deps {
  fetch: FetchFalso;
  signal: AbortSignal;
}

const local = (motivo: string): ResultadoOrden => ({ texto: null, motivo });

/**
 * Pide al servidor local la respuesta del agente. Cualquier fallo (404, HTML, JSON raro,
 * red, 17 s, fuente local) devuelve `texto: null`: el llamador usa su frase local.
 * Nunca lanza: el estado del agente no depende de esto.
 */
export async function pedirRespuesta(
  params: ParamsOrden,
  { fetch, signal }: Deps,
): Promise<ResultadoOrden> {
  if (signal.aborted) return local('cancelado');

  const interno = new AbortController();
  let vencio = false;
  const alCancelar = () => interno.abort();
  signal.addEventListener('abort', alCancelar, { once: true });
  const reloj = setTimeout(() => {
    vencio = true;
    interno.abort();
  }, TIMEOUT_MS);

  try {
    const res = await fetch('/api/orden', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...params, orden: params.orden.slice(0, MAX_ORDEN) }),
      signal: interno.signal,
    });
    if (!res.ok) return local('error_http');
    return leer(await res.json());
  } catch {
    if (vencio) return local('timeout');
    return local(signal.aborted ? 'cancelado' : 'sin_servidor');
  } finally {
    clearTimeout(reloj);
    signal.removeEventListener('abort', alCancelar);
  }
}

/** Valida el cuerpo del contrato; cualquier forma inesperada cae a local. */
function leer(cuerpo: unknown): ResultadoOrden {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    return local('malformada');
  }
  const { respuesta, requiereAprobacion, fuente, motivo } = cuerpo as Record<string, unknown>;
  if (typeof fuente !== 'string' || !FUENTES.has(fuente)) return local('malformada');
  if (typeof requiereAprobacion !== 'boolean') return local('malformada');
  if (respuesta !== null && typeof respuesta !== 'string') return local('malformada');
  if (fuente === 'local') {
    return { ...local(typeof motivo === 'string' ? motivo : 'error_api'), requiereAprobacion };
  }
  if (typeof respuesta !== 'string' || !respuesta.trim()) return local('malformada');
  return { texto: respuesta, requiereAprobacion };
}

/** Identifica una petición: secuencia por agente y época global (Aprobar, Rechazar). */
export interface Token {
  secuencia: number;
  epoca: number;
}

/** Una respuesta que llega con secuencia o época distinta de la actual se descarta. */
export const esVigente = (pedida: Token, actual: Token): boolean =>
  pedida.secuencia === actual.secuencia && pedida.epoca === actual.epoca;

/** Qué hacer con una respuesta que llegó: texto, motivo y si hay que pasar a esperar decisión. */
export interface Desenlace {
  texto: string | null;
  motivo?: string;
  /** El servidor exige aprobación a un rol que en local actuó solo. */
  escalar: boolean;
}

/**
 * Aplica la guarda de secuencia y época (`null` = respuesta vieja, se descarta) y decide si el
 * agente pasa a esperar decisión. El servidor solo vuelve más estricta la regla local del rol:
 * un `false` o la falta de dato nunca sacan a nadie de la espera.
 */
export function desenlace(
  pedida: Token,
  actual: Token,
  rol: string,
  { texto, motivo, requiereAprobacion }: ResultadoOrden,
): Desenlace | null {
  if (!esVigente(pedida, actual)) return null;
  return {
    texto,
    ...(motivo === undefined ? {} : { motivo }),
    escalar: requiereAprobacion === true && !requiereAprobacionDelRol(rol),
  };
}

/** Línea discreta del panel cuando se cae al modo local. */
export const avisoModoLocal = (motivo?: string): string =>
  motivo === 'sin_clave'
    ? 'Modo local: agregá tu clave en .env para respuestas reales'
    : motivo === 'inyeccion'
      ? 'Modo local: la orden trae instrucciones escondidas y no la paso al modelo'
      : 'Modo local: no pude hablar con el modelo';
