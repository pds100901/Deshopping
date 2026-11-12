import { departamentosBase } from '@jules/oficina';
import type { Actividad, AgenteOficina, EstadoAgente } from '@jules/oficina';
import { personajeDe } from './personajes';

/**
 * El equipo de De Shopping con Pau. Los departamentos van por número, en el orden de
 * `departamentosBase`: 0 Tienda en línea, 1 Pedidos, 2 Contenido, 3 Finanzas,
 * 4 Agenda y viajes, 5 Compras. Los nombres y la personalidad de cada uno están en `personajes.ts`.
 */

/** Qué está haciendo cada rol (el texto que ves al tocar a un agente). */
const TAREAS: Record<string, string> = {
  Catálogo: 'Actualizando «Disponible ahora» con lo que llegó esta semana.',
  Bodega: 'Contando existencias y marcando lo agotado.',
  Regalos: 'Armando combinaciones para «Armá tu regalo».',
  Publicación: 'Los cambios del catálogo están listos. Pide permiso para publicarlos.',
  Ventas: 'Preparó los avisos de «tu pedido ya llegó». Espera tu aprobación para enviarlos.',
  Pedidos: 'Pasando los encargos nuevos a «Pedidos de clientes».',
  Cotizaciones: 'Sacando precios con el Cotizador para los encargos de hoy.',
  'Diseño y contenido': 'Armando las historias de la semana con las plantillas de la marca.',
  Guiones: 'Escribiendo el guion del próximo reel desde el banco de contenido.',
  Video: 'Editando el video de «Cómo pedir».',
  'Reportes y estadísticas': 'Armando el reporte de ventas de la semana.',
  Cobros: 'Revisando adelantos y saldos pendientes.',
  Promociones: 'Revisando qué códigos de descuento siguen activos.',
  Agenda: 'Ordenando la Agenda de Pau para mañana.',
  Viajes: 'Preparando la lista del próximo viaje de compras.',
  Entregas: 'Organizando las entregas y los envíos de la semana.',
  Compras: 'Buscando lo de la lista en SHEIN, en Temu y para el próximo viaje.',
  Carritos: 'Armando los carritos de la semana en «Pedidos SHEIN» y «Pedidos Temu».',
  Ofertas: 'Buscando ofertas y cupones para los encargos pendientes.',
};

/** Roles de cada departamento; `true` = se puede clonar para llenar la sala del laboratorio. */
const ROLES: [string, boolean][][] = [
  [
    ['Catálogo', true],
    ['Bodega', true],
    ['Regalos', true],
    ['Publicación', true],
  ],
  [
    ['Ventas', true],
    ['Pedidos', true],
    ['Cotizaciones', true],
  ],
  [
    ['Diseño y contenido', false],
    ['Guiones', true],
    ['Video', true],
  ],
  [
    ['Reportes y estadísticas', false],
    ['Cobros', true],
    ['Promociones', true],
  ],
  [
    ['Agenda', false],
    ['Viajes', false],
    ['Entregas', true],
  ],
  [
    ['Compras', false],
    ['Carritos', true],
    ['Ofertas', true],
  ],
];

/**
 * Los 9 agentes base del laboratorio: [departamento, rol, estado, actividad]. Las actividades
 * reparten los cuatro gestos (teclear, leer, pensar, hablar) para verlos en la escena.
 */
const BASE: [number, string, EstadoAgente, Actividad?][] = [
  [0, 'Catálogo', 'trabajando', 'escribiendo'],
  [0, 'Bodega', 'trabajando', 'leyendo'],
  [0, 'Regalos', 'libre'],
  [0, 'Publicación', 'esperando_decision', 'pensando'],
  [1, 'Ventas', 'esperando_decision', 'hablando'],
  [2, 'Diseño y contenido', 'libre'],
  [3, 'Reportes y estadísticas', 'libre'],
  [4, 'Entregas', 'trabajando', 'hablando'],
  [5, 'Compras', 'trabajando', 'pensando'],
];

