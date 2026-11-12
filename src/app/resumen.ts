import { departamentosBase } from '@jules/oficina';
import type { AgenteOficina } from '@jules/oficina';

export interface Resumen {
  trabajando: number;
  esperan: number;
  /** Texto de una línea para la burbuja. */
  linea: string;
  /** Qué necesita Jules de ti ahora: `negrita` va resaltada y `resto` sigue en texto normal. */
  mensaje: { negrita: string; resto: string };
}

/** Resumen de la oficina para la burbuja de Jules. */
export function resumir(agentes: AgenteOficina[]): Resumen {
  const trabajando = agentes.filter((a) => a.estado === 'trabajando').length;
  const esperando = agentes.filter((a) => a.estado === 'esperando_decision');
  const esperan = esperando.length;
  const linea = `${trabajando} trabajando · ${esperan} ${esperan === 1 ? 'espera' : 'esperan'} tu decisión · ${departamentosBase.length} departamentos`;

  const primero = esperando[0];
  if (!primero) {
    return {
      trabajando,
      esperan,
      linea,
      mensaje: { negrita: '', resto: 'Todo en marcha. Nadie te necesita ahora.' },
    };
  }
  if (esperan === 1) {
    return {
      trabajando,
      esperan,
      linea,
      mensaje: { negrita: primero.nombre, resto: ' espera tu decisión.' },
    };
  }
  const sala = departamentosBase.find((d) => d.id === primero.departamento)?.nombre ?? '';
  return {
    trabajando,
    esperan,
    linea,
    mensaje: {
      negrita: `${esperan} personas`,
      resto: ` esperan tu decisión.${sala ? ` ${sala} primero.` : ''}`,
    },
  };
}
