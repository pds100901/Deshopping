import { departamentosBase } from '@jules/oficina';
import { EnlacesArtefactos } from './EnlacesArtefactos';
import { Retrato } from './Retrato';
import type { AgenteOficina, EstadoAgente } from '@jules/oficina';

const TITULO: Record<EstadoAgente, string> = {
  trabajando: 'Trabajando',
  esperando_decision: 'Espera tu decisión',
  libre: 'Libre',
};

interface Props {
  agente: AgenteOficina | undefined;
  onEstado: (id: string, estado: EstadoAgente) => void;
  onVestir: () => void;
}

/** Detalle del agente seleccionado con las acciones que cambian su estado. */
export function Detalle({ agente, onEstado, onVestir }: Props) {
  const nota = 'Demo con datos de ejemplo. Tocá a una persona para ver qué hace o vestirla.';
  if (!agente) {
    return (
      <aside className="hud detalle" aria-live="polite">
        <p className="nota">{nota}</p>
      </aside>
    );
  }
  const depto = departamentosBase.find((d) => d.id === agente.departamento);
  const accion = (etiqueta: string, estado: EstadoAgente, principal = false) => (
    <button
      type="button"
      className={principal ? 'btn principal' : 'btn'}
      onClick={() => onEstado(agente.id, estado)}
    >
      {etiqueta}
    </button>
  );
  return (
    <aside className="hud detalle" aria-live="polite">
      <div className="detalle-cabeza">
        <Retrato rol={agente.rol} nombre={agente.nombre} />
        <div>
        <h2>{agente.nombre}</h2>
        <div className="sub">
          {agente.rol} · {depto ? depto.nombre : agente.departamento}
        </div>
        </div>
      </div>
      <div className={`estado estado-${agente.estado}`}>
        <strong>{TITULO[agente.estado]}</strong>
        <span>{agente.tarea}</span>
      </div>
      <EnlacesArtefactos rol={agente.rol} />
      <div className="acciones">
        {agente.estado === 'esperando_decision' && (
          <>
            {accion('Aprobar', 'trabajando', true)}
            {accion('Rechazar', 'libre')}
          </>
        )}
        {agente.estado === 'trabajando' && accion('Pausar', 'libre')}
        {agente.estado === 'libre' && accion('Asignar tarea', 'trabajando', true)}
        <button type="button" className="btn" onClick={onVestir}>
          Vestir
        </button>
      </div>
      <p className="nota">{nota}</p>
    </aside>
  );
}
