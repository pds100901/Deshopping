import { resolverUmbrales } from '../umbrales';
import type {
  NivelRiesgo,
  Propuesta,
  Receta,
  Ruta,
  TipoDeParametro,
  Traza,
  Umbrales,
  ValorDeParametro,
} from '../tipos';
import { hashDeReceta } from './receta';

const MS_POR_DIA = 86_400_000;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
const ESTADOS_CON_RECETA = ['receta', 'caliente', 'propuesta'];

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function agrupar<T>(items: T[], clave: (_item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const k = clave(item);
    grupos.set(k, [...(grupos.get(k) ?? []), item]);
  }
  return grupos;
}

function tipoDeValor(valor: ValorDeParametro): TipoDeParametro {
  if (typeof valor === 'number') return 'number';
  if (typeof valor === 'boolean') return 'boolean';
  return FECHA_ISO.test(valor) ? 'date' : 'string';
}

function unicos<T>(valores: T[]): T[] {
  return [...new Set(valores)];
}

/** Conjunto de herramientas más frecuente del grupo (empates: el menor en orden alfabético). */
function conjuntoMasFrecuente(trazas: Traza[]): { herramientas: string[]; estabilidad: number } {
  const conteo = agrupar(trazas, (t) => JSON.stringify(unicos(t.herramientas).sort()));
  let mejor = '';
  let max = 0;
  for (const [clave, grupo] of [...conteo].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (grupo.length > max) {
      mejor = clave;
      max = grupo.length;
    }
  }
  return { herramientas: JSON.parse(mejor) as string[], estabilidad: max / trazas.length };
}

function construirReceta(
  canonica: string,
  grupo: Traza[],
  herramientas: string[],
  nivel: NivelRiesgo,
): Receta {
  const parametros: Record<string, TipoDeParametro> = {};
  for (const traza of grupo) {
    for (const [nombre, valor] of Object.entries(traza.parametros)) {
      parametros[nombre] ??= tipoDeValor(valor);
    }
  }
  const sinHash: Omit<Receta, 'hash'> = {
    intencion: { canonica, ejemplos: unicos(grupo.flatMap((t) => (t.texto ? [t.texto] : []))) },
    parametros,
    pasos: herramientas.map((funcion) => ({ tipo: 'gateway', funcion })),
    fuentes: herramientas.map((origen) => ({ origen, ttlSegundos: 3600 })),
    frescura: { tipo: 'programada', cron: '0 * * * *' },
    permisoMaximo: nivel,
    temas: unicos(grupo.flatMap((t) => t.temas)).sort(),
    version: 1,
    evidencia: grupo.map((t) => t.id),
  };
  return { ...sinHash, hash: hashDeReceta(sinHash) };
}

function mensajeDeReceta(veces: number, canonica: string, nivel: NivelRiesgo): string {
  const cola =
    nivel <= 1
      ? `Es de solo lectura (nivel ${nivel}); se activa sola en 24 h si no la rechazas.`
      : `Puede escribir (nivel ${nivel}); necesita tu firma.`;
  return `Te hice esta ruta pensando en lo que me pediste ${veces} veces: “${canonica}”. ${cola}`;
}

function rutaConReceta(rutas: Ruta[], canonica: string, estados: string[]): Ruta | undefined {
  return rutas.find((r) => r.receta?.intencion.canonica === canonica && estados.includes(r.estado));
}

function proponerRecetas(
  exploraciones: Traza[],
  rutas: Ruta[],
  ahora: string,
  u: Umbrales,
): Propuesta[] {
  const propuestas: Propuesta[] = [];
  for (const [canonica, grupo] of agrupar(exploraciones, (t) => t.intencionCanonica)) {
    if (grupo.length < u.repeticionesParaReceta) continue;
    if (grupo.some((t) => t.corregido)) continue;
    if (rutaConReceta(rutas, canonica, ESTADOS_CON_RECETA)) continue;
    const { herramientas, estabilidad } = conjuntoMasFrecuente(grupo);
    if (estabilidad < u.estabilidadMinima) continue;

    const nivel = Math.min(...grupo.map((t) => t.nivelObservado)) as NivelRiesgo;
    propuestas.push({
      id: `prop-receta-${slug(canonica)}`,
      tipo: 'promover_a_receta',
      intencionCanonica: canonica,
      evidencia: grupo.map((t) => t.id),
      nivel,
      soloLectura: nivel <= 1,
      creadaEn: ahora,
      estado: 'pendiente',
      mensajeParaElkis: mensajeDeReceta(grupo.length, canonica, nivel),
      receta: construirReceta(canonica, grupo, herramientas, nivel),
    });
  }
  return propuestas;
}

