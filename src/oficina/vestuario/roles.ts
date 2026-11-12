import { catalogoBase } from '../catalogo/base';
import type { Atuendo } from '../tipos';

/**
 * Atuendo de cada rol, según la hoja de su personaje (`src/app/personajes.ts`): colores de pelo,
 * ropa y accesorios. El muñeco es de bloques, así que es una versión simplificada de la hoja.
 */
export const LOOK_POR_ROL: Record<string, Partial<Atuendo>> = {
  // Vicky Vitrina
  Catálogo: {
    skin: '#e5b48d', hair: 'largo', hairColor: '#f08a5d', top: 'blazer', topColor: '#3fb8af',
    bottom: 'falda', bottomColor: '#f9e2d2', shoes: '#ffffff', acc: ['lentes'],
  },
  // Rafa Repisa: gorra amarilla, camisa amarilla, overol azul
  Bodega: {
    skin: '#f3d4b8', hair: 'rizos', hairColor: '#4a2c1a', top: 'polera', topColor: '#ffd25e',
    print: '▣', bottom: 'pantalon', bottomColor: '#3f5f9e', shoes: '#7a5a3e', acc: ['gorra'],
  },
  // Lola Lazo
  Regalos: {
    skin: '#c98a5b', hair: 'mono', hairColor: '#b7412e', top: 'camisa', topColor: '#e5484d',
    print: '♥', bottom: 'falda', bottomColor: '#fff1e6', shoes: '#7a4768', acc: [],
  },
  // Clara Clic
  Publicación: {
    skin: '#a5683a', hair: 'corto', hairColor: '#1f1611', top: 'poleron', topColor: '#5aa9e6',
    bottom: 'pantalon', bottomColor: '#2f3a4f', shoes: '#ffffff', acc: ['audifonos'],
  },
  // Coco Caja: pelo rosado en moño, delantal rosado
  Ventas: {
    skin: '#f3d4b8', hair: 'mono', hairColor: '#ff7fa8', top: 'camisa', topColor: '#ffcadd',
    print: '♥', bottom: 'falda', bottomColor: '#ff7fa8', shoes: '#7a4768', acc: [],
  },
  // Nati Nota
  Pedidos: {
    skin: '#e5b48d', hair: 'largo', hairColor: '#4a2c1a', top: 'camisa', topColor: '#ffe08a',
    bottom: 'falda', bottomColor: '#7b5cc4', shoes: '#3b2230', acc: ['lentes'],
  },
  // Pepe Precio
  Cotizaciones: {
    skin: '#c98a5b', hair: 'corto', hairColor: '#1f1611', top: 'camisa', topColor: '#2a9d8f',
    bottom: 'pantalon', bottomColor: '#264653', shoes: '#3b2230', acc: ['lentes'],
  },
  // Brillitos: melena lila, chaqueta lila, pantalón crema
  'Diseño y contenido': {
    skin: '#f3d4b8', hair: 'largo', hairColor: '#b479e6', top: 'blazer', topColor: '#d6b0ff',
    print: '✦', bottom: 'pantalon', bottomColor: '#efe6ea', shoes: '#b479e6', acc: [],
  },
  // Gigi Guion
  Guiones: {
    skin: '#e5b48d', hair: 'rizos', hairColor: '#b7412e', top: 'polera', topColor: '#7a4768',
    print: '✎', bottom: 'pantalon', bottomColor: '#3b3f46', shoes: '#ffffff', acc: ['gorro'],
  },
  // Rolo Reel
  Video: {
    skin: '#a5683a', hair: 'rapado', hairColor: '#1f1611', top: 'poleron', topColor: '#f4a261',
    bottom: 'pantalon', bottomColor: '#2b2f36', shoes: '#ffffff', acc: ['audifonos'],
  },
  // Grace Gráfica: moño mostaza, lentes lila, chaleco mostaza, falda lila
  'Reportes y estadísticas': {
    skin: '#f3d4b8', hair: 'mono', hairColor: '#d7a52f', top: 'camisa', topColor: '#d7a52f',
    bottom: 'falda', bottomColor: '#b78ce6', shoes: '#7a4e36', acc: ['lentes'],
  },
  // Don Colón: gorra verde, chaleco verde, pantalón café
  Cobros: {
    skin: '#f3d4b8', hair: 'rizos', hairColor: '#6b4a3a', top: 'blazer', topColor: '#4e8c64',
    bottom: 'pantalon', bottomColor: '#5a4336', shoes: '#4a2c1a', acc: ['gorra'],
  },
  // Coni Cupón
  Promociones: {
    skin: '#c98a5b', hair: 'mono', hairColor: '#7b5cc4', top: 'polera', topColor: '#ffd166',
    print: '%', bottom: 'falda', bottomColor: '#ec4a93', shoes: '#ffffff', acc: [],
  },
  // Ana Agenda
  Agenda: {
    skin: '#e5b48d', hair: 'largo', hairColor: '#d9b26f', top: 'blazer', topColor: '#f6bd60',
    bottom: 'pantalon', bottomColor: '#84a59d', shoes: '#7a4e36', acc: [],
  },
  // Beto Boleto
  Viajes: {
    skin: '#c98a5b', hair: 'corto', hairColor: '#8a5a2b', top: 'camisa', topColor: '#457b9d',
    bottom: 'short', bottomColor: '#f1faee', shoes: '#7a5a3e', acc: ['mochila'],
  },
  // Rita Ruta: gorra roja, chaqueta roja, short café, mochila de entregas
  Entregas: {
    skin: '#f3d4b8', hair: 'rizos', hairColor: '#6b4336', top: 'deportiva', topColor: '#b73a3a',
    bottom: 'short', bottomColor: '#6b4336', shoes: '#e5484d', acc: ['gorra', 'mochila'],
  },
  // Vale Maleta: sombrero, blusa menta, short beige, mochila de viaje
  Compras: {
    skin: '#f3d4b8', hair: 'rizos', hairColor: '#7a4a3a', top: 'camisa', topColor: '#a8e5d6',
    bottom: 'short', bottomColor: '#e6d3a8', shoes: '#7a4e36', acc: ['gorro', 'mochila'],
  },
  // Cari Carrito
  Carritos: {
    skin: '#a5683a', hair: 'rizos', hairColor: '#1f1611', top: 'poleron', topColor: '#ff8c42',
    bottom: 'pantalon', bottomColor: '#3b3f46', shoes: '#ffffff', acc: ['audifonos'],
  },
  // Olga Oferta
  Ofertas: {
    skin: '#e5b48d', hair: 'largo', hairColor: '#3fa7a0', top: 'polera', topColor: '#ffd25e',
    print: '★', bottom: 'falda', bottomColor: '#e63946', shoes: '#3b2230', acc: ['lentes'],
  },
};