const POR_SALA: Record<number, number[]> = {
  9: [4, 1, 1, 1, 1, 1],
  18: [5, 3, 3, 2, 2, 3],
  30: [5, 5, 5, 5, 5, 5],
};

export const CANTIDADES = [9, 18, 30];

/** Roster de ejemplo del laboratorio (9, 18 o 30 agentes), determinista. */
export function armarRoster(cantidad: number): AgenteOficina[] {
  const cuentas = POR_SALA[cantidad] ?? POR_SALA[9] ?? [];
  const usados = new Map<string, number>();
  const agentes: AgenteOficina[] = [];
  const agregar = (sala: number, rol: string, estado: EstadoAgente, actividad?: Actividad) => {
    const clave = `${sala}:${rol}`;
    const n = (usados.get(clave) ?? 0) + 1;
    usados.set(clave, n);
    const propio = personajeDe(rol)?.nombre ?? rol;
    const nombre = n > 1 ? `${propio} · ${n}` : propio;
    agentes.push({
      id: `${sala}:${nombre}`,
      nombre,
      rol,
      departamento: departamentosBase[sala]?.id ?? '',
      estado,
      actividad,
      tarea: TAREAS[rol] ?? 'Trabajando en su tarea.',
    });
  };
  for (const [sala, rol, estado, actividad] of BASE) agregar(sala, rol, estado, actividad);

  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 9301 + 49297) % 233280;
    return semilla / 233280;
  };
  ROLES.forEach((roles, sala) => {
    const clonables = roles.filter(([, clonable]) => clonable);
    let tiene = agentes.filter((a) => a.departamento === departamentosBase[sala]?.id).length;
    let k = 0;
    while (tiene < (cuentas[sala] ?? 0) && clonables.length > 0) {
      const rol = clonables[k % clonables.length]?.[0] ?? '';
      k++;
      const r = azar();
      agregar(sala, rol, r < 0.6 ? 'trabajando' : r < 0.9 ? 'libre' : 'esperando_decision');
      tiene++;
    }
  });
  return agentes;
}

/** Departamento, rol, estado y actividad de cada agente de la oficina (los 19 del recorrido). */
const AGENTES_RECORRIDO: [number, string, EstadoAgente, Actividad?][] = [
  [0, 'Catálogo', 'trabajando', 'escribiendo'],
  [0, 'Bodega', 'trabajando', 'leyendo'],
  [0, 'Regalos', 'libre'],
  [0, 'Publicación', 'esperando_decision', 'pensando'],
  [1, 'Ventas', 'esperando_decision', 'hablando'],
  [1, 'Pedidos', 'trabajando', 'leyendo'],
  [1, 'Cotizaciones', 'trabajando', 'escribiendo'],
  [2, 'Guiones', 'trabajando', 'escribiendo'],
  [2, 'Diseño y contenido', 'trabajando', 'pensando'],
  [2, 'Video', 'libre'],
  [3, 'Cobros', 'trabajando', 'leyendo'],
  [3, 'Reportes y estadísticas', 'trabajando', 'pensando'],
  [3, 'Promociones', 'libre'],
  [4, 'Entregas', 'trabajando', 'hablando'],
  [4, 'Agenda', 'trabajando', 'leyendo'],
  [4, 'Viajes', 'libre'],
  [5, 'Compras', 'trabajando', 'pensando'],
  [5, 'Carritos', 'trabajando', 'leyendo'],
  [5, 'Ofertas', 'libre'],
];

/**
 * Roster de la oficina: un agente por rol, con ids `${departamento}:${rol}`, su nombre propio y
 * la tarea de su rol. No cambia el roster del laboratorio.
 */
export function armarRosterRecorrido(): AgenteOficina[] {
  return AGENTES_RECORRIDO.map(([sala, rol, estado, actividad]) => ({
    id: `${sala}:${rol}`,
    nombre: personajeDe(rol)?.nombre ?? rol,
    rol,
    departamento: departamentosBase[sala]?.id ?? '',
    estado,
    actividad,
    tarea: TAREAS[rol] ?? 'Trabajando en su tarea.',
  }));
}
