import type { Metricas, Ruta, Traza, TipoDeRutaUsada, Vista } from '../tipos';

const TIPOS: TipoDeRutaUsada[] = ['caliente', 'receta', 'exploracion'];

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

function promedio(valores: number[]): number | null {
  return valores.length === 0 ? null : valores.reduce((a, b) => a + b, 0) / valores.length;
}

function porTipo<T>(
  calcular: (_delTipo: Traza[]) => T,
  trazas: Traza[],
): Record<TipoDeRutaUsada, T> {
  const resultado = {} as Record<TipoDeRutaUsada, T>;
  for (const tipo of TIPOS) resultado[tipo] = calcular(trazas.filter((t) => t.rutaUsada === tipo));
  return resultado;
}

/** Señales de 6.2 y etapa de 6.3, calculadas solo desde trazas, rutas y vistas. */
export function calcularMetricas(trazas: Traza[], rutas: Ruta[], vistas: Vista[]): Metricas {
  const calientes = rutas.filter((r) => r.estado === 'caliente');
  const recetas = rutas.filter((r) => r.estado === 'receta').length;
  const vistasConVariante = vistas.filter((v) => v.predeterminada !== undefined).length;

  const tasaDeRuta = porTipo(
    (delTipo) => (trazas.length === 0 ? 0 : delTipo.length / trazas.length),
    trazas,
  );
  const conTtl = trazas.filter((t) => t.dentroDeTtl !== undefined);

  return {
    rutasConsolidadas: { recetas, calientes: calientes.length, vistasConVariante },
    tasaDeRuta,
    latenciaMedianaMs: porTipo((t) => mediana(t.map((x) => x.latenciaMs)), trazas),
    costo: {
      porPedidoUsd: porTipo((t) => promedio(t.map((x) => x.costoUsd)), trazas),
      mantenerCalientesPorDiaUsd: calientes.reduce((s, r) => s + r.metricas.costoDiarioUsd, 0),
    },
    frescuraCumplida:
      conTtl.length === 0
        ? null
        : conTtl.filter((t) => t.dentroDeTtl === true).length / conTtl.length,
    correcciones: trazas.filter((t) => t.corregido).length,
    etapa: calcularEtapa(recetas, calientes.length, vistasConVariante, tasaDeRuta),
  };
}

/**
 * Etapa de vida (6.3). Las etapas 3 (delegación) y 4 (autonomía) necesitan señales que este
 * contrato no expone todavía, así que por ahora el techo es 2.
 */
function calcularEtapa(
  recetas: number,
  calientes: number,
  vistasConVariante: number,
  tasa: Record<TipoDeRutaUsada, number>,
): Metricas['etapa'] {
  const consolidado = recetas >= 10 && tasa.receta + tasa.caliente >= 0.3;
  if (!consolidado) return 0;
  const vivo = calientes >= 5 && tasa.caliente >= 0.5 && vistasConVariante >= 10;
  return vivo ? 2 : 1;
}
