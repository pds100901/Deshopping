export type NombreSfx = 'transicion' | 'saludo' | 'orden';

/**
 * Ganancia de cada efecto (0–1) respecto de su archivo. La voz de Jules va a 1: los efectos
 * quedan bien por debajo para no taparla (regla de mezcla: la voz es la protagonista).
 */
export const VOLUMEN_SFX: Record<NombreSfx, number> = {
  transicion: 0.25,
  saludo: 0.35,
  orden: 0.45,
};

/** Segundos después de enfocar a un agente en que se oye su saludo (el gesto no emite evento). */
export const RETRASO_SALUDO_MS = 300;

const NOMBRES = Object.keys(VOLUMEN_SFX) as NombreSfx[];

interface NodoFuente {
  buffer: unknown;
  connect(destino: unknown): unknown;
  start(): void;
  stop(): void;
  onended: ((...args: never[]) => void) | null;
}
interface NodoGanancia {
  gain: { value: number };
  connect(destino: unknown): unknown;
}
/** Lo mínimo de `AudioContext` que usan los efectos (permite probarlo con un doble). */
export interface ContextoSfx {
  destination: unknown;
  decodeAudioData(datos: ArrayBuffer): Promise<unknown>;
  createGain(): NodoGanancia;
  createBufferSource(): NodoFuente;
}

export interface Sfx {
  /** Decodifica los efectos con el contexto de audio (tras el primer gesto del usuario). */
  preparar(ctx: ContextoSfx): void;
  sonar(nombre: NombreSfx, retrasoMs?: number): void;
  /** Corta lo que suena y cancela lo que estaba por sonar (pausa, reinicio). */
  detener(): void;
}

/**
 * Efectos de sonido por Web Audio (el volumen de `HTMLAudioElement` no cuenta en iOS). Van
 * directo al destino, no al analizador: no deben mover la boca de Jules.
 */
export function crearSfx(cargar: (nombre: NombreSfx) => Promise<ArrayBuffer>): Sfx {
  let ctx: ContextoSfx | null = null;
  const buffers = new Map<NombreSfx, Promise<unknown>>();
  const activos = new Set<NodoFuente>();
  const pendientes = new Set<ReturnType<typeof setTimeout>>();
  let generacion = 0;

  const reproducir = async (nombre: NombreSfx) => {
    const mia = generacion;
    const buffer = await buffers.get(nombre);
    if (!ctx || !buffer || mia !== generacion) return;
    const fuente = ctx.createBufferSource();
    const ganancia = ctx.createGain();
    ganancia.gain.value = VOLUMEN_SFX[nombre];
    fuente.buffer = buffer;
    fuente.connect(ganancia);
    ganancia.connect(ctx.destination);
    fuente.onended = () => activos.delete(fuente);
    activos.add(fuente);
    fuente.start();
  };

  return {
    preparar(contexto) {
      if (ctx) return;
      ctx = contexto;
      for (const n of NOMBRES) {
        buffers.set(
          n,
          cargar(n)
            .then((b) => contexto.decodeAudioData(b))
            .catch(() => null), // sin el efecto la presentación sigue, solo sin ese sonido
        );
      }
    },
    sonar(nombre, retrasoMs = 0) {
      if (!ctx) return;
      if (retrasoMs <= 0) {
        void reproducir(nombre);
        return;
      }
      const t = setTimeout(() => {
        pendientes.delete(t);
        void reproducir(nombre);
      }, retrasoMs);
      pendientes.add(t);
    },
    detener() {
      generacion++;
      for (const t of pendientes) clearTimeout(t);
      pendientes.clear();
      for (const f of activos) {
        try {
          f.stop();
        } catch {
          // ya terminó
        }
      }
      activos.clear();
    },
  };
}
