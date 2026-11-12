import { useState } from 'react';
import type { FormEvent } from 'react';
import { departamentosBase } from '@jules/oficina';
import type { AgenteOficina, EstadoAgente } from '@jules/oficina';
import { EnlacesArtefactos } from '../EnlacesArtefactos';
import { Retrato } from '../Retrato';
import { personajeDe } from '../personajes';
import { sugerenciasDe } from './ordenes';

const TITULO: Record<EstadoAgente, string> = {
  trabajando: 'Trabajando',
  esperando_decision: 'Espera aprobación',
  libre: 'Libre',
};

interface Props {
  agente: AgenteOficina;
  /** Lo último que dijo el agente en respuesta a una orden. */
  respuesta: string | undefined;
  /** Espera la respuesta del modelo: se muestra «…» en lugar de la frase. */
  pensando?: boolean;
  /** Línea discreta de «Modo local», una vez por sesión. */
  aviso?: string | null;
  onOrden: (texto: string) => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onCerrar: () => void;
  /** Abre la bandeja de entregas (el trabajo real del agente). */
  onVerEntregas?: () => void;
}

/** Panel del agente tocado: rol, departamento, estado y tarea, y un campo para darle órdenes. */
export function PanelOrden({
  agente,
  respuesta,
  pensando = false,
  aviso = null,
  onOrden,
  onAprobar,
  onRechazar,
  onCerrar,
  onVerEntregas,
}: Props) {
  const [texto, setTexto] = useState('');
  const depto = departamentosBase.find((d) => d.id === agente.departamento);

  const enviar = (orden: string) => {
    if (!orden.trim()) return;
    onOrden(orden);
    setTexto('');
  };
  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    enviar(texto);
  };

  return (
    <aside
      className="hud detalle panel-orden"
      aria-label={`Panel de ${agente.nombre}`}
    >
      <div className="panel-orden-cabeza">
        <Retrato rol={agente.rol} nombre={agente.nombre} />
        <div className="panel-orden-titulo">
          <h2>{agente.nombre}</h2>
          <div className="sub">
            {agente.rol} · {depto ? depto.nombre : agente.departamento}
          </div>
        </div>
        <button type="button" className="btn-cerrar" onClick={onCerrar} aria-label="Cerrar panel">
          ×
        </button>
      </div>
      {personajeDe(agente.rol) && <p className="caracter">{personajeDe(agente.rol)?.descripcion}</p>}
      <div className={`estado estado-${agente.estado}`} aria-live="polite">
        <strong>{TITULO[agente.estado]}</strong>
        <span>{agente.tarea}</span>
      </div>
      <EnlacesArtefactos rol={agente.rol} />
      {pensando ? (
        <p className="respuesta pensando" aria-busy="true" aria-label="Pensando">
          …
        </p>
      ) : (
        respuesta && (
          <p className="respuesta" key={respuesta} aria-live="polite">
            {respuesta}
          </p>
        )
      )}
      {onVerEntregas && (
        <button type="button" className="btn ver-entregas" onClick={onVerEntregas}>
          Ver sus entregas
        </button>
      )}
      {aviso && <p className="aviso-local">{aviso}</p>}
      {agente.estado === 'esperando_decision' && (
        <div className="acciones">
          <button type="button" className="btn principal" onClick={onAprobar}>
            Aprobar
          </button>
          <button type="button" className="btn" onClick={onRechazar}>
            Rechazar
          </button>
        </div>
      )}
      <form className="orden-form" onSubmit={alEnviar}>
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Dale una orden…"
          aria-label={`Orden para ${agente.nombre}`}
          autoComplete="off"
        />
        <button type="submit" className="btn principal" disabled={!texto.trim()}>
          Enviar
        </button>
      </form>
      <div className="chips" role="group" aria-label="Órdenes rápidas">
        {sugerenciasDe(agente.rol).map((s) => (
          <button key={s} type="button" className="chip" onClick={() => enviar(s)}>
            {s}
          </button>
        ))}
      </div>
    </aside>
  );
}
