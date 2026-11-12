import type { AgenteOficina } from '@jules/oficina';
import { requiereAprobacion } from './aprobacion';

export { requiereAprobacion };

/** Un clip pregrabado de Jules confirmando una orden (`public/presentacion/ordenes/frases.json`). */
export interface Clip {
  archivo: string;
  texto: string;
  /** `true` si la frase dice que espera permiso; `false` si anuncia acción inmediata. */
  aprobacion: boolean;
}

const GENERICAS = ['Dame un resumen', 'Priorizá lo urgente', 'Avisame cuando terminés'];

/** Tres órdenes rápidas por rol, para no tener que escribir. */
const SUGERENCIAS: Record<string, string[]> = {
  Catálogo: [
    'Agregá lo que llegó hoy',
    'Revisá los precios del catálogo',
    'Mostrame lo más nuevo',
  ],
  Inventario: ['Marcá lo agotado', 'Decime qué queda poquito', 'Contá las existencias de nuevo'],
  Regalos: [
    'Proponé tres regalos de menos de ₡15 000',
    'Armá un regalo para amiga secreta',
    'Revisá «Armá tu regalo»',
  ],
  Publicadora: ['Publicá los cambios del catálogo', 'Esperá hasta mañana', 'Resumí qué cambió'],
  'Atención por WhatsApp': [
    'Avisales que su pedido ya llegó',
    'Hacé el tono más cercano',
    'Respondé las consultas de hoy',
  ],
  'Pedidos de clientes': [
    'Pasá los encargos nuevos a la lista',
    'Decime qué pedidos van atrasados',
    'Armá el resumen de la semana',
  ],
  Cotizaciones: ['Cotizá este encargo', 'Revisá el tipo de cambio', 'Prepará tres cotizaciones'],
  Guionista: [
    'Escribí el gancho del próximo reel',
    'Resumí el guion en tres líneas',
    'Proponé cinco ideas para historias',
  ],
  'Editora de video': ['Cortá el silencio del inicio', 'Agregá subtítulos', 'Exportá en vertical'],
  Diseñadora: [
    'Armá la historia de «ya llegó»',
    'Usá los colores de la marca',
    'Prepará tres versiones',
  ],
  Contadora: ['Cerrá el mes', 'Decime cuánto gané esta semana', 'Revisá los gastos de envío'],
  Promociones: [
    'Creá un código para el fin de semana',
    'Decime qué códigos vencen pronto',
    'Proponé una promo de temporada',
  ],
  Cobros: ['Recordá los saldos pendientes', 'Prepará un aviso amable', 'Listá quién debe adelanto'],
  'Asistente personal': [
    'Ordená mi agenda de mañana',
    'Pasá la entrega para la tarde',
    'Recordame cerrar los pedidos',
  ],
  Viajes: [
    'Armá la lista del próximo viaje',
    'Decime cuántos días faltan',
    'Anotá este encargo para el viaje',
  ],
  Entregas: ['Organizá las entregas de la semana', 'Agrupá por zona', 'Decime qué falta empacar'],
  'Compras SHEIN': [
    'Armá el carrito de la semana',
    'Revisá tallas y colores',
    'Decime cuánto suma el pedido',
  ],
  'Compras Temu': [
    'Armá el carrito de la semana',
    'Revisá qué llegó incompleto',
    'Decime cuánto suma el pedido',
  ],
  'Cazadora de ofertas': [
    'Buscá cupones para este pedido',
    'Avisame de ofertas nuevas',
    'Compará precios entre tiendas',
  ],
};

/** Respuestas cortas y con carácter por rol (locales, sin red ni API). */
const RESPUESTAS: Record<string, string[]> = {
  Catálogo: [
    'Me encanta. Lo dejo precioso.',
    'Listo, ya se ve en el catálogo.',
    'Foto, precio y descripción: voy.',
  ],
  Inventario: [
    'Anotado. Cuento dos veces, por si acaso.',
    'Voy, pieza por pieza.',
    'Ya lo estoy revisando.',
  ],
  Regalos: [
    'Uy, ya tengo ideas lindísimas.',
    'Voy a armar algo que enamore.',
    'Listo, con moñito y todo.',
  ],
  Publicadora: [
    'Entendido. Lo dejo listo, pero no publico nada sin tu aprobación.',
    'Preparado. Espero tu permiso para continuar.',
    'Todo en orden de mi lado. Vos das la señal.',
  ],
  'Atención por WhatsApp': [
    'Perfecto. Los mensajes están listos, esperan tu visto bueno.',
    'Lo ajusto. Nada sale hasta que aprobés.',
    'Hecho. Decime cuándo y los envío.',
  ],
  'Pedidos de clientes': [
    'Anotado, ningún encargo se me pierde.',
    'Ya los paso a la lista.',
    'Dame un momento y te lo cuento claro.',
  ],
  Cotizaciones: [
    'Sacando cuentas, ya te digo el precio.',
    'Va, con envío incluido.',
    'Tengo el primer número. Ya sigo.',
  ],
  Guionista: [
    'Ya tengo el gancho en la cabeza.',
    'Escena uno, a escribir.',
    'Dame cinco minutos y tenés guion.',
  ],
  'Editora de video': ['Exportando. Cafecito incluido.', 'Corte limpio, ya mismo.', 'Va a la línea de tiempo.'],
  Diseñadora: [
    'Rosado, verde y a brillar.',
    'Lo armo con las plantillas de la marca.',
    'Listo, y quedó divino.',
  ],
  Contadora: [
    'Cuadrando los números, como siempre.',
    'Anotado. Todo con respaldo.',
    'Lo reviso y te lo dejo en orden.',
  ],
  Promociones: [
    'Promo en camino.',
    'Lo preparo y te muestro cómo queda.',
    'Entendido, armo la propuesta.',
  ],
  Cobros: ['Con tacto y con fecha.', 'Lo preparo amable pero firme.', 'Anotado, nadie se me escapa.'],
  'Asistente personal': [
    'Tu agenda queda ordenada.',
    'Hecho, y con recordatorio.',
    'Ya lo muevo, vos tranquila.',
  ],
  Viajes: ['Maleta mental lista.', 'Lo anoto para el viaje.', 'Perfecto, esto va en la lista.'],
  Entregas: [
    'Empacando con cariño.',
    'Las ordeno por zona.',
    'Anotado, todo sale a tiempo.',
  ],
  'Compras SHEIN': [
    'Carrito en marcha.',
    'Reviso tallas antes de pedir.',
    'No compro nada sin que lo veás.',
  ],
  'Compras Temu': ['Carrito en marcha.', 'Ya lo estoy revisando.', 'Nada se me pasa.'],
  'Cazadora de ofertas': [
    'Si hay cupón, lo encuentro.',
    'Ya estoy buscando.',
    'Comparo antes de recomendar.',
  ],
};

