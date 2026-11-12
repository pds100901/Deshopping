import type {
  Departamento,
  Intencion,
  MiembroDeEquipo,
  Procedencia,
  TrabajoPlantilla,
} from '../tipos';

/** Procedencia de quien manda (la persona dueña de la oficina): la única que da órdenes. */
export const PROCEDENCIA_PRINCIPAL: Procedencia = 'elkis';

/** Roles por departamento; un rol repetido se numera como instancias 1, 2… */
const ROLES_POR_DEPARTAMENTO: Record<Departamento, string[]> = {
  desarrollo: ['backend', 'qa'],
  ventas: ['vendedor'],
  contenido: ['redactor', 'disenador'],
  finanzas: ['contador'],
  personal: ['asistente'],
  investigacion: ['cientifico'],
};

/** Equipo por defecto de cada departamento (perfiles de rol clonables). */
export function equipoPorDefecto(departamento: Departamento): MiembroDeEquipo[] {
  const vistos = new Map<string, number>();
  return ROLES_POR_DEPARTAMENTO[departamento].map((perfilId) => {
    const instancia = (vistos.get(perfilId) ?? 0) + 1;
    vistos.set(perfilId, instancia);
    return { perfilId, instancia };
  });
}

/**
 * Plantilla de trabajo delegado: siempre worktree, sin secretos de producción y sin push.
 * Solo un pedido de quien manda obtiene red y el presupuesto amplio; tercero y sistema van acotados.
 */
export function crearTrabajo(
  intencion: Intencion,
  procedencia: Procedencia,
  ticketId?: string,
): TrabajoPlantilla {
  const esPrincipal = procedencia === PROCEDENCIA_PRINCIPAL;
  const herramientas = ['leer', 'editar', 'ejecutar_tests'];
  return {
    tipo: intencion.canonica,
    parametros: intencion.parametros,
    worktree: true,
    secretosDeProduccion: false,
    puedePushear: false,
    herramientasPermitidas: esPrincipal ? [...herramientas, 'red'] : herramientas,
    presupuestoUsd: esPrincipal ? 20 : 5,
    procedencia,
    ticketId,
  };
}
