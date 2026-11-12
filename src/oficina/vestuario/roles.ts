import { catalogoBase } from '../catalogo/base';
import type { Atuendo } from '../tipos';

/** Atuendo de cada rol, con los rosados y verdes de De Shopping con Pau. */
export const LOOK_POR_ROL: Record<string, Partial<Atuendo>> = {
  Catálogo: { top: 'poleron', topColor: '#ec4a93', hair: 'largo', acc: [], print: '' },
  Inventario: { top: 'polera', topColor: '#4a6741', hair: 'rizos', acc: ['audifonos'], print: '✓' },
  Regalos: { top: 'camisa', topColor: '#f9b4d1', hair: 'mono', acc: ['lentes'] },
  Publicadora: { top: 'blazer', topColor: '#3b2230', hair: 'corto', acc: [] },
  'Atención por WhatsApp': { top: 'blazer', topColor: '#ec4a93', hair: 'largo', acc: ['audifonos'] },
  'Pedidos de clientes': { top: 'camisa', topColor: '#fff8fb', hair: 'mono', acc: ['lentes'] },
  Cotizaciones: { top: 'poleron', topColor: '#bcd6ae', hair: 'largo', acc: [] },
  Guionista: { top: 'polera', topColor: '#d8b56a', hair: 'rizos', acc: ['gorro'], print: '★' },
  'Editora de video': { top: 'poleron', topColor: '#3b2230', hair: 'corto', acc: ['audifonos'] },
  Diseñadora: { top: 'polera', topColor: '#f9b4d1', hair: 'largo', acc: [], print: '♥' },
  Contadora: { top: 'camisa', topColor: '#e6f0de', hair: 'mono', acc: ['lentes', 'taza'] },
  Promociones: { top: 'blazer', topColor: '#4a6741', hair: 'rizos', acc: [] },
  Cobros: { top: 'polera', topColor: '#bcd6ae', hair: 'corto', acc: [] },
  'Asistente personal': { top: 'blazer', topColor: '#8a5a2b', hair: 'mono', acc: [] },
  Viajes: { top: 'deportiva', topColor: '#ec4a93', hair: 'largo', acc: ['mochila'] },
  Entregas: { top: 'polera', topColor: '#f9b4d1', hair: 'corto', acc: ['gorra', 'mochila'] },
  'Compras SHEIN': { top: 'blazer', topColor: '#f9b4d1', hair: 'rizos', acc: ['lentes'] },
  'Compras Temu': { top: 'poleron', topColor: '#e58a3c', hair: 'largo', acc: ['audifonos'] },
  'Cazadora de ofertas': { top: 'camisa', topColor: '#d8b56a', hair: 'corto', acc: ['lentes'] },
};

const CARAS_POR_INDICE = ['feliz', 'sonrisa', 'concentrado', 'guino', 'serio'];

/**
 * Atuendo por defecto de un rol (equivale a `defaultAvatar` del prototipo).
 * `indice` varía piel, cara, color de pelo, pantalón y zapatos entre agentes del mismo rol.
 */
export function atuendoPorRol(rol: string, indice: number): Atuendo {
  const look = LOOK_POR_ROL[rol] ?? {};
  const { pieles, coloresPelo, coloresBottom, coloresZapatos } = catalogoBase;
  return {
    skin: pieles[(indice * 7 + 2) % pieles.length] ?? '',
    face: CARAS_POR_INDICE[indice % CARAS_POR_INDICE.length] ?? 'feliz',
    hair: look.hair ?? 'corto',
    hairColor: coloresPelo[(indice * 3) % 6] ?? '',
    top: look.top ?? 'polera',
    topColor: look.topColor ?? '#ec4a93',
    print: look.print ?? '',
    bottom: look.bottom ?? 'pantalon',
    bottomColor: coloresBottom[indice % 4] ?? '',
    shoes: coloresZapatos[indice % 3] ?? '',
    acc: [...(look.acc ?? [])],
  };
}
