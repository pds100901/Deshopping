/** Roles que no actúan sin tu aprobación (Clara Clic publica; Coco Caja escribe a las clientas): al darles una orden quedan esperando decisión. */
export const ROLES_CON_APROBACION = new Set(['Publicación', 'Ventas']);

export const requiereAprobacion = (rol: string) => ROLES_CON_APROBACION.has(rol);
