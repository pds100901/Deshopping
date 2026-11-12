import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Connect, type Plugin } from 'vite';
import { crearLimitador, responderOrden, type EntornoOrden, type Limitador } from './orden';

/**
 * Plugin de Vite que monta `POST /api/orden` en `vite` (desarrollo) y `vite preview`.
 * La clave vive solo en este proceso: se lee del `.env` del lab y nunca llega al navegador.
 * La defensa supone que el servidor escucha en 127.0.0.1 (vite.config.ts) y además
 * rechaza todo lo que no venga de este mismo equipo y de esta misma página.
 */

export const RUTA_ORDEN = '/api/orden';
const MAX_CUERPO = 4 * 1024;
const IPS_LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Solo las tres variables del servidor; nada con prefijo VITE_ ni el resto del entorno. */
export function entornoDesde(variables: Record<string, string | undefined>): EntornoOrden {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, TU_NOMBRE } = variables;
  return { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, TU_NOMBRE };
}

export interface DepsManejador {
  entorno: () => EntornoOrden;
  fetch: typeof fetch;
  limitador: Limitador;
  ahora?: () => number;
}

function responder(res: ServerResponse, status: number, cuerpo: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(cuerpo));
}

const hostDe = (valor: string): string | null => {
  try {
    return new URL(`http://${valor}`).host;
  } catch {
    return null;
  }
};

/**
 * Solo este equipo y esta página: IP loopback, sin proxy delante, Host local
 * (frena DNS rebinding) y, si el navegador manda Origin, que sea el mismo Host.
 */
function esLocal(req: IncomingMessage): boolean {
  if (!IPS_LOOPBACK.has(req.socket.remoteAddress ?? '')) return false;
  if (req.headers['x-forwarded-for'] !== undefined) return false;
  const host = hostDe(req.headers.host ?? '');
  if (!host || !HOSTS_LOCALES.has(new URL(`http://${host}`).hostname)) return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const esJson = (tipo: string | undefined) =>
  (tipo ?? '').split(';')[0].trim().toLowerCase() === 'application/json';

/** Lee el cuerpo con tope; `null` si pasa de `MAX_CUERPO`. */
async function leerCuerpo(req: IncomingMessage): Promise<string | null> {
  const partes: Buffer[] = [];
  let total = 0;
  for await (const parte of req) {
    const buffer = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
    total += buffer.length;
    if (total > MAX_CUERPO) return null;
    partes.push(buffer);
  }
  return Buffer.concat(partes).toString('utf8');
}

/** Manejador de `POST /api/orden`, separado del plugin para probarlo sin Vite. */
export function crearManejadorOrden(deps: DepsManejador) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      if (!esLocal(req)) return responder(res, 403, { error: 'solo desde este equipo' });
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST');
        return responder(res, 405, { error: 'solo POST' });
      }
      if (!esJson(req.headers['content-type'])) {
        return responder(res, 415, { error: 'se espera application/json' });
      }
      if (Number(req.headers['content-length'] ?? 0) > MAX_CUERPO) {
        return responder(res, 413, { error: 'cuerpo demasiado grande' });
      }
      const texto = await leerCuerpo(req);
      if (texto === null) return responder(res, 413, { error: 'cuerpo demasiado grande' });

      let entrada: unknown;
      try {
        entrada = JSON.parse(texto);
      } catch {
        return responder(res, 400, { error: 'JSON inválido' });
      }
      const { status, cuerpo } = await responderOrden(entrada, {
        env: deps.entorno(),
        fetch: deps.fetch,
        limitador: deps.limitador,
        ahora: deps.ahora,
      });
      return responder(res, status, cuerpo);
    } catch (error) {
      // Solo el nombre: nunca headers, cuerpo ni entorno en la consola.
      console.warn(
        `[orden] fallo interno (${error instanceof Error ? error.name : 'desconocido'})`,
      );
      return responder(res, 500, { error: 'fallo interno' });
    }
  };
}

interface ConMiddlewares {
  middlewares: Connect.Server;
}

export function pluginOrden(): Plugin {
  let entorno: EntornoOrden = {};
  const atender = crearManejadorOrden({
    entorno: () => entorno,
    fetch: (...args) => globalThis.fetch(...args),
    limitador: crearLimitador(),
  });
  const montar = ({ middlewares }: ConMiddlewares) => {
    middlewares.use(RUTA_ORDEN, (req, res) => void atender(req, res));
  };
  return {
    name: 'jules-orden',
    configResolved(config) {
      entorno = entornoDesde(loadEnv(config.mode, config.root, ''));
    },
    configureServer: montar,
    configurePreviewServer: montar,
  };
}
