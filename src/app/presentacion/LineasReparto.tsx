import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Proyector } from '@jules/oficina';
import { TARJETAS, anclaDeSala } from './tarjetas';

interface Props {
  /** Segundo en que empiezan a salir las líneas y segundo en que ya no se ven. */
  desde: number;
  hasta: number;
  tiempo: MutableRefObject<number>;
  proyector: MutableRefObject<Proyector | null>;
}

/** Dónde está Jules en reposo (el atrio), a la altura del pecho. */
const JULES = { x: 0, y: 1.3, z: 0 };
const SEGUNDOS_TRAZO = 0.7;
const ESCALONADO = 0.12;
const SALIDA = 0.3;

/** Líneas ámbar que salen de Jules hacia cada sala: «reparte el trabajo». */
export function LineasReparto({ desde, hasta, tiempo, proyector }: Props) {
  const trazos = useRef<(SVGPathElement | null)[]>([]);
  const chispas = useRef<(SVGCircleElement | null)[]>([]);
  const lienzo = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cuadro = 0;
    const paso = () => {
      const t = tiempo.current;
      const origen = proyector.current?.(JULES);
      const visible = t >= desde && t <= hasta + SALIDA && origen?.visible;
      if (lienzo.current)
        lienzo.current.style.opacity = visible
          ? String(Math.min(1, (hasta + SALIDA - t) / SALIDA))
          : '0';
      if (visible && origen) {
        TARJETAS.forEach((c, i) => {
          const fin = proyector.current?.(anclaDeSala(c.sala));
          const trazo = trazos.current[i];
          const chispa = chispas.current[i];
          if (!fin?.visible || !trazo || !chispa) return;
          const p = Math.min(1, Math.max(0, (t - desde - i * ESCALONADO) / SEGUNDOS_TRAZO));
          const cx = (origen.x + fin.x) / 2;
          const cy = Math.min(origen.y, fin.y) - 80;
          trazo.setAttribute('d', `M ${origen.x} ${origen.y} Q ${cx} ${cy} ${fin.x} ${fin.y}`);
          const largo = trazo.getTotalLength();
          trazo.style.strokeDasharray = `${largo}`;
          trazo.style.strokeDashoffset = `${largo * (1 - p)}`;
          const punta = trazo.getPointAtLength(largo * p);
          chispa.setAttribute('cx', String(punta.x));
          chispa.setAttribute('cy', String(punta.y));
          chispa.style.opacity = p > 0 && p < 1 ? '1' : '0';
        });
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [desde, hasta, tiempo, proyector]);

  return (
    <svg className="pres-reparto" ref={lienzo} aria-hidden="true">
      {TARJETAS.map((c, i) => (
        <g key={c.sala}>
          <path
            ref={(el) => {
              trazos.current[i] = el;
            }}
            fill="none"
            stroke="#ec4a93"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            ref={(el) => {
              chispas.current[i] = el;
            }}
            r="11"
            fill="#fff1d6"
          />
        </g>
      ))}
    </svg>
  );
}
