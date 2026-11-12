import type { Coincidencia, Ruta } from '../tipos';
import { tokensClave } from './clasificar';

/**
 * Cobertura: fracción de los tokens clave de la frase de la receta que aparecen en el pedido.
 * «muéstrame mis gastos del mes» cubre «gastos mes» por completo (1); «gastos» solo la mitad (0,5).
 * Es más permisiva que Jaccard con las paráfrasis y más estricta con pedidos que no nombran la
 * receta; el riesgo de usar una receta de lectura para un pedido de escritura lo cierra `decidir`.
 */
function cobertura(pedido: Set<string>, receta: string[]): number {
  if (receta.length === 0) return 0;
  return receta.filter((t) => pedido.has(t)).length / receta.length;
}

/**
 * Emparejador por tokens para la demo. Reemplazable por pgvector: `Contexto.coincidencias`
 * tiene prioridad si viene. Solo considera rutas con receta en estado `receta` o `caliente`.
 */
export function emparejarPorTokens(intencionCanonica: string, rutas: Ruta[]): Coincidencia[] {
  const buscados = new Set(tokensClave(intencionCanonica));
  return rutas
    .flatMap((ruta) => {
      const { receta } = ruta;
      if (!receta || (ruta.estado !== 'receta' && ruta.estado !== 'caliente')) return [];
      const frases = [receta.intencion.canonica, ...receta.intencion.ejemplos];
      const similitud = Math.max(...frases.map((f) => cobertura(buscados, tokensClave(f))));
      return [{ rutaId: ruta.id, similitud, parametros: {} }];
    })
    .sort((a, b) => b.similitud - a.similitud);
}
