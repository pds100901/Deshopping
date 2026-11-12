import type { Umbrales } from './tipos';

/**
 * Valores por defecto, tomados de `bases-del-core.md` 5.3, 5.4, 7.4 y 7.5.
 * Todos son configurables por `Contexto.umbrales`; ninguno se decide dentro del código.
 */
export const UMBRALES_POR_DEFECTO: Umbrales = {
  vozMinima: 0.8,
  faceIdMaxSegundos: 600,
  similitudReceta: 0.92,
  similitudCandidata: 0.8,
  repeticionesParaReceta: 2,
  ventanaDiasParaReceta: 14,
  estabilidadMinima: 0.8,
  usosPorSemanaParaCaliente: 3,
  repeticionesParaVista: 3,
  fallosMaximos: 0.1,
  semanasSinUsoParaEnfriar: 4,
  diasParaArchivar: 90,
  horasParaActivarSola: 24,
  multiploDeTtlParaFrescura: 2,
  accionesCriticasPorHoraMax: 5,
  aprobacionExpiraSegundos: 120,
  resumenCuarentenaMax: 280,
  itemsMaxBoletin: 7,
  maxFrasesPorVoz: 2,
};

export function resolverUmbrales(parciales?: Partial<Umbrales>): Umbrales {
  return { ...UMBRALES_POR_DEFECTO, ...parciales };
}
