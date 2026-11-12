import { personajeDe } from './personajes';

const BASE = import.meta.env.BASE_URL;

/** Retrato del personaje: su ilustración si ya tiene hoja, o su inicial sobre su color. */
export function Retrato({ rol, nombre }: { rol: string; nombre: string }) {
  const personaje = personajeDe(rol);
  if (!personaje) return null;
  if (personaje.retrato) {
    return <img className="retrato" src={`${BASE}${personaje.retrato}`} alt="" />;
  }
  return (
    <span className="retrato retrato-inicial" style={{ background: personaje.color }} aria-hidden="true">
      {nombre.slice(0, 1)}
    </span>
  );
}
