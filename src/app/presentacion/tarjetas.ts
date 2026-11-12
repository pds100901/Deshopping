import { plano } from '@jules/oficina';
import type { AgenteOficina, EstadoAgente } from '@jules/oficina';

/** Una tarjeta por sala: quién la representa y qué está haciendo, en pocas palabras. */
export const TARJETAS: {
  sala: string;
  agenteId: string;
  accion: string;
  /** Desplazamiento en píxeles respecto del ancla (la torre queda bajo el rótulo fijo). */
  dx?: number;
  dy?: number;
}[] = [
  { sala: 'desarrollo', agenteId: '0:Catálogo', accion: 'Actualizando el catálogo' },
  { sala: 'contenido', agenteId: '2:Guionista', accion: 'Escribiendo el reel' },
  { sala: 'ventas', agenteId: '1:Atención por WhatsApp', accion: 'Avisando a clientas' },
  { sala: 'finanzas', agenteId: '3:Contadora', accion: 'Cuadrando el mes' },
  { sala: 'living', agenteId: '4:Viajes', accion: 'Esperando tu orden' },
  { sala: 'investigacion', agenteId: '5:Compras SHEIN', accion: 'Armando el carrito', dx: 330, dy: 70 },
];

/** Segundos entre una tarjeta y la siguiente en la cascada, y lo que dura cada entrada/salida. */
export const CASCADA = 0.55;
export const ENTRADA = 0.4;

export interface TarjetaEn {
  sala: string;
  texto: string;
  estado: EstadoAgente;
  /** 0 = no se ve, 1 = completa. */
  opacidad: number;
}

/** Punto 3D (m) donde se ancla la tarjeta de una sala: sobre su centro, a media altura. */
export function anclaDeSala(id: string) {
  const a = plano.ambientes.find((x) => x.id === id);
  if (!a) throw new Error(`Sala sin plano: ${id}`);
  return { x: (a.x0 + a.x1) / 2, y: a.y + Math.max(a.alto, 2.5) * 0.6, z: (a.z0 + a.z1) / 2 };
}

const acota = (x: number) => Math.min(1, Math.max(0, x));

/** Tarjetas visibles en el segundo `t`: entran en cascada desde `desde` y salen todas en `hasta`. */
export function tarjetasEn(
  t: number,
  desde: number,
  hasta: number,
  agentes: AgenteOficina[],
): TarjetaEn[] {
  const salida = acota(1 - (t - hasta) / ENTRADA);
  return TARJETAS.flatMap((c, i) => {
    const agente = agentes.find((a) => a.id === c.agenteId);
    const opacidad = Math.min(acota((t - desde - i * CASCADA) / ENTRADA), salida);
    if (!agente || opacidad <= 0) return [];
    return [
      { sala: c.sala, texto: `${agente.nombre} · ${c.accion}`, estado: agente.estado, opacidad },
    ];
  });
}
