import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { AgenteOficina, Proyector } from '@jules/oficina';
import { TARJETAS, anclaDeSala, tarjetasEn } from './tarjetas';

interface Props {
  /** Segundo en que entra la primera tarjeta y segundo en que se van todas. */
  desde: number;
  hasta: number;
  tiempo: MutableRefObject<number>;
  proyector: MutableRefObject<Proyector | null>;
  /** Agentes tal como se ven en ese instante (con lo que la demo ya cambió). */
  agentes: MutableRefObject<AgenteOficina[]>;
}

/** Tarjetas ancladas a cada sala en 3D: «Tomás · Armando pantallas», con el color de su estado. */
export function TarjetasFlotantes({ desde, hasta, tiempo, proyector, agentes }: Props) {
  const cajas = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let cuadro = 0;
    const paso = () => {
      const visibles = new Map(
        tarjetasEn(tiempo.current, desde, hasta, agentes.current).map((t) => [t.sala, t]),
      );
      for (const c of TARJETAS) {
        const el = cajas.current.get(c.sala);
        if (!el) continue;
        const t = visibles.get(c.sala);
        const punto = t ? proyector.current?.(anclaDeSala(c.sala)) : null;
        if (!t || !punto?.visible) {
          el.style.opacity = '0';
          continue;
        }
        if (el.textContent !== t.texto) el.textContent = t.texto;
        el.dataset.estado = t.estado;
        el.style.opacity = String(t.opacidad);
        el.style.transform = `translate(${punto.x + (c.dx ?? 0)}px, ${punto.y + (c.dy ?? 0) + (1 - t.opacidad) * 14}px) translate(-50%, -50%) scale(${0.9 + 0.1 * t.opacidad})`;
      }
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [desde, hasta, tiempo, proyector, agentes]);

  return (
    <div className="pres-tarjetas" aria-hidden="true">
      {TARJETAS.map((c) => (
        <div
          key={c.sala}
          className="pres-tarjeta"
          ref={(el) => {
            if (el) cajas.current.set(c.sala, el);
            else cajas.current.delete(c.sala);
          }}
        />
      ))}
    </div>
  );
}
