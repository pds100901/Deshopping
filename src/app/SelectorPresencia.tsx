import { useId } from 'react';
import type { PresenciaJules } from '@jules/oficina';

const PRESENCIAS: [PresenciaJules, string][] = [
  ['reposo', 'Reposo'],
  ['escuchando', 'Escuchando'],
  ['pensando', 'Pensando'],
  ['hablando', 'Hablando'],
  ['esperando_decision', 'Espera decisión'],
];

interface Props {
  presencia: PresenciaJules;
  onPresencia: (p: PresenciaJules) => void;
  /** `undefined` = ritmo sintético. */
  nivelVoz: number | undefined;
  onNivelVoz: (n: number | undefined) => void;
}

/** Prueba la presencia de Jules: el estado del orbe y el volumen de su voz. */
export function SelectorPresencia({ presencia, onPresencia, nivelVoz, onNivelVoz }: Props) {
  const id = useId();
  return (
    <div className="grupo">
      <h3>Presencia de Jules</h3>
      <div className="chips" role="group" aria-label="Presencia de Jules">
        {PRESENCIAS.map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            className="chip"
            aria-pressed={presencia === clave}
            onClick={() => onPresencia(clave)}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <div className="hora">
        <label htmlFor={`${id}-voz`}>
          Nivel de voz{' '}
          <output htmlFor={`${id}-voz`}>
            {nivelVoz === undefined ? 'sintético' : nivelVoz.toFixed(2)}
          </output>
        </label>
        <input
          id={`${id}-voz`}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={nivelVoz ?? 0.5}
          onChange={(e) => onNivelVoz(Number(e.target.value))}
        />
        <button
          type="button"
          className="btn"
          aria-pressed={nivelVoz === undefined}
          onClick={() => onNivelVoz(undefined)}
        >
          Ritmo sintético
        </button>
      </div>
    </div>
  );
}
