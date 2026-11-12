/**
 * Qué hace la cámara y la demo en cada línea del guion (`public/presentacion/dueto-recorrido.*`).
 * Declarativo: cada paso se dispara cuando la voz dice su `ancla` (una frase de 1+ palabras; sin
 * tildes ni mayúsculas) dentro de su línea, o al empezar la línea si el ancla es `null`.
 *
 * La línea se identifica por un fragmento de su texto (`linea`), nunca por su posición: el guion
 * puede ganar o perder líneas (p. ej. las de Jules) sin tocar este archivo.
 *
 * Los ids de agente son `${departamento}:${rol}` según `armarRosterRecorrido` (0 Tienda en línea,
 * 1 Pedidos, 2 Contenido, 3 Finanzas, 4 Agenda y viajes, 5 Compras). Las marcas conservan los
 * nombres del guion original: «tomas» = Camila, «bruno» = Renata, «nico» = Sofi.
 */
export type Accion =
  /** Entra a un ambiente (`null` = casa completa sin cambiar el encuadre de orientación). */
  | { ambiente: string | null }
  /** Enfoca a un agente. */
  | { enfoca: string }
  /** Vuelve a la vista general inicial. */
  | { general: true }
  /** Entrega la cámara al usuario. */
  | { libre: true }
  /** Plano de la toma que empieza (1 = plano medio; más es más cerrado). Se restablece en cada cambio de sala. */
  | { plano: number }
  /** Anota un instante para la demo (cursor, panel, tarjetas, CTA); con `fin`, el final de la línea. */
  | { marca: string; fin?: true };

export interface Paso {
  /** Fragmento del texto de la línea (sin tildes ni mayúsculas ni signos). */
  linea: string;
  ancla: string | null;
  accion: Accion;
  /** El cambio de cámara es un corte: llega de golpe, sin viajar (ni se funde el empuje). */
  corte?: true;
}

export const GUION: Paso[] = [
  { linea: 'diecinueve ayudantes', ancla: null, accion: { general: true } },
  { linea: 'diecinueve ayudantes', ancla: 'esta es la oficina', accion: { marca: 'empuje' } },
  { linea: 'Ella es Jules', ancla: null, accion: { ambiente: 'atrio' }, corte: true },
  { linea: 'Ella es Jules', ancla: null, accion: { marca: 'jules' } },
  { linea: 'Ella es Jules', ancla: null, accion: { enfoca: 'jules' }, corte: true },
  // Inserto de la casa en corte mientras dice que reparte el trabajo (líneas ámbar desde Jules).
  { linea: 'Ella es Jules', ancla: 'Reparte el trabajo', accion: { general: true }, corte: true },
  { linea: 'Ella es Jules', ancla: 'Reparte el trabajo', accion: { marca: 'reparte' } },
  // Inserto de una sala con sus burbujas de estado mientras revisa todo.
  { linea: 'Ella es Jules', ancla: 'revisa todo', accion: { ambiente: 'desarrollo' }, corte: true },
  // Vuelta a Jules en primer plano.
  {
    linea: 'Ella es Jules',
    ancla: 'lo que necesito saber',
    accion: { ambiente: 'atrio' },
    corte: true,
  },
  {
    linea: 'Ella es Jules',
    ancla: 'lo que necesito saber',
    accion: { enfoca: 'jules' },
    corte: true,
  },
  { linea: 'Ella es Jules', ancla: 'lo que necesito saber', accion: { plano: 1.05 } },
  { linea: 'Ella es Jules', ancla: 'se lo pido a ella', accion: { marca: 'mira-camara' } },
  { linea: 'Hola. Pau da', ancla: null, accion: { marca: 'jules-fin', fin: true } },
  { linea: 'Arriba está la Tienda', ancla: null, accion: { ambiente: 'desarrollo' } },
  { linea: 'Arriba está la Tienda', ancla: 'Camila', accion: { enfoca: '0:Catálogo' } },
  { linea: 'Arriba está la Tienda', ancla: 'si la toco', accion: { marca: 'tomas-toca' } },
  { linea: 'Y ella es Renata', ancla: null, accion: { marca: 'tomas-fin' } },
  { linea: 'Y ella es Renata', ancla: 'Renata', accion: { enfoca: '0:Publicadora' } },
  { linea: 'Y ella es Renata', ancla: 'mirándome', accion: { marca: 'bruno-panel' } },
  { linea: 'Yo que vos lo apruebo', ancla: 'apruebo', accion: { marca: 'bruno-aprueba' } },
  { linea: 'Al lado está Contenido', ancla: null, accion: { marca: 'bruno-fin' } },
  { linea: 'Al lado está Contenido', ancla: null, accion: { ambiente: 'contenido' } },
  { linea: 'Al lado está Contenido', ancla: 'Valentina', accion: { enfoca: '2:Guionista' } },
  {
    linea: 'Al lado está Contenido',
    ancla: 'también el de este',
    accion: { marca: 'valentina-panel' },
  },
  { linea: 'Abajo, en Pedidos', ancla: null, accion: { marca: 'valentina-fin' } },
  { linea: 'Abajo, en Pedidos', ancla: null, accion: { ambiente: 'ventas' } },
  { linea: 'Abajo, en Pedidos', ancla: 'Sofi', accion: { enfoca: '1:Atención por WhatsApp' } },
  { linea: 'Abajo, en Pedidos', ancla: 'Le pido', accion: { marca: 'nico-pide' } },
  { linea: 'Abajo, en Pedidos', ancla: 'se pone a trabajar', accion: { marca: 'nico-envia' } },
  { linea: 'Doña Marta lleva', ancla: null, accion: { marca: 'nico-fin' } },
  { linea: 'Doña Marta lleva', ancla: null, accion: { ambiente: 'finanzas' } },
  { linea: 'Doña Marta lleva', ancla: 'Marta', accion: { enfoca: '3:Contadora' } },
  { linea: 'arriba en la torre está Lucía', ancla: null, accion: { ambiente: 'investigacion' } },
  { linea: 'arriba en la torre está Lucía', ancla: 'Lucía', accion: { enfoca: '5:Compras SHEIN' } },
  { linea: 'sé en qué está cada una', ancla: null, accion: { general: true } },
  { linea: 'sé en qué está cada una', ancla: null, accion: { marca: 'tarjetas' } },
  { linea: 'sé en qué está cada una', ancla: null, accion: { marca: 'tarjetas-fin', fin: true } },
  { linea: 'Ahora te toca a vos', ancla: null, accion: { libre: true } },
  { linea: 'escribinos por WhatsApp', ancla: null, accion: { marca: 'cta' } },
];
