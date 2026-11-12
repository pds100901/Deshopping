import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  aplicarSkin,
  atuendoPorRol,
  catalogoBase,
  crearCatalogo,
  Oficina,
  paqueteFiestasPatrias,
  paqueteHalloween,
  paqueteNavidad,
  plano,
  registrarPaquete,
} from '@jules/oficina';
import type {
  AgenteOficina,
  Atuendo,
  EstadoAgente,
  MetricasRender,
  PaqueteSkins,
  PresenciaJules,
} from '@jules/oficina';
import { Burbuja } from './Burbuja';
import { Detalle } from './Detalle';
import { fechaChileA } from './hora';
import { IndicadorAmbiente } from './IndicadorAmbiente';
import { Leyenda } from './Leyenda';
import { PanelFps } from './PanelFps';
import type { Calidad } from './PanelFps';
import { cargarAmbiente, cargarAtuendos, guardarAmbiente, guardarAtuendos } from './persistencia';
import type { AtuendosGuardados } from './persistencia';
import { armarRoster, CANTIDADES } from './roster';
import { resumir } from './resumen';
import { SelectorAmbiente } from './SelectorAmbiente';
import { SelectorPresencia } from './SelectorPresencia';
import { Vestidor } from './Vestidor';
import './estilos.css';

const paquetes = [paqueteHalloween, paqueteNavidad, paqueteFiestasPatrias];
const catalogo = paquetes.reduce(registrarPaquete, crearCatalogo(catalogoBase));
const idsAmbientes = plano.ambientes.map((a) => a.id);

/** Laboratorio: la oficina a pantalla completa con panel de rendimiento, detalle y vestidor. */
export function Lab() {
  const [cantidad, setCantidad] = useState(CANTIDADES[0] ?? 9);
  const [agentes, setAgentes] = useState(() => armarRoster(cantidad));
  const [atuendos, setAtuendos] = useState<AtuendosGuardados>(cargarAtuendos);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [vestidorAbierto, setVestidorAbierto] = useState(false);
  const [metricas, setMetricas] = useState<MetricasRender>({ webgl: true });
  const [calidad, setCalidad] = useState<Calidad>('auto');
  const [visible, setVisible] = useState(true);
  const [hora, setHora] = useState<number | null>(null);
  const [presencia, setPresencia] = useState<PresenciaJules>('reposo');
  const [nivelVoz, setNivelVoz] = useState<number | undefined>(undefined);
  const [vista, setVista] = useState(0);
  const [ambienteId, setAmbienteId] = useState<string | null>(() => cargarAmbiente(idsAmbientes));

  useEffect(() => guardarAtuendos(atuendos), [atuendos]);
  useEffect(() => guardarAmbiente(ambienteId), [ambienteId]);

  const agentesVista = useMemo<AgenteOficina[]>(
    () => agentes.map((a) => (atuendos[a.id] ? { ...a, atuendo: atuendos[a.id] } : a)),
    [agentes, atuendos],
  );
  const indice = agentes.findIndex((a) => a.id === seleccionadoId);
  const seleccionado = agentes[indice];
  const horaSimulada = useMemo(() => (hora === null ? undefined : fechaChileA(hora)), [hora]);
  const resumen = useMemo(() => resumir(agentes), [agentes]);
  const alMedir = useCallback((m: MetricasRender) => setMetricas(m), []);

  const atuendoBase = (a: AgenteOficina, i: number): Atuendo =>
    atuendos[a.id] ?? atuendoPorRol(a.rol, i);

  const cambiarCantidad = (n: number) => {
    const nuevo = armarRoster(n);
    setCantidad(n);
    setAgentes(nuevo);
    if (!nuevo.some((a) => a.id === seleccionadoId)) {
      setSeleccionadoId(null);
      setVestidorAbierto(false);
    }
  };

  const cambiarEstado = (id: string, estado: EstadoAgente) =>
    setAgentes((prev) => prev.map((a) => (a.id === id ? { ...a, estado } : a)));

  const vestir = (id: string, atuendo: Atuendo) =>
    setAtuendos((prev) => ({ ...prev, [id]: atuendo }));

  const disfrazarATodos = (paquete: PaqueteSkins) => {
    const disfraces = paquete.disfraces ?? [];
    if (disfraces.length === 0) return;
    setAtuendos(
      Object.fromEntries(
        agentes.map((a, i) => [
          a.id,
          aplicarSkin(
            catalogo,
            atuendoPorRol(a.rol, i),
            disfraces[i % disfraces.length]?.atuendo ?? {},
          ),
        ]),
      ),
    );
  };

  const quitarDisfraz = (id: string) =>
    setAtuendos((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([clave]) => clave !== id)),
    );

  const seleccionar = (id: string | null) => {
    setSeleccionadoId(id);
    if (id === null) setVestidorAbierto(false);
  };

  return (
    <div className={vestidorAbierto ? 'lab con-vestidor' : 'lab'}>
      <div className="escena">
        <Oficina
          agentes={agentesVista}
          catalogo={catalogo}
          seleccionadoId={seleccionadoId}
          onSeleccionar={seleccionar}
          onMetricas={alMedir}
          visible={visible}
          calidad={calidad}
          horaChile={horaSimulada}
          enfocadoId={vestidorAbierto ? seleccionadoId : null}
          ambienteId={ambienteId}
          onAmbiente={setAmbienteId}
          vistaGeneral={vista}
          presenciaJules={presencia}
          nivelVozJules={nivelVoz}
        />
      </div>
      <Burbuja resumen={resumen} />
      <PanelFps
        metricas={metricas}
        cantidades={CANTIDADES}
        cantidad={cantidad}
        onCantidad={cambiarCantidad}
        calidad={calidad}
        onCalidad={setCalidad}
        visible={visible}
        onVisible={setVisible}
        hora={hora}
        onHora={setHora}
      >
        <SelectorAmbiente ambienteId={ambienteId} onAmbiente={setAmbienteId} />
        <SelectorPresencia
          presencia={presencia}
          onPresencia={setPresencia}
          nivelVoz={nivelVoz}
          onNivelVoz={setNivelVoz}
        />
      </PanelFps>
      <Leyenda />
      <IndicadorAmbiente
        ambienteId={ambienteId}
        onSalir={() => setAmbienteId(null)}
        onVistaGeneral={() => {
          setAmbienteId(null);
          setVista((v) => v + 1);
        }}
      />
      <Detalle
        agente={seleccionado}
        onEstado={cambiarEstado}
        onVestir={() => setVestidorAbierto(true)}
      />
      {vestidorAbierto && seleccionado && (
        <Vestidor
          catalogo={catalogo}
          agente={seleccionado}
          atuendo={aplicarSkin(catalogo, atuendoBase(seleccionado, indice), {})}
          onCambiar={(a) => vestir(seleccionado.id, a)}
          paquetes={paquetes}
          onTodosDisfrazados={disfrazarATodos}
          onQuitarDisfraz={() => quitarDisfraz(seleccionado.id)}
          onCerrar={() => setVestidorAbierto(false)}
        />
      )}
    </div>
  );
}
