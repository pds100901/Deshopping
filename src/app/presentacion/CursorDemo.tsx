import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Proyector } from '@jules/oficina';
import { demoEn } from './demo';
import type { Demo, Objetivo } from './demo';

interface Props {
  demo: Demo;
  /** Segundo actual de la pista (lo escribe el reloj del recorrido). */
  tiempo: MutableRefObject<number>;
  proyector: MutableRefObject<Proyector | null>;
}

interface Punto {
  x: number;
  y: number;
}

const suave = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

/** Dónde está en pantalla lo que persigue el cursor; `null` si aún no se ve. */
function donde(o: Objetivo, proyector: Proyector | null): Punto | null {
  if (o.tipo === 'agente') {
    const p = proyector?.(o.id);
    return p?.visible ? { x: p.x, y: p.y } : null;
  }
  const r = document.querySelector(`[data-demo="${o.nombre}"]`)?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}

/**
 * Cursor animado de la demo: sale de una esquina, viaja en arco hasta su objetivo y hace clic
 * con un pulso. Lee el tiempo de la pista cada cuadro (no re-renderiza React).
 */
export function CursorDemo({ demo, tiempo, proyector }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const aro = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cuadro = 0;
    const paso = () => {
      const el = caja.current;
      const anillo = aro.current;
      const c = el ? demoEn(tiempo.current, demo).cursor : null;
      if (el && anillo) {
        const hasta = c ? donde(c.segmento.hasta, proyector.current) : null;
        if (!c || !hasta) {
          el.style.opacity = '0';
        } else {
          const fin = hasta;
          const desde = c.segmento.desde
            ? (donde(c.segmento.desde, proyector.current) ?? fin)
            : {
                x: Math.min(innerWidth - 24, fin.x + 280),
                y: Math.min(innerHeight - 24, fin.y + 220),
              };
          const p = suave(c.p);
          const arco = Math.sin(Math.PI * c.p) * -36;
          el.style.opacity = String(c.opacidad);
          el.style.transform = `translate(${desde.x + (fin.x - desde.x) * p}px, ${desde.y + (fin.y - desde.y) * p + arco}px)`;
          el.classList.toggle('clic', c.pulso !== null && c.pulso < 0.35);
          anillo.style.opacity = c.pulso === null ? '0' : String(1 - c.pulso);
          anillo.style.transform = `translate(-50%, -50%) scale(${0.4 + (c.pulso ?? 0) * 1.6})`;
        }
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [demo, tiempo, proyector]);

  return (
    <div className="pres-cursor" ref={caja} aria-hidden="true">
      <span className="pres-cursor-aro" ref={aro} />
      <svg viewBox="0 0 24 24" width="44" height="44">
        <path
          d="M5 2.5v17l4.6-4.3 3.2 7 2.9-1.3-3.2-6.9H19z"
          fill="#fff"
          stroke="#0a0c10"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
