import { detectarInyeccion } from '../cerebro';
import { instruccionesDeEntrega, mensajeDeEncargo } from '../src/app/trabajo/encargo';
import type { Encargo } from '../src/app/trabajo/encargo';
import { MODELO_POR_DEFECTO, URL_ANTHROPIC, VERSION_API, textoDe } from './orden';
import type { DepsOrden } from './orden';

/**
 * `POST /api/trabajo`: el agente hace el trabajo de la orden y devuelve la entrega completa
 * (no la frase corta de `/api/orden`). Mismas defensas: solo desde este equipo, tope de uso,
 * la clave nunca sale del servidor y una orden con instrucciones escondidas no llega al modelo.
 */
const MAX_TOKENS = 1200;
const TIMEOUT_MS = 45_000;
const MAX_CAMPO = 80;
const MAX_ORDEN = 300;
const MAX_NOTA = 400;
const MAX_PREVIO = 6000;

export type MotivoSinTrabajo =
  'sin_clave' | 'timeout' | 'error_api' | 'malformada' | 'limite' | 'inyeccion';

export interface RespuestaTrabajo {
  texto: string | null;
  motivo?: MotivoSinTrabajo;
}

const esTexto = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

function validar(entrada: unknown): Encargo | null {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) return null;
  const { nombre, rol, orden, nota, previo } = entrada as Record<string, unknown>;
  if (!esTexto(nombre, MAX_CAMPO) || !esTexto(rol, MAX_CAMPO) || !esTexto(orden, MAX_ORDEN)) {
    return null;
  }
  if (nota === undefined && previo === undefined) return { nombre, rol, orden };
  if (!esTexto(nota, MAX_NOTA) || !esTexto(previo, MAX_PREVIO)) return null;
  return { nombre, rol, orden, nota, previo };
}

const enUnaLinea = (texto: string) => texto.replace(/\s+/g, ' ').trim();

export async function responderTrabajo(
  entrada: unknown,
  deps: DepsOrden,
): Promise<{ status: number; cuerpo: RespuestaTrabajo | { error: string } }> {
  const crudo = validar(entrada);
  if (!crudo) return { status: 400, cuerpo: { error: 'encargo inválido' } };
  // Nombre y rol van dentro de las instrucciones: una línea, sin saltos.
  const encargo: Encargo = { ...crudo, nombre: enUnaLinea(crudo.nombre), rol: enUnaLinea(crudo.rol) };
  const sin = (motivo: MotivoSinTrabajo) => ({ status: 200, cuerpo: { texto: null, motivo } });

  if (detectarInyeccion(`${encargo.orden}\n${encargo.nota ?? ''}`).length > 0) return sin('inyeccion');
  const clave = deps.env.ANTHROPIC_API_KEY?.trim();
  if (!clave) return sin('sin_clave');
  if (!deps.limitador.permitir((deps.ahora ?? Date.now)())) return sin('limite');

  let res: Response;
  try {
    res = await deps.fetch(URL_ANTHROPIC, {
      method: 'POST',
      headers: {
        'x-api-key': clave,
        'anthropic-version': VERSION_API,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: deps.env.ANTHROPIC_MODEL?.trim() || MODELO_POR_DEFECTO,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'disabled' },
        system: instruccionesDeEntrega(encargo),
        messages: [{ role: 'user', content: mensajeDeEncargo(encargo) }],
      }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS),
    });
  } catch (error) {
    const nombre = error instanceof Error ? error.name : 'desconocido';
    if (nombre === 'TimeoutError') return sin('timeout');
    console.warn(`[trabajo] sin respuesta de la API (${nombre})`);
    return sin('error_api');
  }
  if (!res.ok) {
    console.warn(`[trabajo] la API respondió ${res.status}`);
    return sin('error_api');
  }
  let cuerpo: unknown;
  try {
    cuerpo = await res.json();
  } catch {
    return sin('malformada');
  }
  const texto = textoDe(cuerpo);
  if (!texto || texto.includes(clave)) return sin('malformada');
  return { status: 200, cuerpo: { texto } };
}
