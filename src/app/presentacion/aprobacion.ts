/** Roles que no actúan sin tu aprobación: al darles una orden quedan esperando decisión. */
export const ROLES_CON_APROBACION = new Set(['Publicadora', 'Atención por WhatsApp']);

export const requiereAprobacion = (rol: string) => ROLES_CON_APROBACION.has(rol);
