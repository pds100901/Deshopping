import type { Ruta, Umbrales } from '../tipos';
import { resolverUmbrales } from '../umbrales';

/**
 * Una ruta caliente cumple frescura si `metricas.actualizadoEn` existe y la edad
 * (ahora − actualizadoEn) es ≤ `multiploDeTtlParaFrescura` × el TTL mínimo de sus fuentes.
 * Sin fuentes declaradas → cumple; sin `actualizadoEn` → no cumple (5.5: nunca un dato viejo como actual).
 */
export function frescuraCumplida(ruta: Ruta, ahora: string, umbrales?: Partial<Umbrales>): boolean {
  const fuentes = ruta.receta?.fuentes ?? [];
  if (fuentes.length === 0) return true;
  const { actualizadoEn } = ruta.metricas;
  if (actualizadoEn === undefined) return false;
  const { multiploDeTtlParaFrescura } = resolverUmbrales(umbrales);
  const edadSegundos = (Date.parse(ahora) - Date.parse(actualizadoEn)) / 1000;
  const ttlMinimo = Math.min(...fuentes.map((f) => f.ttlSegundos));
  return edadSegundos <= multiploDeTtlParaFrescura * ttlMinimo;
}
