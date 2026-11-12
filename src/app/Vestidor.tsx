import { useEffect, useId, useRef, useState } from 'react';
import { alternarPieza, aplicarSkin } from '@jules/oficina';
import type { AgenteOficina, Atuendo, Catalogo, PaqueteSkins, Zona } from '@jules/oficina';

type Pestana = 'skins' | 'cuerpo' | 'pelo' | 'ropa' | 'accesorios';

const PESTANAS: [Pestana, string][] = [
  ['skins', 'Skins'],
  ['cuerpo', 'Cuerpo'],
  ['pelo', 'Pelo'],
  ['ropa', 'Ropa'],
  ['accesorios', 'Accesorios'],
];

const ETIQUETA_ZONA: Record<Zona, string> = {
  cabeza: 'Cabeza',
  pelo: 'Pelo',
  expresion: 'Expresión',
  cara: 'Cara',
  orejas: 'Orejas',
  sombrero: 'Sombrero',
  espalda: 'Espalda',
  mano: 'Mano',
  cuello: 'Cuello',
  torso: 'Torso',
  cintura: 'Cintura',
};

interface Props {
  catalogo: Catalogo;
  agente: AgenteOficina;
  atuendo: Atuendo;
  /** Paquetes con disfraces: cada uno lleva su botón «para todos». */
  paquetes: PaqueteSkins[];
  onCambiar: (atuendo: Atuendo) => void;
  onTodosDisfrazados: (paquete: PaqueteSkins) => void;
  onQuitarDisfraz: () => void;
  onCerrar: () => void;
}

