import { createHash } from 'node:crypto';
import type { Receta, Traza, ValidacionDeReceta } from '../tipos';

const TIPOS_DE_PASO_PERMITIDOS = ['sql_lectura', 'mcp_lectura', 'gateway'];
const SQL_DE_ESCRITURA = /\b(insert|update|delete|drop|alter|truncate|grant)\b/i;
const NOMBRES_DE_ESCRITURA = ['enviar', 'pagar', 'desplegar', 'aprobar', 'push', 'borrar'];

/** JSON con claves ordenadas recursivamente y sin `undefined`, para que el hash no dependa del orden. */
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor !== null && typeof valor === 'object') {
    const campos = Object.entries(valor)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`);
    return `{${campos.join(',')}}`;
  }
  return JSON.stringify(valor);
}

/** Hash determinista del contenido de la receta (sin el campo `hash`). */
export function hashDeReceta(receta: Omit<Receta, 'hash'>): string {
  return createHash('sha256').update(canonico(receta)).digest('hex');
}

/** Error de un paso (5.6: solo lectura o gateway) o `null` si es aceptable. */
function errorDePaso(paso: Receta['pasos'][number]): string | null {
  const tipo: string = paso.tipo;
  if (!TIPOS_DE_PASO_PERMITIDOS.includes(tipo)) return `paso prohibido: ${tipo}`;
  if (paso.tipo === 'sql_lectura') {
    return SQL_DE_ESCRITURA.test(paso.consulta) ? 'consulta no es de solo lectura' : null;
  }
  const nombre = paso.tipo === 'gateway' ? paso.funcion : paso.herramienta;
  const minuscula = nombre.toLowerCase();
  return NOMBRES_DE_ESCRITURA.some((palabra) => minuscula.includes(palabra))
    ? `paso prohibido: ${nombre}`
    : null;
}

/** Verdadero si algún paso no es de lectura/gateway seguro. Lo usa la activación automática. */
export function tienePasosDeEscritura(receta: Receta): boolean {
  return receta.pasos.some((paso) => errorDePaso(paso) !== null);
}

/**
 * Una receta nunca escala permisos (5.6): solo pasos de lectura/gateway,
 * `permisoMaximo` ≤ mínimo observado en su evidencia, hash íntegro, evidencia presente.
 */
export function validarReceta(receta: Receta, evidencia: Traza[]): ValidacionDeReceta {
  const errores: string[] = [];

  if (receta.intencion.canonica.trim() === '') errores.push('intención canónica vacía');
  if (receta.pasos.length === 0) errores.push('la receta no tiene pasos');
  for (const paso of receta.pasos) {
    const error = errorDePaso(paso);
    if (error !== null && !errores.includes(error)) errores.push(error);
  }
  for (const fuente of receta.fuentes) {
    if (!(fuente.ttlSegundos > 0)) errores.push(`fuente sin TTL válido: ${fuente.origen}`);
  }

  if (evidencia.length === 0)
    errores.push('sin evidencia: la receta no tiene trazas que la respalden');
  const porId = new Map(evidencia.map((traza) => [traza.id, traza]));
  const respaldo: Traza[] = [];
  for (const id of receta.evidencia) {
    const traza = porId.get(id);
    if (traza) respaldo.push(traza);
    else errores.push(`evidencia faltante: ${id}`);
  }
  if (respaldo.length > 0) {
    const minimo = Math.min(...respaldo.map((traza) => traza.nivelObservado));
    if (receta.permisoMaximo > minimo) {
      errores.push(`permisoMaximo supera el mínimo observado (${minimo})`);
    }
  }

  const { hash, ...resto } = receta;
  if (hashDeReceta(resto) !== hash) errores.push('hash alterado: la receta no corre');

  return { valida: errores.length === 0, errores };
}
