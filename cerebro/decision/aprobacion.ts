import { createHash } from 'node:crypto';
import type { ClaseDeAccion, Procedencia, SolicitudDeAprobacion, Umbrales } from '../tipos';

export interface DatosDeAprobacion {
  id: string;
  tipo: ClaseDeAccion;
  resumenFijo: string;
  destinatario?: string;
  monto?: number;
  hashDelContenido?: string;
  procedencia: Procedencia;
  ticketId?: string;
}

/** Copia con claves ordenadas recursivamente y sin `undefined` (igual que `JSON.stringify` los omite). */
function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor === null || typeof valor !== 'object') return valor;
  const ordenado: Record<string, unknown> = {};
  for (const clave of Object.keys(valor).sort()) {
    const campo = (valor as Record<string, unknown>)[clave];
    if (campo !== undefined) ordenado[clave] = ordenar(campo);
  }
  return ordenado;
}

/** JSON canónico con claves ordenadas; estable entre ejecuciones. */
export function canonicalizar(valor: unknown): string {
  return JSON.stringify(ordenar(valor));
}

/** SHA-256 hex (node:crypto). */
export function hashCanonico(canonico: string): string {
  return createHash('sha256').update(canonico).digest('hex');
}

/** Los campos que entran al canónico: todo lo visible en la tarjeta de `Revisión`. */
function camposFirmados(s: Omit<SolicitudDeAprobacion, 'canonico' | 'hash'>): string {
  return canonicalizar({
    id: s.id,
    tipo: s.tipo,
    resumenFijo: s.resumenFijo,
    destinatario: s.destinatario,
    monto: s.monto,
    hashDelContenido: s.hashDelContenido,
    procedencia: s.procedencia,
    ticketId: s.ticketId,
    creada: s.creada,
    expira: s.expira,
  });
}

export function crearSolicitudDeAprobacion(
  datos: DatosDeAprobacion,
  ahora: string,
  umbrales: Umbrales,
): SolicitudDeAprobacion {
  const expira = new Date(
    Date.parse(ahora) + umbrales.aprobacionExpiraSegundos * 1000,
  ).toISOString();
  const campos = { ...datos, creada: ahora, expira };
  const canonico = camposFirmados(campos);
  return { ...campos, canonico, hash: hashCanonico(canonico) };
}

/**
 * Una firma vale para una solicitud pendiente y no expirada; el hash debe coincidir.
 * También se exige que los campos visibles sigan siendo los del canónico: si alguien
 * cambia el destinatario sin tocar el canónico, la tarjeta ya no muestra lo que se firma.
 */
export function solicitudVigente(solicitud: SolicitudDeAprobacion, ahora: string): boolean {
  return (
    Date.parse(ahora) < Date.parse(solicitud.expira) &&
    hashCanonico(solicitud.canonico) === solicitud.hash &&
    camposFirmados(solicitud) === solicitud.canonico
  );
}
