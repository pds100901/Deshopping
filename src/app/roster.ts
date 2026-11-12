import { departamentosBase } from '@jules/oficina';
import type { Actividad, AgenteOficina, EstadoAgente } from '@jules/oficina';

/**
 * El equipo de De Shopping con Pau. Los departamentos van por número, en el orden de
 * `departamentosBase`: 0 Tienda en línea, 1 Pedidos, 2 Contenido, 3 Finanzas,
 * 4 Agenda y viajes, 5 Compras.
 */

/** Qué está haciendo cada rol (el texto que ves al tocar a un agente). */
const TAREAS: Record<string, string> = {
  Catálogo: 'Actualizando «Disponible ahora» con lo que llegó esta semana.',
  Inventario: 'Contando existencias y marcando lo agotado.',
  Regalos: 'Armando combinaciones para «Armá tu regalo».',
  Publicadora: 'Los cambios del catálogo están listos. Pide permiso para publicarlos.',
  'Atención por WhatsApp':
    'Preparó los avisos de «tu pedido ya llegó». Espera tu aprobación para enviarlos.',
  'Pedidos de clientes': 'Pasando los encargos nuevos a «Pedidos de clientes».',
  Cotizaciones: 'Sacando precios con el Cotizador para los encargos de hoy.',
  Guionista: 'Escribiendo el guion del próximo reel desde el banco de contenido.',
  'Editora de video': 'Editando el video de «Cómo pedir».',
  Diseñadora: 'Armando las historias de la semana con las plantillas de la marca.',
  Contadora: 'Cuadrando ingresos y gastos del mes.',
  Promociones: 'Revisando qué códigos de descuento siguen activos.',
  Cobros: 'Revisando adelantos y saldos pendientes.',
  'Asistente personal': 'Ordenando la Agenda de Pau para mañana.',
  Viajes: 'Preparando la lista del próximo viaje de compras.',
  Entregas: 'Organizando las entregas y los envíos de la semana.',
  'Compras SHEIN': 'Armando el carrito de la semana en «Pedidos SHEIN».',
  'Compras Temu': 'Armando el carrito de la semana en «Pedidos Temu».',
  'Cazadora de ofertas': 'Buscando ofertas y cupones para los encargos pendientes.',
};

/**
 * Nombre propio de cada agente (el rol queda debajo en rótulos y panel). Aquí se cambian los
 * nombres: el paquete `@jules/oficina` solo muestra `nombre`.
 */
const NOMBRES: Record<string, string> = {
  Catálogo: 'Camila',
  Inventario: 'Daniela',
  Regalos: 'Mariana',
  Publicadora: 'Renata',
  'Atención por WhatsApp': 'Sofi',
  'Pedidos de clientes': 'Andrea',
  Cotizaciones: 'Fernanda',
  Guionista: 'Valentina',
  'Editora de video': 'Gabi',
  Diseñadora: 'Isa',
  Contadora: 'Doña Marta',
  Promociones: 'Paola',
  Cobros: 'Karla',
  'Asistente personal': 'Jime',
  Viajes: 'Nati',
  Entregas: 'Meli',
  'Compras SHEIN': 'Lucía',
  'Compras Temu': 'Carol',
  'Cazadora de ofertas': 'Ximena',
};

/** Roles de cada departamento; `true` = se puede clonar para llenar la sala. */
const ROLES: [string, boolean][][] = [
  [
    ['Catálogo', true],
    ['Inventario', true],
    ['Regalos', true],
    ['Publicadora', true],
  ],
  [
    ['Atención por WhatsApp', true],
    ['Pedidos de clientes', true],
    ['Cotizaciones', true],
  ],
  [
    ['Guionista', true],
    ['Editora de video', true],
    ['Diseñadora', true],
  ],
  [
    ['Contadora', false],
    ['Promociones', true],
    ['Cobros', true],
  ],
  [
    ['Asistente personal', false],
    ['Viajes', false],
    ['Entregas', true],
  ],
  [
    ['Compras SHEIN', false],
    ['Compras Temu', true],
    ['Cazadora de ofertas', true],
  ],
];

/**
 * Los 9 agentes base del laboratorio: [departamento, rol, estado, actividad]. Las actividades
 * reparten los cuatro gestos (teclear, leer, pensar, hablar) para verlos en la escena.
 */
const BASE: [number, string, EstadoAgente, Actividad?][] = [
  [0, 'Catálogo', 'trabajando', 'escribiendo'],
  [0, 'Inventario', 'trabajando', 'leyendo'],
  [0, 'Regalos', 'libre'],
  [0, 'Publicadora', 'esperando_decision', 'pensando'],
  [1, 'Atención por WhatsApp', 'esperando_decision', 'hablando'],
  [2, 'Guionista', 'libre'],
  [3, 'Contadora', 'libre'],
  [4, 'Asistente personal', 'trabajando', 'hablando'],
  [5, 'Compras SHEIN', 'trabajando', 'pensando'],
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
    const nombre = n > 1 ? `${rol} · ${n}` : rol;
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
  [0, 'Inventario', 'trabajando', 'leyendo'],
  [0, 'Regalos', 'libre'],
  [0, 'Publicadora', 'esperando_decision', 'pensando'],
  [1, 'Atención por WhatsApp', 'esperando_decision', 'hablando'],
  [1, 'Pedidos de clientes', 'trabajando', 'leyendo'],
  [1, 'Cotizaciones', 'trabajando', 'escribiendo'],
  [2, 'Guionista', 'trabajando', 'escribiendo'],
  [2, 'Editora de video', 'trabajando', 'pensando'],
  [2, 'Diseñadora', 'libre'],
  [3, 'Contadora', 'trabajando', 'leyendo'],
  [3, 'Promociones', 'trabajando', 'pensando'],
  [3, 'Cobros', 'libre'],
  [4, 'Asistente personal', 'trabajando', 'hablando'],
  [4, 'Viajes', 'libre'],
  [4, 'Entregas', 'trabajando', 'leyendo'],
  [5, 'Compras SHEIN', 'trabajando', 'pensando'],
  [5, 'Compras Temu', 'trabajando', 'leyendo'],
  [5, 'Cazadora de ofertas', 'libre'],
];

/**
 * Roster de la oficina: un agente por rol, con ids `${departamento}:${rol}`, su nombre propio y
 * la tarea de su rol. No cambia el roster del laboratorio.
 */
export function armarRosterRecorrido(): AgenteOficina[] {
  return AGENTES_RECORRIDO.map(([sala, rol, estado, actividad]) => ({
    id: `${sala}:${rol}`,
    nombre: NOMBRES[rol] ?? rol,
    rol,
    departamento: departamentosBase[sala]?.id ?? '',
    estado,
    actividad,
    tarea: TAREAS[rol] ?? 'Trabajando en su tarea.',
  }));
}
