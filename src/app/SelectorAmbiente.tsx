import { plano } from '@jules/oficina';

interface Props {
  /** `null` = casa completa. */
  ambienteId: string | null;
  onAmbiente: (id: string | null) => void;
}

/** Entrar a un ambiente de la casa desde una lista; el toque en la escena hace lo mismo. */
export function SelectorAmbiente({ ambienteId, onAmbiente }: Props) {
  return (
    <div className="grupo">
      <h3>Ambiente</h3>
      <div className="chips" role="group" aria-label="Ambiente de la casa">
        <button
          type="button"
          className="chip"
          aria-pressed={ambienteId === null}
          onClick={() => onAmbiente(null)}
        >
          Casa completa
        </button>
        {plano.ambientes.map((a) => (
          <button
            key={a.id}
            type="button"
            className="chip"
            aria-pressed={ambienteId === a.id}
            onClick={() => onAmbiente(a.id)}
          >
            {a.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