const RESPUESTAS_GENERICAS = ['Anotado, me pongo en eso.', 'Va, ya empiezo.', 'Entendido.'];

/** Alivio al aprobar, por rol. */
const ALIVIO: Record<string, string> = {
  Publicadora: 'Gracias. Publico ahora y respiro tranquila.',
  'Atención por WhatsApp': 'Por fin. Envío los mensajes ahora.',
};
const ALIVIO_GENERICO = 'Gracias. Me pongo en marcha.';
const RECHAZO = 'Entendido. Lo dejo en pausa.';

export const sugerenciasDe = (rol: string): string[] => SUGERENCIAS[rol] ?? GENERICAS;

/** Frase del agente al recibir su `n`-ésima orden: rota por la lista del rol. */
export function respuestaDe(rol: string, n: number): string {
  const lista = RESPUESTAS[rol] ?? RESPUESTAS_GENERICAS;
  return lista[((n % lista.length) + lista.length) % lista.length] ?? '';
}

/**
 * Elige un clip al azar sin repetir el último (si hay más de uno). Solo entran los clips cuyo
 * sentido calza con el rol: quien exige aprobación no oye «no te va a pedir permiso».
 */
export function elegirClip(
  clips: Clip[],
  ultimo: string | null,
  azar: () => number,
  rol: string,
): Clip | undefined {
  const delRol = clips.filter((c) => c.aprobacion === requiereAprobacion(rol));
  const posibles = delRol.length > 1 ? delRol.filter((c) => c.archivo !== ultimo) : delRol;
  if (posibles.length === 0) return undefined;
  const i = Math.min(posibles.length - 1, Math.floor(azar() * posibles.length));
  return posibles[i];
}

/** Cola de clips por reproducir: una orden nueva no pisa la voz que ya suena. */
export const encolar = (cola: Clip[], clip: Clip): Clip[] => [...cola, clip];
export const siguiente = (cola: Clip[]): { clip: Clip | undefined; resto: Clip[] } => ({
  clip: cola[0],
  resto: cola.slice(1),
});

/** Lo que dice el agente cuando el cerebro marca su orden como delicada y no hay texto del modelo. */
export const FRASE_ORDEN_DELICADA =
  'Esta orden es delicada: te digo qué haré y espero tu aprobación.';

/** Queda `esperando_decision` con la orden como tarea, en el formato que lee `aprobar`. */
export function esperarDecision(agente: AgenteOficina, orden: string): AgenteOficina {
  return {
    ...agente,
    estado: 'esperando_decision',
    actividad: 'pensando',
    tarea: `Orden: «${orden.trim()}». Espera tu aprobación.`,
  };
}

/**
 * Transición al ordenar. Quien necesita aprobación queda `esperando_decision` con la orden
 * como tarea; el resto pasa a `trabajando` escribiendo. Una orden vacía no cambia nada.
 */
export function ordenar(agente: AgenteOficina, orden: string): AgenteOficina {
  const texto = orden.trim();
  if (!texto) return agente;
  if (requiereAprobacion(agente.rol)) return esperarDecision(agente, texto);
  return { ...agente, estado: 'trabajando', actividad: 'escribiendo', tarea: texto };
}

/** Aprobar: pasa a `trabajando` escribiendo, con la orden como tarea. */
export function aprobar(agente: AgenteOficina): { agente: AgenteOficina; frase: string } {
  const orden = /^Orden: «(.*)». Espera tu aprobación\.$/.exec(agente.tarea ?? '')?.[1];
  return {
    agente: {
      ...agente,
      estado: 'trabajando',
      actividad: 'escribiendo',
      tarea: orden ?? agente.tarea,
    },
    frase: ALIVIO[agente.rol] ?? ALIVIO_GENERICO,
  };
}

/** Rechazar: queda libre y sin actividad. */
export function rechazar(agente: AgenteOficina): { agente: AgenteOficina; frase: string } {
  return {
    agente: {
      ...agente,
      estado: 'libre',
      actividad: undefined,
      tarea: 'Orden rechazada. A la espera.',
    },
    frase: RECHAZO,
  };
}

/** Todo texto fijo que la Presentación puede mostrar por las órdenes (para revisar que sea genérico). */
export const textosDeOrdenes = (): string[] => [
  ...Object.values(SUGERENCIAS).flat(),
  ...GENERICAS,
  ...Object.values(RESPUESTAS).flat(),
  ...RESPUESTAS_GENERICAS,
  ...Object.values(ALIVIO),
  ALIVIO_GENERICO,
  RECHAZO,
];