function Chips({
  titulo,
  opciones,
  activo,
  onElegir,
}: {
  titulo: string;
  opciones: { id: string; nombre: string }[];
  activo: (id: string) => boolean;
  onElegir: (id: string) => void;
}) {
  return (
    <div className="grupo">
      <h3>{titulo}</h3>
      <div className="chips">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            className="chip"
            aria-pressed={activo(o.id)}
            onClick={() => onElegir(o.id)}
          >
            {o.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

function Muestras({
  titulo,
  colores,
  etiqueta,
  actual,
  onElegir,
}: {
  titulo: string;
  colores: string[];
  etiqueta: string;
  actual: string;
  onElegir: (color: string) => void;
}) {
  return (
    <div className="grupo">
      <h3>{titulo}</h3>
      <div className="chips">
        {colores.map((c, i) => (
          <button
            key={c}
            type="button"
            className="muestra"
            style={{ background: c }}
            aria-pressed={actual === c}
            aria-label={`${etiqueta} ${i + 1}`}
            onClick={() => onElegir(c)}
          />
        ))}
      </div>
    </div>
  );
}

/** Vestidor: todo sale del `catalogo` de datos; la UI solo pone las etiquetas de las pestañas. */
export function Vestidor({
  catalogo,
  agente,
  atuendo,
  paquetes,
  onCambiar,
  onTodosDisfrazados,
  onQuitarDisfraz,
  onCerrar,
}: Props) {
  const id = useId();
  const [pestana, setPestana] = useState<Pestana>('skins');
  const cerrar = useRef<HTMLButtonElement>(null);
  const pestanas = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => cerrar.current?.focus(), []);

  const cambiar = (parche: Partial<Atuendo>) => onCambiar(aplicarSkin(catalogo, atuendo, parche));
  const zonas = [...new Set(catalogo.piezas.map((p) => p.zona))];

  const teclado = (e: React.KeyboardEvent, indice: number) => {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (indice + paso + PESTANAS.length) % PESTANAS.length;
    setPestana(PESTANAS[siguiente]?.[0] ?? 'skins');
    pestanas.current[siguiente]?.focus();
  };

  return (
    <aside
      className="hud vestidor"
      aria-label="Vestidor"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCerrar();
      }}
    >
      <header>
        <div>
          <h2>Vestidor</h2>
          <p>{agente.nombre}</p>
        </div>
        <button
          ref={cerrar}
          type="button"
          className="cerrar"
          aria-label="Cerrar vestidor"
          onClick={onCerrar}
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
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="pestanas" role="tablist" aria-label="Categorías del vestidor">
        {PESTANAS.map(([clave, etiqueta], i) => (
          <button
            key={clave}
            ref={(el) => {
              pestanas.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-t-${clave}`}
            aria-selected={pestana === clave}
            aria-controls={`${id}-panel`}
            tabIndex={pestana === clave ? 0 : -1}
            onClick={() => setPestana(clave)}
            onKeyDown={(e) => teclado(e, i)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div
        className="vestidor-cuerpo"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-t-${pestana}`}
      >
        {pestana === 'skins' && (
          <div className="grupo">
            <h3>Disfraces</h3>
            <div className="skins">
              {catalogo.disfraces.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="skin"
                  onClick={() => cambiar(d.atuendo)}
                >
                  <b>{d.nombre}</b>
                  <span>{d.descripcion}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {pestana === 'cuerpo' && (
          <>
            <Muestras
              titulo="Tono de piel"
              colores={catalogo.pieles}
              etiqueta="Tono"
              actual={atuendo.skin}
              onElegir={(skin) => cambiar({ skin })}
            />
            <Chips
              titulo="Cara"
              opciones={catalogo.caras}
              activo={(x) => atuendo.face === x}
              onElegir={(face) => cambiar({ face })}
            />
          </>
        )}
        {pestana === 'pelo' && (
          <>
            <Chips
              titulo="Peinado"
              opciones={catalogo.peinados}
              activo={(x) => atuendo.hair === x}
              onElegir={(hair) => cambiar({ hair })}
            />
            <Muestras
              titulo="Color"
              colores={catalogo.coloresPelo}
              etiqueta="Color de pelo"
              actual={atuendo.hairColor}
              onElegir={(hairColor) => cambiar({ hairColor })}
            />
          </>
        )}
        {pestana === 'ropa' && (
          <>
            <Chips
              titulo="Parte de arriba"
              opciones={catalogo.tops}
              activo={(x) => atuendo.top === x}
              onElegir={(top) => cambiar({ top })}
            />
            <Muestras
              titulo="Color de arriba"
              colores={catalogo.coloresTop}
              etiqueta="Color"
              actual={atuendo.topColor}
              onElegir={(topColor) => cambiar({ topColor })}
            />
            <Chips
              titulo="Parte de abajo"
              opciones={catalogo.bottoms}
              activo={(x) => atuendo.bottom === x}
              onElegir={(bottom) => cambiar({ bottom })}
            />
            <Muestras
              titulo="Color de abajo"
              colores={catalogo.coloresBottom}
              etiqueta="Color"
              actual={atuendo.bottomColor}
              onElegir={(bottomColor) => cambiar({ bottomColor })}
            />
            <Muestras
              titulo="Zapatillas"
              colores={catalogo.coloresZapatos}
              etiqueta="Zapatillas"
              actual={atuendo.shoes}
              onElegir={(shoes) => cambiar({ shoes })}
            />
          </>
        )}
        {pestana === 'accesorios' &&
          zonas.map((zona) => (
            <Chips
              key={zona}
              titulo={ETIQUETA_ZONA[zona]}
              opciones={catalogo.piezas.filter((p) => p.zona === zona)}
              activo={(x) => atuendo.acc.includes(x)}
              onElegir={(pieza) => onCambiar(alternarPieza(catalogo, atuendo, pieza))}
            />
          ))}
      </div>

      <div className="acciones">
        {paquetes
          .filter((p) => (p.disfraces?.length ?? 0) > 0)
          .map((p) => (
            <button key={p.id} type="button" className="btn" onClick={() => onTodosDisfrazados(p)}>
              {p.nombre} para todos
            </button>
          ))}
        <button type="button" className="btn" onClick={onQuitarDisfraz}>
          Quitar disfraz
        </button>
      </div>
    </aside>
  );
}
