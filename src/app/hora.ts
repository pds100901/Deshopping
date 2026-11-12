import { horaChile } from '@jules/oficina';

/**
 * Fecha cuya hora en America/Santiago es `hora` (0–24, decimal), tomando como base el día de
 * `ahora`. Sirve para simular la hora con la prop `horaChile` de `<Oficina>`.
 */
export function fechaChileA(hora: number, ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + (hora - horaChile(ahora)) * 3_600_000);
}

/** `14.5` -> `14:30`. */
export function formatearHora(hora: number): string {
  const total = Math.round((((hora % 24) + 24) % 24) * 60) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
