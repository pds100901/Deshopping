import type { Entrega } from './encargo';

/**
 * Dónde viven las entregas. En el artefacto de claude.ai se guardan en su base de datos (`db`):
 * las ven Pau y Oz desde cualquier dispositivo. Fuera del artefacto quedan en este navegador.
 */
export interface Almacen {
  /** `true` si lo guardado se comparte entre personas y dispositivos. */
  compartido: boolean;
  suscribir(alCambiar: (entregas: Entrega[]) => void): () => void;
  guardar(entrega: Entrega): Promise<void>;
  borrar(id: string): Promise<void>;
}

const CLAVE = 'deshopping.entregas.v1';

const esEntrega = (v: unknown): v is Entrega => {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e['id'] === 'string' &&
    typeof e['agenteId'] === 'string' &&
    typeof e['texto'] === 'string' &&
    typeof e['orden'] === 'string' &&
    typeof e['creada'] === 'number'
  );
};

const ordenar = (lista: Entrega[]) => [...lista].sort((a, b) => b.creada - a.creada);

/** Entregas en `localStorage` (o solo en memoria si el navegador no lo permite). */
function almacenLocal(): Almacen {
  let lista: Entrega[] = [];
  try {
    const crudo: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    if (Array.isArray(crudo)) lista = crudo.filter(esEntrega);
  } catch {
    // sin almacenamiento: las entregas duran lo que dure la pestaña
  }
  const oyentes = new Set<(e: Entrega[]) => void>();
  const avisar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      // se queda en memoria
    }
    for (const o of oyentes) o(ordenar(lista));
  };
  return {
    compartido: false,
    suscribir(alCambiar) {
      oyentes.add(alCambiar);
      alCambiar(ordenar(lista));
      return () => oyentes.delete(alCambiar);
    },
    async guardar(entrega) {
      lista = [...lista.filter((e) => e.id !== entrega.id), entrega];
      avisar();
    },
    async borrar(id) {
      lista = lista.filter((e) => e.id !== id);
      avisar();
    },
  };
}

interface Instantanea {
  docs: { id: string; exists: boolean; data(): Record<string, unknown> | undefined }[];
}
interface Coleccion {
  onSnapshot(alDato: (s: Instantanea) => void, alError?: (e: unknown) => void): () => void;
  doc(id: string): { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
}
interface Db {
  collection(ruta: string): Coleccion;
}

/** Entregas en la base de datos del artefacto: una suscripción, compartida por los oyentes. */
function almacenDb(db: Db): Almacen {
  const coleccion = db.collection('entregas');
  const oyentes = new Set<(e: Entrega[]) => void>();
  let ultima: Entrega[] | null = null;
  let cortar: (() => void) | null = null;
  const conectar = () => {
    cortar ??= coleccion.onSnapshot(
      (s) => {
        ultima = ordenar(
          s.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown).filter(esEntrega),
        );
        for (const o of oyentes) o(ultima);
      },
      () => {
        cortar = null;
      },
    );
  };
  return {
    compartido: true,
    suscribir(alCambiar) {
      oyentes.add(alCambiar);
      if (ultima) alCambiar(ultima);
      conectar();
      return () => oyentes.delete(alCambiar);
    },
    async guardar(entrega) {
      // `undefined` no es JSON: se quitan los campos opcionales vacíos.
      await coleccion.doc(entrega.id).set(JSON.parse(JSON.stringify(entrega)) as Record<string, unknown>);
    },
    async borrar(id) {
      await coleccion.doc(id).delete();
    },
  };
}

let abierto: Promise<Almacen> | null = null;

/** El almacén de esta visita: la base del artefacto si está disponible; si no, el navegador. */
export function abrirAlmacen(): Promise<Almacen> {
  abierto ??= (async () => {
    const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
    if (claude) {
      try {
        const db = (await claude.use('db')) as Db | null;
        if (db && typeof db.collection === 'function') return almacenDb(db);
      } catch {
        // sin base de datos: sigue en local
      }
    }
    return almacenLocal();
  })();
  return abierto;
}

export const nuevoId = () =>
  `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
