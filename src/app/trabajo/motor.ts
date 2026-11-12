import { detectarInyeccion } from '../../../cerebro/decision/cuarentena';
import { instruccionesDeEntrega, mensajeDeEncargo } from './encargo';
import type { Encargo } from './encargo';

/** Por qué no hubo entrega. */
export type MotivoSinEntrega =
  | 'inyeccion'
  | 'sin_modelo'
  | 'sin_permiso'
  | 'limite'
  | 'cancelada'
  | 'fallo';

export type Resultado = { texto: string } | { motivo: MotivoSinEntrega };

interface RespuestaSample {
  text: string;
  truncated?: boolean;
}
type Sample = (
  entrada: string,
  opciones?: {
    onText?: (parcial: { text: string }) => void;
    signal?: AbortSignal;
    cache?: boolean;
    modelTier?: 'quick' | 'default' | 'complex';
  },
) => Promise<RespuestaSample>;

interface ClaudeEnPagina {
  use(nombre: string): Promise<unknown>;
}

const claudeEnPagina = (): ClaudeEnPagina | undefined =>
  (window as unknown as { claude?: ClaudeEnPagina }).claude;

/** `sample` de claude.ai cuando la oficina corre como artefacto; `null` en cualquier otro lado. */
async function sampleDelArtefacto(): Promise<Sample | null> {
  const claude = claudeEnPagina();
  if (!claude) return null;
  try {
    const sample = await claude.use('sample');
    return typeof sample === 'function' ? (sample as Sample) : null;
  } catch {
    return null;
  }
}

const MOTIVO_POR_CODIGO: Record<string, MotivoSinEntrega> = {
  not_granted: 'sin_permiso',
  rate_limited: 'limite',
};

async function conSample(
  sample: Sample,
  encargo: Encargo,
  onTexto: ((texto: string) => void) | undefined,
  signal: AbortSignal,
): Promise<Resultado> {
  try {
    const { text } = await sample(
      `${instruccionesDeEntrega(encargo)}\n\n${mensajeDeEncargo(encargo)}`,
      { onText: ({ text: t }) => onTexto?.(t), signal, cache: false },
    );
    return text.trim() ? { texto: text.trim() } : { motivo: 'fallo' };
  } catch (error) {
    if (signal.aborted) return { motivo: 'cancelada' };
    const codigo = (error as { code?: string } | null)?.code ?? '';
    return { motivo: MOTIVO_POR_CODIGO[codigo] ?? 'fallo' };
  }
}

/** Servidor local (`npm run dev` con clave en `.env`). */
async function conServidorLocal(encargo: Encargo, signal: AbortSignal): Promise<Resultado> {
  try {
    const res = await fetch('/api/trabajo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(encargo),
      signal,
    });
    if (!res.ok) return { motivo: 'sin_modelo' };
    const cuerpo = (await res.json()) as { texto?: unknown; motivo?: unknown };
    if (typeof cuerpo.texto === 'string' && cuerpo.texto.trim()) return { texto: cuerpo.texto };
    if (cuerpo.motivo === 'limite' || cuerpo.motivo === 'inyeccion') return { motivo: cuerpo.motivo };
    return { motivo: cuerpo.motivo === 'sin_clave' ? 'sin_modelo' : 'fallo' };
  } catch {
    return { motivo: signal.aborted ? 'cancelada' : 'sin_modelo' };
  }
}

/**
 * Hace el trabajo del agente con un modelo de Claude: en el artefacto usa `sample` de claude.ai
 * (sin clave); en la computadora, el servidor local con tu clave. Nunca lanza.
 */
export async function producir(
  encargo: Encargo,
  signal: AbortSignal,
  onTexto?: (texto: string) => void,
): Promise<Resultado> {
  // Una orden con instrucciones escondidas («ignora las instrucciones…») no llega al modelo.
  const sospechoso = `${encargo.orden}\n${encargo.nota ?? ''}`;
  if (detectarInyeccion(sospechoso).length > 0) return { motivo: 'inyeccion' };
  const sample = await sampleDelArtefacto();
  if (sample) return conSample(sample, encargo, onTexto, signal);
  return conServidorLocal(encargo, signal);
}

export const EXPLICACION: Record<MotivoSinEntrega, string> = {
  inyeccion: 'La orden trae instrucciones raras (como «ignorá las instrucciones») y no la procesé.',
  sin_modelo:
    'No hay un modelo de Claude conectado. Abrí la oficina desde el artefacto de claude.ai o agregá tu clave en .env.',
  sin_permiso: 'Falta tu permiso para que la oficina use Claude. Aceptalo y volvé a intentar.',
  limite: 'Llegaste al límite de uso por ahora. Esperá un rato y volvé a intentar.',
  cancelada: 'Se canceló.',
  fallo: 'Algo falló al generar la entrega. Volvé a intentar.',
};
