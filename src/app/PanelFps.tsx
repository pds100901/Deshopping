import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { horaChile } from '@jules/oficina';
import type { MetricasRender } from '@jules/oficina';
import { formatearHora } from './hora';
import { copiarTexto, medicionJson, nivelP95 } from './medicion';

export type Calidad = 'auto' | 'alta' | 'media' | 'baja';

const CALIDADES: Calidad[] = ['auto', 'alta', 'media', 'baja'];

interface Props {
  metricas: MetricasRender;
  cantidades: number[];
  cantidad: number;
  onCantidad: (n: number) => void;
  calidad: Calidad;
  onCalidad: (c: Calidad) => void;
  visible: boolean;
  onVisible: (v: boolean) => void;
  /** `null` = hora real de Chile. */
  hora: number | null;
  onHora: (h: number | null) => void;
  /** Controles extra al final del panel. */
  children?: ReactNode;
}

function Dato({ valor, etiqueta, nivel }: { valor: string; etiqueta: string; nivel?: string }) {
  return (
    <div className="dato">
      <b className={nivel ? `nivel-${nivel}` : undefined}>{valor}</b>
      <span>{etiqueta}</span>
    </div>
  );
}

const numero = (n: number | undefined, decimales = 0) =>
  n === undefined ? '--' : n.toFixed(decimales);

/** Panel de rendimiento: lectura de `onMetricas` y controles para probar la oficina. */
export function PanelFps({
  metricas,
  cantidades,
  cantidad,
  onCantidad,
  calidad,
  onCalidad,
  visible,
  onVisible,
  hora,
  onHora,
  children,
}: Props) {
  const id = useId();
  const [abierto, setAbierto] = useState(() => window.matchMedia('(min-width: 641px)').matches);
  const [aviso, setAviso] = useState('');
  const [respaldo, setRespaldo] = useState('');

  const horaMostrada = hora ?? horaChile(new Date());

  const copiar = async () => {
    const texto = medicionJson(metricas, {
      cantidad,
      calidad,
      visible,
      hora,
      entorno: {
        agente: navigator.userAgent,
        ancho: window.innerWidth,
        alto: window.innerHeight,
        dpr: window.devicePixelRatio,
      },
      ahora: new Date(),
    });
    const copiado = await copiarTexto(texto);
    setRespaldo(copiado ? '' : texto);
    setAviso(copiado ? 'Medición copiada' : 'No se pudo copiar solo: selecciona el texto de abajo');
  };

  if (!metricas.webgl) {
    return (
      <section className="hud panel-fps" aria-label="Rendimiento">
        <p className="nota">Sin WebGL: no hay nada que medir en este dispositivo.</p>
      </section>
    );
  }

  return (
    <section className="hud panel-fps" aria-label="Rendimiento">
      <div className="panel-cabecera">
        <div className="datos" aria-live="off">
          <Dato valor={numero(metricas.fps)} etiqueta="FPS" />
          <Dato valor={numero(metricas.p95, 1)} etiqueta="ms p95" nivel={nivelP95(metricas.p95)} />
        </div>
        <button
          type="button"
          className="btn-icono"
          aria-expanded={abierto}
          aria-controls={`${id}-cuerpo`}
          aria-label={
            abierto ? 'Ocultar detalles de rendimiento' : 'Mostrar detalles de rendimiento'
          }
          onClick={() => setAbierto(!abierto)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d={abierto ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      </div>
      {!visible && <p className="detenido">Render detenido</p>}

      {abierto && (
        <div id={`${id}-cuerpo`} className="panel-cuerpo">
          <div className="datos">
            <Dato valor={numero(metricas.p50, 1)} etiqueta="ms p50" />
            <Dato valor={numero(metricas.drawCalls)} etiqueta="draw calls" />
            <Dato valor={numero(metricas.triangulos)} etiqueta="triángulos" />
            <Dato valor={numero(metricas.agentes)} etiqueta="agentes" />
          </div>

          <div className="seg" role="group" aria-label="Cantidad de agentes">
            {cantidades.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === cantidad}
                onClick={() => onCantidad(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="seg" role="group" aria-label="Calidad">
            {CALIDADES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === calidad}
                onClick={() => onCalidad(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="interruptor">
            Oficina visible
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => onVisible(e.target.checked)}
            />
          </label>

          <div className="hora">
            <label htmlFor={`${id}-hora`}>
              Hora simulada <output htmlFor={`${id}-hora`}>{formatearHora(horaMostrada)}</output>
            </label>
            <input
              id={`${id}-hora`}
              type="range"
              min={0}
              max={24}
              step={0.25}
              value={horaMostrada}
              onChange={(e) => onHora(Number(e.target.value))}
            />
            <button
              type="button"
              className="btn"
              aria-pressed={hora === null}
              onClick={() => onHora(null)}
            >
              Hora real de Chile
            </button>
          </div>

          {children}

          <button type="button" className="btn" onClick={() => void copiar()}>
            Copiar medición
          </button>
          <p className="nota" role="status">
            {aviso}
          </p>
          {respaldo && (
            <textarea
              className="respaldo"
              readOnly
              rows={8}
              value={respaldo}
              aria-label="Medición en JSON"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}
    </section>
  );
}
