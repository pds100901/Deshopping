import { useEffect, useState } from 'react';
import type { RotuloAgente } from './rotulos';

/** Duración de la salida de un rótulo: igual a la animación CSS `pres-rotulo-sale`. */
const SALIDA_MS = 380;

/**
 * Mantiene el último valor en pantalla mientras corre la animación de salida. `valor` debe ser
 * estable entre renders (string o un objeto memoizado), o el efecto se repite en cada render.
 */
function useSalida<T>(valor: T | null) {
  const [mostrado, setMostrado] = useState<T | null>(valor);
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => {
    if (valor !== null) {
      setMostrado(valor);
      setSaliendo(false);
      return;
    }
    if (mostrado === null) return;
    setSaliendo(true);
    const t = window.setTimeout(() => {
      setMostrado(null);
      setSaliendo(false);
    }, SALIDA_MS);
    return () => window.clearTimeout(t);
  }, [valor, mostrado]);
  return { mostrado, saliendo };
}

/** Rótulo de sala arriba a la izquierda: «Piso 3 · Desarrollo». */
export function RotuloSala({ texto }: { texto: string | null }) {
  const { mostrado, saliendo } = useSalida(texto);
  if (mostrado === null) return null;
  return (
    <p
      className={saliendo ? 'pres-rotulo pres-rotulo-sala sale' : 'pres-rotulo pres-rotulo-sala'}
      key={mostrado}
    >
      {mostrado}
    </p>
  );
}

/** Rótulo del agente enfocado abajo a la izquierda: nombre grande, rol y una línea de lo que hace. */
export function RotuloDeAgente({ rotulo }: { rotulo: RotuloAgente | null }) {
  const { mostrado, saliendo } = useSalida(rotulo);
  if (mostrado === null) return null;
  return (
    <div
      className={
        saliendo ? 'pres-rotulo pres-rotulo-agente sale' : 'pres-rotulo pres-rotulo-agente'
      }
      key={mostrado.nombre}
    >
      <b>{mostrado.nombre}</b>
      <em>{mostrado.rol}</em>
      {mostrado.linea && <span>{mostrado.linea}</span>}
    </div>
  );
}

/** Rótulo fijo de todo el video, arriba al centro: el choque «19 ayudantes / 0 humanas». */
export function RotuloFijo() {
  return (
    <div className="pres-fijo" role="note">
      <b>
        19 ayudantes / <i>0</i> humanas
      </b>
      <span>La oficina de De Shopping con Pau</span>
    </div>
  );
}
