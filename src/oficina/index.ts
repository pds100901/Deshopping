export type {
  Actividad,
  AgenteOficina,
  Atuendo,
  AtuendoResuelto,
  Catalogo,
  Departamento,
  Disfraz,
  EstadoAgente,
  MetricasRender,
  Opcion,
  PaqueteSkins,
  Pieza,
  Zona,
} from './tipos';
export { catalogoBase } from './catalogo/base';
export { paqueteFiestasPatrias } from './catalogo/fiestas-patrias';
export { paqueteHalloween } from './catalogo/halloween';
export { paqueteNavidad } from './catalogo/navidad';
export { crearCatalogo, registrarPaquete } from './catalogo/registro';
export { alternarPieza, aplicarSkin, resolverAtuendo } from './vestuario/resolver';
export { atuendoPorRol } from './vestuario/roles';
export { horaChile, luzDelDia } from './ambiente/hora';
export type { PresenciaJules } from './animacion/presencia';
export { frameloopPara } from './rendimiento/visibilidad';
export { plano } from './mansion/plano';
export type { Ambiente } from './mansion/plano';
export { departamentosBase } from './render/layout';
export { Oficina } from './render/Oficina';
export type { OficinaProps, Proyector, PuntoPantalla } from './render/Oficina';
