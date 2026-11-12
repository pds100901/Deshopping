import { resolverUmbrales } from '../umbrales';
import type { Ruta, Transicion, Umbrales } from '../tipos';

const MS_POR_DIA = 86_400_000;
const DIAS_POR_SEMANA = 7;

/**
 * Degradación y retiro (5.3): fuenteCambiada → rota; > fallosMaximos → degradada;
 * caliente sin uso N semanas → receta; sin uso `diasParaArchivar` → archivada.
 * Devuelve la primera transición aplicable, en ese orden de prioridad.
 */
export function evaluarCicloDeVida(
  ruta: Ruta,
  ahora: string,
  umbrales?: Partial<Umbrales>,
): Transicion | null {
  const u = resolverUmbrales(umbrales);
  const { estado } = ruta;
  const viva = estado === 'receta' || estado === 'caliente';
  const transicion = (a: Transicion['a'], motivo: string): Transicion => ({
    de: estado,
    a,
    motivo,
  });

  if (viva && ruta.fuenteCambiada) {
    return transicion(
      'rota',
      'fuente cambiada: esquema, versión de MCP o permiso; se vuelve a explorar',
    );
  }

  const { fallos, usosTotales, ultimoUso } = ruta.metricas;
  if (viva && fallos / Math.max(usosTotales, 1) > u.fallosMaximos) {
    return transicion('degradada', 'más de 10 % de fallos: vuelve a exploración y se re-destila');
  }

  const diasSinUso = (Date.parse(ahora) - Date.parse(ultimoUso ?? ruta.creadaEn)) / MS_POR_DIA;

  if (estado === 'caliente') {
    const sinUsoReciente =
      ultimoUso === undefined || diasSinUso > u.semanasSinUsoParaEnfriar * DIAS_POR_SEMANA;
    if (sinUsoReciente) {
      return transicion('receta', 'sin uso en 4 semanas: se deja de mantener viva');
    }
  }

  if ((viva || estado === 'degradada') && diasSinUso > u.diasParaArchivar) {
    return transicion('archivada', '90 días sin uso: archivada, reactivable con su historial');
  }

  return null;
}
