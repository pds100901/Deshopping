import { resolverUmbrales } from '../umbrales';
import type { DecisionDeElkis, Propuesta, Umbrales } from '../tipos';
import { tienePasosDeEscritura } from './receta';

const MS_POR_HORA = 3_600_000;

/** Aplica la decisión de quien manda sobre una copia. Una propuesta rechazada ya no cambia. */
export function decidirSobrePropuesta(propuesta: Propuesta, decision: DecisionDeElkis): Propuesta {
  if (propuesta.estado === 'rechazada') return propuesta;
  switch (decision.tipo) {
    case 'aprobar':
      return { ...propuesta, estado: 'aprobada' };
    case 'ajustar':
      // La re-destilación de la receta ajustada es trabajo del núcleo; aquí solo se registra.
      return { ...propuesta, estado: 'ajustada', ajuste: decision.ajuste };
    case 'rechazar':
      return {
        ...propuesta,
        estado: 'rechazada',
        ...(decision.motivo === undefined ? {} : { ajuste: { motivo: decision.motivo } }),
      };
  }
}

/** Solo lectura (nivel ≤ 1) y ≥ `horasParaActivarSola` sin rechazo → activada_sola. Nunca escritura. */
export function activarSolas(
  propuestas: Propuesta[],
  ahora: string,
  umbrales?: Partial<Umbrales>,
): Propuesta[] {
  const { horasParaActivarSola } = resolverUmbrales(umbrales);
  return propuestas.map((propuesta) => {
    const elegible =
      propuesta.estado === 'pendiente' &&
      propuesta.soloLectura &&
      propuesta.nivel <= 1 &&
      !(propuesta.receta && tienePasosDeEscritura(propuesta.receta)) &&
      (Date.parse(ahora) - Date.parse(propuesta.creadaEn)) / MS_POR_HORA >= horasParaActivarSola;
    return elegible ? { ...propuesta, estado: 'activada_sola' } : propuesta;
  });
}