const CARAS_POR_INDICE = ['feliz', 'sonrisa', 'concentrado', 'guino', 'serio'];

/**
 * Atuendo por defecto de un rol (equivale a `defaultAvatar` del prototipo).
 * `indice` varía la cara, y lo que el look del rol no fije, entre agentes del mismo rol.
 */
export function atuendoPorRol(rol: string, indice: number): Atuendo {
  const look = LOOK_POR_ROL[rol] ?? {};
  const { pieles, coloresPelo, coloresBottom, coloresZapatos } = catalogoBase;
  return {
    skin: look.skin ?? pieles[(indice * 7 + 2) % pieles.length] ?? '',
    face: CARAS_POR_INDICE[indice % CARAS_POR_INDICE.length] ?? 'feliz',
    hair: look.hair ?? 'corto',
    hairColor: look.hairColor ?? coloresPelo[(indice * 3) % 6] ?? '',
    top: look.top ?? 'polera',
    topColor: look.topColor ?? '#ec4a93',
    print: look.print ?? '',
    bottom: look.bottom ?? 'pantalon',
    bottomColor: look.bottomColor ?? coloresBottom[indice % 4] ?? '',
    shoes: look.shoes ?? coloresZapatos[indice % 3] ?? '',
    acc: [...(look.acc ?? [])],
  };
}
