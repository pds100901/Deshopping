import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgenteOficina } from '@jules/oficina';
import { abrirAlmacen, nuevoId } from './almacen';
import type { Almacen } from './almacen';
import type { EnCurso } from './BandejaEntregas';
import { quienAprueba } from './encargo';
import type { Entrega } from './encargo';
import { EXPLICACION, producir } from './motor';

/** Lo que le pasa a un agente por su entrega; la pantalla lo traduce a su estado en la casa. */
export type Novedad =
  | { tipo: 'escribiendo'; orden: string }
  | { tipo: 'lista'; orden: string; aprueba: string }
  | { tipo: 'aprobada'; orden: string; aprueba: string }
  | { tipo: 'rechazada'; orden: string }
  | { tipo: 'fallo'; orden: string };

interface Pedido {
  agenteId: string;
  nombre: string;
  rol: string;
  departamento: string;
  orden: string;
  /** Entrega que se rehace (pedido de cambios). */
  base?: Entrega;
  nota?: string;
}

/**
 * El trabajo real de la oficina: encarga entregas al modelo, las guarda y lleva su revisión.
 * `alNovedad` avisa qué le pasó a cada agente.
 */
export function useTrabajo(alNovedad: (agenteId: string, novedad: Novedad) => void) {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [enCurso, setEnCurso] = useState<EnCurso[]>([]);
  const [compartido, setCompartido] = useState(false);
  const almacen = useRef<Almacen | null>(null);
  const pedidos = useRef(new Map<string, Pedido>());
  const controles = useRef(new Map<string, AbortController>());
  const avisar = useRef(alNovedad);
  avisar.current = alNovedad;

  useEffect(() => {
    let vivo = true;
    let cortar: (() => void) | undefined;
    void abrirAlmacen().then((a) => {
      if (!vivo) return;
      almacen.current = a;
      setCompartido(a.compartido);
      cortar = a.suscribir((lista) => vivo && setEntregas(lista));
    });
    const enMarcha = controles.current;
    return () => {
      vivo = false;
      cortar?.();
      for (const c of enMarcha.values()) c.abort();
    };
  }, []);

  const guardar = useCallback(async (entrega: Entrega) => {
    const a = almacen.current ?? (await abrirAlmacen());
    try {
      await a.guardar(entrega);
      return true;
    } catch {
      return false;
    }
  }, []);

  const correr = useCallback(
    (id: string, pedido: Pedido) => {
      pedidos.current.set(id, pedido);
      const control = new AbortController();
      controles.current.set(id, control);
      const base = { id, agenteId: pedido.agenteId, nombre: pedido.nombre, rol: pedido.rol, orden: pedido.orden };
      setEnCurso((prev) => [{ ...base, texto: '', fallo: null }, ...prev.filter((c) => c.id !== id)]);
      avisar.current(pedido.agenteId, { tipo: 'escribiendo', orden: pedido.orden });
      const fallar = (fallo: string) => {
        setEnCurso((prev) => prev.map((c) => (c.id === id ? { ...c, fallo } : c)));
        avisar.current(pedido.agenteId, { tipo: 'fallo', orden: pedido.orden });
      };
      void producir(
        {
          nombre: pedido.nombre,
          rol: pedido.rol,
          orden: pedido.orden,
          ...(pedido.base && pedido.nota ? { nota: pedido.nota, previo: pedido.base.texto } : {}),
        },
        control.signal,
        (texto) => setEnCurso((prev) => prev.map((c) => (c.id === id ? { ...c, texto } : c))),
      ).then(async (resultado) => {
        controles.current.delete(id);
        if (control.signal.aborted) return;
        if ('motivo' in resultado) return fallar(EXPLICACION[resultado.motivo]);
        const aprueba = quienAprueba(pedido.departamento);
        const entrega: Entrega = {
          id: pedido.base?.id ?? id,
          agenteId: pedido.agenteId,
          nombre: pedido.nombre,
          rol: pedido.rol,
          departamento: pedido.departamento,
          orden: pedido.orden,
          texto: resultado.texto,
          estado: 'por_revisar',
          aprueba,
          version: (pedido.base?.version ?? 0) + 1,
          ...(pedido.nota ? { nota: pedido.nota } : {}),
          creada: Date.now(),
        };
        if (!(await guardar(entrega))) return fallar('La entrega se escribió pero no se pudo guardar.');
        pedidos.current.delete(id);
        setEnCurso((prev) => prev.filter((c) => c.id !== id));
        avisar.current(pedido.agenteId, { tipo: 'lista', orden: pedido.orden, aprueba });
      });
    },
    [guardar],
  );

  const encargar = useCallback(
    (agente: AgenteOficina, orden: string) =>
      correr(nuevoId(), {
        agenteId: agente.id,
        nombre: agente.nombre,
        rol: agente.rol,
        departamento: agente.departamento,
        orden: orden.trim(),
      }),
    [correr],
  );

  const revisar = useCallback(
    async (entrega: Entrega, estado: 'aprobada' | 'rechazada') => {
      if (!(await guardar({ ...entrega, estado, revisada: Date.now() }))) return;
      avisar.current(
        entrega.agenteId,
        estado === 'aprobada'
          ? { tipo: 'aprobada', orden: entrega.orden, aprueba: entrega.aprueba }
          : { tipo: 'rechazada', orden: entrega.orden },
      );
    },
    [guardar],
  );

  return {
    entregas,
    enCurso,
    compartido,
    encargar,
    aprobar: (e: Entrega) => void revisar(e, 'aprobada'),
    rechazar: (e: Entrega) => void revisar(e, 'rechazada'),
    pedirCambios: (e: Entrega, nota: string) =>
      correr(nuevoId(), {
        agenteId: e.agenteId,
        nombre: e.nombre,
        rol: e.rol,
        departamento: e.departamento,
        orden: e.orden,
        base: e,
        nota,
      }),
    borrar: (e: Entrega) => void (almacen.current?.borrar(e.id).catch(() => undefined)),
    reintentar: (c: EnCurso) => {
      const pedido = pedidos.current.get(c.id);
      if (pedido) correr(c.id, pedido);
    },
    descartar: (c: EnCurso) => {
      controles.current.get(c.id)?.abort();
      pedidos.current.delete(c.id);
      setEnCurso((prev) => prev.filter((x) => x.id !== c.id));
    },
  };
}
