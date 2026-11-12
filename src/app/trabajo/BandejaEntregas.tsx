import { useState } from 'react';
import { departamentosBase } from '@jules/oficina';
import { Retrato } from '../Retrato';
import type { Entrega } from './encargo';

/** Una entrega que todavía se está escribiendo o que falló (vive solo en esta pestaña). */
export interface EnCurso {
  id: string;
  agenteId: string;
  nombre: string;
  rol: string;
  orden: string;
  /** Lo que lleva escrito. */
  texto: string;
  /** Explicación del fallo; `null` mientras escribe. */
  fallo: string | null;
}

interface Props {
  entregas: Entrega[];
  enCurso: EnCurso[];
  /** Las entregas se comparten entre personas y dispositivos (artefacto) o quedan en este navegador. */
  compartido: boolean;
  abierta: boolean;
  onAbrir: (abierta: boolean) => void;
  onAprobar: (e: Entrega) => void;
  onRechazar: (e: Entrega) => void;
  onCambios: (e: Entrega, nota: string) => void;
  onBorrar: (e: Entrega) => void;
  onReintentar: (c: EnCurso) => void;
  onDescartar: (c: EnCurso) => void;
}

const fecha = (ms: number) =>
  new Date(ms).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const area = (id: string) => departamentosBase.find((d) => d.id === id)?.nombre ?? id;

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1600);
      })
      .catch(() => undefined); // si el navegador no deja, el texto se puede seleccionar a mano
  };
  return (
    <button type="button" className="btn" onClick={copiar}>
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function Tarjeta({
  entrega,
  onAprobar,
  onRechazar,
  onCambios,
  onBorrar,
}: { entrega: Entrega } & Pick<Props, 'onAprobar' | 'onRechazar' | 'onCambios' | 'onBorrar'>) {
  const [pidiendo, setPidiendo] = useState(false);
  const [nota, setNota] = useState('');
  const pendiente = entrega.estado === 'por_revisar';
  return (
    <article className={`entrega entrega-${entrega.estado}`}>
      <header>
        <Retrato rol={entrega.rol} nombre={entrega.nombre} />
        <div>
          <strong>{entrega.nombre}</strong>
          <small>
            {entrega.rol} · {area(entrega.departamento)} · {fecha(entrega.creada)}
            {entrega.version > 1 ? ` · versión ${entrega.version}` : ''}
          </small>
        </div>
        <span className="sello">
          {pendiente
            ? `Aprueba ${entrega.aprueba}`
            : entrega.estado === 'aprobada'
              ? `Aprobada por ${entrega.aprueba}`
              : 'Rechazada'}
        </span>
      </header>
      <p className="entrega-orden">Orden: «{entrega.orden}»</p>
      <div className="entrega-texto">{entrega.texto}</div>
      {pidiendo ? (
        <form
          className="entrega-cambios"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nota.trim()) return;
            onCambios(entrega, nota.trim());
            setPidiendo(false);
            setNota('');
          }}
        >
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={400}
            placeholder="¿Qué querés que cambie?"
            aria-label={`Cambios para ${entrega.nombre}`}
          />
          <div className="acciones">
            <button type="submit" className="btn principal" disabled={!nota.trim()}>
              Pedir cambios
            </button>
            <button type="button" className="btn" onClick={() => setPidiendo(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="acciones">
          {pendiente && (
            <>
              <button type="button" className="btn principal" onClick={() => onAprobar(entrega)}>
                Aprobar
              </button>
              <button type="button" className="btn" onClick={() => setPidiendo(true)}>
                Pedir cambios
              </button>
              <button type="button" className="btn" onClick={() => onRechazar(entrega)}>
                Rechazar
              </button>
            </>
          )}
          <Copiar texto={entrega.texto} />
          {!pendiente && (
            <button type="button" className="btn" onClick={() => onBorrar(entrega)}>
              Borrar
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * «Entregas»: el trabajo real de los agentes. Cada orden deja aquí un texto terminado que espera
 * el visto bueno (Oz lo de Contenido, Pau lo demás). Se puede aprobar, pedir cambios o rechazar.
 */
export function BandejaEntregas(props: Props) {
  const { entregas, enCurso, compartido, abierta, onAbrir } = props;
  const [vista, setVista] = useState<'por_revisar' | 'listas'>('por_revisar');
  const porRevisar = entregas.filter((e) => e.estado === 'por_revisar');
  const listas = entregas.filter((e) => e.estado !== 'por_revisar');
  const visibles = vista === 'por_revisar' ? porRevisar : listas;
  const deOz = porRevisar.filter((e) => e.aprueba === 'Oz').length;
  return (
    <>
      <button
        type="button"
        className="hud btn-equipo btn-entregas"
        aria-expanded={abierta}
        onClick={() => onAbrir(!abierta)}
      >
        Entregas
        {porRevisar.length + enCurso.length > 0 && (
          <b aria-label={`${porRevisar.length} por revisar`}>{porRevisar.length + enCurso.length}</b>
        )}
      </button>
      {abierta && (
        <aside className="hud panel-equipo panel-entregas" aria-label="Entregas de los agentes">
          <div className="panel-equipo-cabeza">
            <h2>Entregas</h2>
            <button
              type="button"
              className="btn-cerrar"
              onClick={() => onAbrir(false)}
              aria-label="Cerrar las entregas"
            >
              ×
            </button>
          </div>
          <div className="chips" role="group" aria-label="Qué entregas ver">
            <button
              type="button"
              className="chip"
              aria-pressed={vista === 'por_revisar'}
              onClick={() => setVista('por_revisar')}
            >
              Por revisar ({porRevisar.length})
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={vista === 'listas'}
              onClick={() => setVista('listas')}
            >
              Revisadas ({listas.length})
            </button>
          </div>
          {vista === 'por_revisar' && deOz > 0 && (
            <p className="nota">
              {deOz === 1 ? '1 entrega de Contenido espera' : `${deOz} entregas de Contenido esperan`}{' '}
              el visto bueno de Oz.
            </p>
          )}
          {vista === 'por_revisar' &&
            enCurso.map((c) => (
              <article key={c.id} className="entrega entrega-en-curso" aria-busy={!c.fallo}>
                <header>
                  <Retrato rol={c.rol} nombre={c.nombre} />
                  <div>
                    <strong>{c.nombre}</strong>
                    <small>{c.fallo ? 'No se pudo entregar' : 'Escribiendo…'}</small>
                  </div>
                </header>
                <p className="entrega-orden">Orden: «{c.orden}»</p>
                {c.fallo ? (
                  <>
                    <p className="entrega-fallo">{c.fallo}</p>
                    <div className="acciones">
                      <button type="button" className="btn principal" onClick={() => props.onReintentar(c)}>
                        Reintentar
                      </button>
                      <button type="button" className="btn" onClick={() => props.onDescartar(c)}>
                        Descartar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="entrega-texto">{c.texto || '…'}</div>
                )}
              </article>
            ))}
          {visibles.map((e) => (
            <Tarjeta
              key={e.id}
              entrega={e}
              onAprobar={props.onAprobar}
              onRechazar={props.onRechazar}
              onCambios={props.onCambios}
              onBorrar={props.onBorrar}
            />
          ))}
          {visibles.length === 0 && (vista === 'listas' || enCurso.length === 0) && (
            <p className="nota">
              {vista === 'por_revisar'
                ? 'Nada por revisar. Dale una orden a un agente y su trabajo llega aquí.'
                : 'Todavía no hay entregas revisadas.'}
            </p>
          )}
          <p className="nota">
            {compartido
              ? 'Las entregas se guardan en el artefacto: las ve quien tenga acceso, desde cualquier dispositivo.'
              : 'Las entregas se guardan solo en este navegador.'}
          </p>
        </aside>
      )}
    </>
  );
}
