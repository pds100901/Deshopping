import { useState } from 'react';
import { departamentosBase } from '@jules/oficina';
import type { AgenteOficina, EstadoAgente } from '@jules/oficina';
import { Retrato } from './Retrato';

const ESTADO: Record<EstadoAgente, string> = {
  trabajando: 'Trabajando',
  esperando_decision: 'Espera tu decisión',
  libre: 'Libre',
};

interface Props {
  agentes: AgenteOficina[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}

/**
 * «Equipo»: la lista de todos los agentes por área, con su estado y lo que está haciendo cada
 * uno. Tocar a uno lo enfoca en la casa y abre su panel.
 */
export function PanelEquipo({ agentes, seleccionadoId, onSeleccionar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const esperan = agentes.filter((a) => a.estado === 'esperando_decision').length;
  return (
    <>
      <button
        type="button"
        className="hud btn-equipo"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        Equipo
        {esperan > 0 && <b aria-label={`${esperan} esperan tu decisión`}>{esperan}</b>}
      </button>
      {abierto && (
        <aside className="hud panel-equipo" aria-label="Qué hace cada agente">
          <div className="panel-equipo-cabeza">
            <h2>Qué hace cada quien</h2>
            <button
              type="button"
              className="btn-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar la lista del equipo"
            >
              ×
            </button>
          </div>
          {departamentosBase.map((d) => {
            const delArea = agentes.filter((a) => a.departamento === d.id);
            if (delArea.length === 0) return null;
            return (
              <section key={d.id}>
                <h3>{d.nombre}</h3>
                {delArea.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={a.id === seleccionadoId ? 'fila-agente activa' : 'fila-agente'}
                    onClick={() => {
                      onSeleccionar(a.id);
                      setAbierto(false);
                    }}
                  >
                    <Retrato rol={a.rol} nombre={a.nombre} />
                    <span className="fila-texto">
                      <strong>
                        {a.nombre} <small>· {a.rol}</small>
                      </strong>
                      <span className={`fila-estado estado-texto-${a.estado}`}>
                        {ESTADO[a.estado]}
                      </span>
                      <span className="fila-tarea">{a.tarea}</span>
                    </span>
                  </button>
                ))}
              </section>
            );
          })}
        </aside>
      )}
    </>
  );
}
