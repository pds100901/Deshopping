import type { MetricasRender } from '@jules/oficina';

export type NivelP95 = 'bueno' | 'justo' | 'malo' | 'sin-dato';

/** Verde hasta 17 ms (60 fps), ámbar hasta 24 ms, rojo más allá. */
export function nivelP95(p95: number | undefined): NivelP95 {
  if (p95 === undefined) return 'sin-dato';
  if (p95 <= 17) return 'bueno';
  if (p95 <= 24) return 'justo';
  return 'malo';
}

export interface ContextoMedicion {
  cantidad: number;
  calidad: string;
  visible: boolean;
  /** Hora simulada (0–24) o `null` si se usa la hora real de Chile. */
  hora: number | null;
  entorno: { agente: string; ancho: number; alto: number; dpr: number };
  ahora: Date;
}

/** JSON legible que Elkis pega al reportar una medición (de un iPhone, por ejemplo). */
export function medicionJson(metricas: MetricasRender, contexto: ContextoMedicion): string {
  return JSON.stringify(
    {
      fecha: contexto.ahora.toISOString(),
      cantidad: contexto.cantidad,
      calidad: contexto.calidad,
      visible: contexto.visible,
      hora: contexto.hora ?? 'real',
      webgl: metricas.webgl,
      fps: metricas.fps ?? null,
      p50: metricas.p50 ?? null,
      p95: metricas.p95 ?? null,
      drawCalls: metricas.drawCalls ?? null,
      triangulos: metricas.triangulos ?? null,
      agentes: metricas.agentes ?? null,
      pantalla: `${contexto.entorno.ancho}x${contexto.entorno.alto}@${contexto.entorno.dpr}`,
      navegador: contexto.entorno.agente,
    },
    null,
    2,
  );
}

/**
 * Copia al portapapeles. `navigator.clipboard` no existe en `http://` por red local (el caso del
 * iPhone), así que cae a `execCommand`. Devuelve `false` si ninguno funcionó.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}
