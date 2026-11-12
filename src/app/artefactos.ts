/**
 * Los artefactos de De Shopping con Pau (claude.ai) y qué agente trabaja con cada uno. El panel
 * del agente muestra un enlace para abrirlos. Los enlaces solo abren para quien tiene acceso al
 * artefacto. Para cambiar o agregar uno, edita `ARTEFACTOS` y `ARTEFACTOS_POR_ROL`.
 */
export interface Artefacto {
  titulo: string;
  url: string;
}

const enlace = (titulo: string, id: string): Artefacto => ({
  titulo,
  url: `https://claude.ai/artifact/${id}`,
});

export const ARTEFACTOS = {
  catalogo: enlace('Disponible ahora', 'JUtrd1pobjSzuDTmQ3uJP9'),
  regalo: enlace('Armá tu regalo', '6f1HnA1TiohWY7bsTdBBq2'),
  pedidos: enlace('Pedidos de clientes', 'R9swdKYg8rYxnusQtNagic'),
  shein: enlace('Pedidos SHEIN', 'M6dWPKQfnGeqXXErrbZF77'),
  temu: enlace('Pedidos Temu', 'MQ5t5wtYGVjzgsk94XohVW'),
  cotizador: enlace('Cotizador', 'Ua5Y1DRWKXAzjHYSBkcrDp'),
  codigos: enlace('Códigos de descuento', '5wdgvtAfvCzMsT8oZVCJsr'),
  contenido: enlace('Banco de contenido', 'FjRaRJYVZtPYRsAhsropCA'),
  agenda: enlace('Agenda de Pau', 'VrdC6FsruzUc9D9tP2Agpc'),
  plantillas: enlace('Plantillas', 'HLANYxPGvmuc1aWMXox23R'),
  brandKit: enlace('Brand Kit', 'VLrb8t5uFwJ8HgrDWV2Ld8'),
  manual: enlace('Manual de marca', '7SH7EwSpZiGCrEnyyfpdQL'),
  videoPedir: enlace('Video: cómo pedir', 'T9uKvdpjbGMpAqCRSdYoBN'),
  videoCatalogo: enlace('Video: cómo usar tu catálogo', 'LA4HovCgx3UZHp3aygRnrS'),
} satisfies Record<string, Artefacto>;

const A = ARTEFACTOS;

/** Artefactos de cada rol (los roles de `roster.ts`). Un rol sin entrada no muestra enlaces. */
const ARTEFACTOS_POR_ROL: Record<string, Artefacto[]> = {
  Catálogo: [A.catalogo],
  Inventario: [A.catalogo],
  Regalos: [A.regalo],
  Publicadora: [A.catalogo],
  'Atención por WhatsApp': [A.pedidos],
  'Pedidos de clientes': [A.pedidos],
  Cotizaciones: [A.cotizador],
  Guionista: [A.contenido],
  'Editora de video': [A.videoPedir, A.videoCatalogo],
  Diseñadora: [A.plantillas, A.brandKit, A.manual],
  Promociones: [A.codigos],
  Cobros: [A.pedidos],
  'Asistente personal': [A.agenda],
  Viajes: [A.agenda],
  Entregas: [A.pedidos],
  'Compras SHEIN': [A.shein],
  'Compras Temu': [A.temu],
  'Cazadora de ofertas': [A.shein, A.temu],
};

export const artefactosDe = (rol: string): Artefacto[] => ARTEFACTOS_POR_ROL[rol] ?? [];
