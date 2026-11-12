import { ambienteDe } from '../../../mansion/plano';
import type { Taller } from './taller';

/**
 * Detalles con mesura: plantas en maceteros de cerámica en las esquinas libres de cada ambiente
 * y una mesita de teca entre las reposeras. Las posiciones están elegidas lejos de lugares,
 * salidas y muebles del plano (lo comprueban las pruebas).
 */

type Planta = 'ficus' | 'sansevieria' | 'palma' | 'olivo';

export interface Detalle {
  ambiente: string;
  x: number;
  z: number;
  /** Radio que ocupa en planta. */
  radio: number;
  tipo: Planta | 'mesita';
  maceta: string;
}

export const DETALLES: readonly Detalle[] = [
  { ambiente: 'living', x: -4.6, z: -3.4, radio: 0.35, tipo: 'olivo', maceta: '#fbd0e1' },
  { ambiente: 'gimnasio', x: -10.65, z: -3.5, radio: 0.25, tipo: 'sansevieria', maceta: '#853267' },
  { ambiente: 'finanzas', x: -4.75, z: -3.35, radio: 0.32, tipo: 'ficus', maceta: '#f691ba' },
  { ambiente: 'ventas', x: 4.75, z: -3.35, radio: 0.32, tipo: 'palma', maceta: '#fbd0e1' },
  { ambiente: 'desarrollo', x: -4.7, z: -3.3, radio: 0.3, tipo: 'ficus', maceta: '#853267' },
  {
    ambiente: 'desarrollo',
    x: -15.45,
    z: -3.4,
    radio: 0.25,
    tipo: 'sansevieria',
    maceta: '#fbd0e1',
  },
  { ambiente: 'contenido', x: 4.6, z: -3.35, radio: 0.25, tipo: 'sansevieria', maceta: '#f691ba' },
  { ambiente: 'cocina', x: 15.4, z: 3.2, radio: 0.32, tipo: 'olivo', maceta: '#fbd0e1' },
  { ambiente: 'investigacion', x: 3.45, z: -3.45, radio: 0.3, tipo: 'palma', maceta: '#86d1ea' },
  { ambiente: 'terraza', x: -14.5, z: 5.4, radio: 0.2, tipo: 'mesita', maceta: '#853267' },
];

function semilla(n: number) {
  let s = n;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function planta(t: Taller, d: Detalle, y: number, n: number): void {
  const r = semilla(n * 131 + 7);
  const alto = d.radio * 1.4;
  t.cilindro('tinte-brillo', d.x, y + alto / 2, d.z, d.radio * 0.85, d.radio * 0.65, alto, 18, {
    color: d.maceta,
  });
  t.cilindro('tinte', d.x, y + alto - 0.02, d.z, d.radio * 0.8, d.radio * 0.8, 0.02, 14, {
    color: '#f04c8e',
  });
  const base = y + alto;
  if (d.tipo === 'sansevieria') {
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4;
      const h = 0.55 + r() * 0.45;
      t.caja(
        'tinte',
        d.x + Math.cos(a) * 0.06,
        base + h / 2,
        d.z + Math.sin(a) * 0.06,
        0.06,
        h,
        0.012,
        {
          ry: a,
          rx: (r() - 0.5) * 0.25,
          rz: (r() - 0.5) * 0.25,
          color: k % 3 ? '#6aa640' : '#7ba83e',
        },
      );
    }
    return;
  }
  if (d.tipo === 'palma') {
    t.cilindro('tinte', d.x, base + 0.35, d.z, 0.025, 0.035, 0.7, 6, { color: '#f15795' });
    for (let k = 0; k < 9; k++) {
      const a = (k * 2 * Math.PI) / 9;
      t.en(d.x, base + 0.55 + (k % 3) * 0.12, d.z, a, () => {
        t.caja('tinte', 0, 0.12, 0.32, 0.16, 0.012, 0.7, {
          rx: -0.35 - (k % 2) * 0.25,
          color: '#72aa3c',
        });
      });
    }
    return;
  }
  const tronco = d.tipo === 'olivo' ? 1.1 : 1.3;
  t.cilindro('tinte', d.x, base + tronco / 2, d.z, 0.025, 0.04, tronco, 6, {
    color: d.tipo === 'olivo' ? '#f2639c' : '#f04c8e',
    rz: 0.06,
  });
  const verde =
    d.tipo === 'olivo' ? ['#9baf6a', '#8ba653', '#aab97e'] : ['#4faf36', '#57ae37', '#50ae37'];
  for (let k = 0; k < 8; k++) {
    const a = r() * Math.PI * 2;
    const dist = 0.08 + r() * 0.18;
    t.esfera(
      'tinte',
      d.x + Math.cos(a) * dist,
      base + tronco * (0.6 + r() * 0.5),
      d.z + Math.sin(a) * dist,
      0.13 + r() * 0.09,
      7,
      0.8,
      { color: verde[k % 3] },
    );
  }
}

function mesita(t: Taller, d: Detalle, y: number): void {
  t.cilindro('deck', d.x, y + 0.42, d.z, d.radio, d.radio, 0.03, 20);
  t.cilindro('deck', d.x, y + 0.2, d.z, 0.03, 0.04, 0.4, 8);
  t.cilindro('deck', d.x, y + 0.01, d.z, 0.14, 0.14, 0.02, 16);
  t.cilindro('tinte-brillo', d.x - 0.06, y + 0.5, d.z, 0.03, 0.025, 0.13, 10, { color: '#fbd0e1' });
  t.cilindro('tinte-brillo', d.x + 0.07, y + 0.49, d.z + 0.03, 0.028, 0.024, 0.11, 10, {
    color: '#f4d67b',
  });
}

/** Dibuja los detalles sobre el piso de su ambiente. */
export function detallar(t: Taller): void {
  DETALLES.forEach((d, n) => {
    const y = ambienteDe(d.ambiente).y;
    if (d.tipo === 'mesita') mesita(t, d, y);
    else planta(t, d, y, n);
  });
}
