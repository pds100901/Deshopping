import { artefactosDe } from './artefactos';

/** Enlaces a los artefactos con los que trabaja un rol; no muestra nada si no tiene. */
export function EnlacesArtefactos({ rol }: { rol: string }) {
  const artefactos = artefactosDe(rol);
  if (artefactos.length === 0) return null;
  return (
    <div className="artefactos" role="group" aria-label="Artefactos de este agente">
      {artefactos.map((a) => (
        <a key={a.url} className="artefacto" href={a.url} target="_blank" rel="noreferrer">
          {a.titulo} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}