function proponerCalientes(rutas: Ruta[], ahora: string, u: Umbrales): Propuesta[] {
  const propuestas: Propuesta[] = [];
  for (const ruta of rutas) {
    const { receta } = ruta;
    if (ruta.estado !== 'receta' || !receta) continue;
    if (ruta.metricas.usos7d < u.usosPorSemanaParaCaliente && !ruta.fijadaPorElkis) continue;
    const canonica = receta.intencion.canonica;
    propuestas.push({
      id: `prop-caliente-${slug(canonica)}`,
      tipo: 'promover_a_caliente',
      rutaId: ruta.id,
      intencionCanonica: canonica,
      evidencia: receta.evidencia,
      nivel: receta.permisoMaximo,
      soloLectura: receta.permisoMaximo <= 1,
      creadaEn: ahora,
      estado: 'pendiente',
      mensajeParaElkis: `“${canonica}” se usó ${ruta.metricas.usos7d} veces esta semana: la dejo viva para responder al instante.`,
      receta,
    });
  }
  return propuestas;
}

function proponerVistas(
  enVentana: Traza[],
  rutas: Ruta[],
  ahora: string,
  u: Umbrales,
): Propuesta[] {
  const propuestas: Propuesta[] = [];
  const conSuperficie = enVentana.filter((t) => t.tipoDeSuperficie !== undefined);
  const grupos = agrupar(conSuperficie, (t) =>
    JSON.stringify([t.intencionCanonica, t.tipoDeSuperficie]),
  );
  for (const grupo of grupos.values()) {
    if (grupo.length < u.repeticionesParaVista) continue;
    const canonica = grupo[0]!.intencionCanonica;
    const superficie = grupo[0]!.tipoDeSuperficie!;
    const ruta = rutaConReceta(rutas, canonica, ['receta', 'caliente']);
    if (!ruta?.receta) continue;
    propuestas.push({
      id: `prop-vista-${slug(canonica)}-${slug(superficie)}`,
      tipo: 'consolidar_vista',
      rutaId: ruta.id,
      intencionCanonica: canonica,
      evidencia: grupo.map((t) => t.id),
      nivel: ruta.receta.permisoMaximo,
      soloLectura: true,
      creadaEn: ahora,
      estado: 'pendiente',
      mensajeParaElkis: `Me pediste “${canonica}” ${grupo.length} veces como ${superficie}: dejo esa vista armada para mostrarla al instante.`,
    });
  }
  return propuestas;
}

const porCanonica = (a: Propuesta, b: Propuesta) =>
  a.intencionCanonica < b.intencionCanonica
    ? -1
    : a.intencionCanonica > b.intencionCanonica
      ? 1
      : 0;

/**
 * Agrupa trazas por intención canónica (+ tipo de superficie) y propone:
 * exploración → receta (≥ N en la ventana, no corregidas, herramientas estables),
 * receta → caliente (≥ usos/semana o fijada), superficie → vista (≥ repeticiones).
 * Salida ordenada por tipo (receta, caliente, vista) y luego por canónica.
 */
export function detectarPatrones(
  trazas: Traza[],
  rutas: Ruta[],
  ahora: string,
  umbrales?: Partial<Umbrales>,
): Propuesta[] {
  const u = resolverUmbrales(umbrales);
  const desde = Date.parse(ahora) - u.ventanaDiasParaReceta * MS_POR_DIA;
  const enVentana = trazas.filter((t) => !t.fallo && Date.parse(t.en) >= desde);
  const exploraciones = enVentana.filter((t) => t.rutaUsada === 'exploracion');
  return [
    ...proponerRecetas(exploraciones, rutas, ahora, u).sort(porCanonica),
    ...proponerCalientes(rutas, ahora, u).sort(porCanonica),
    ...proponerVistas(enVentana, rutas, ahora, u).sort(porCanonica),
  ];
}
