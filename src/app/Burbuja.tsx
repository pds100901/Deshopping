import type { Resumen } from './resumen';

/** Marca y burbuja de Jules: resumen de la oficina y qué decisiones esperan. */
export function Burbuja({ resumen }: { resumen: Resumen }) {
  const { linea, mensaje } = resumen;
  return (
    <header className="hud burbuja" aria-live="polite">
      <h1>
        <span className="orbe" aria-hidden="true" />
        De Shopping con Pau
      </h1>
      <p className="burbuja-resumen">{linea}</p>
      <p className="burbuja-mensaje">
        {mensaje.negrita && <b>{mensaje.negrita}</b>}
        {mensaje.resto}
      </p>
    </header>
  );
}
