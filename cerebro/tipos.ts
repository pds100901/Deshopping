/**
 * Contrato público de `@jules/cerebro`.
 *
 * Todo lo que entra aquí ya viene estructurado: la percepción (Haiku, pgvector,
 * lector en cuarentena) vive fuera del paquete y entrega datos con estos tipos.
 * El cerebro es lógica pura: sin I/O, sin red, sin `Date.now()`; `ahora` siempre
 * llega por parámetro. Ver `docs/cerebro/adr/0001-logica-pura-sin-modelo.md`.
 */

import type { Memoria } from './memoria/tipos';

// ───────────────────────── Pedido y procedencia ─────────────────────────

export type Canal = 'voz' | 'texto' | 'whatsapp' | 'correo' | 'sistema';

/** Quién origina el pedido. `tercero` nunca da órdenes (ADR-0003). */
export type Procedencia = 'elkis' | 'tercero' | 'sistema';

/** Niveles de riesgo de `bases-del-core.md` 7.4. */
export type NivelRiesgo = 0 | 1 | 2 | 3;

/** Factor exigido por nivel: 0 sesión, 1 voz, 2 Face ID reciente, 3 firma (ADR-0002). */
export type Factor = 'sesion' | 'voz' | 'face_id' | 'firma';

export type SiFaltaFactor = 'nada' | 'enmascarar' | 'confirmar_toque' | 'face_id' | 'no_ejecutar';

/** Clases de acción agrupadas por el nivel que exigen (7.4). */
export type ClaseDeAccion =
  // nivel 0: observar
  | 'observar'
  | 'consultar'
  | 'filtrar'
  | 'fijar'
  // nivel 1: bajo
  | 'consultar_sensible'
  | 'guardar_preferencia'
  | 'crear_pendiente'
  | 'mover_evento_propio'
  | 'confirmar_hecho'
  // nivel 2: medio
  | 'lanzar_agente'
  | 'crear_borrador'
  | 'borrar_pendiente'
  | 'cambiar_rutina'
  | 'desplegar_preview'
  // nivel 3: crítico
  | 'enviar'
  | 'pagar'
  | 'desplegar_produccion'
  | 'push_main'
  | 'borrar_datos'
  | 'cambiar_permisos'
  | 'cambiar_identidad'
  | 'mostrar_credenciales'
  | 'contactar_nuevo';

export type Departamento =
  'desarrollo' | 'ventas' | 'contenido' | 'finanzas' | 'personal' | 'investigacion';

export interface Remitente {
  id: string;
  nombre?: string;
  /** Solo los remitentes de la allowlist generan tickets. */
  enAllowlist: boolean;
  organizacion?: string;
}

export type ValorDeParametro = string | number | boolean;

/** Intención ya normalizada (por Haiku o por `clasificarIntencion`). */
export interface Intencion {
  canonica: string;
  clase: ClaseDeAccion;
  parametros: Record<string, ValorDeParametro>;
  temas: string[];
  /** Presente cuando la clase es `lanzar_agente`. */
  departamento?: Departamento;
  /** 0..1; el clasificador determinista da 1 si reconoce, 0.5 si adivina. */
  confianza: number;
}

export interface Pedido {
  id: string;
  texto: string;
  canal: Canal;
  procedencia: Procedencia;
  /** Obligatorio cuando `procedencia === 'tercero'`. */
  remitente?: Remitente;
  /** Si falta, `decidir` usa `clasificarIntencion(texto)`. */
  intencion?: Intencion;
  /** Algún parámetro deriva de contenido ajeno → sube un nivel (7.4). */
  parametrosDeTercero?: boolean;
  /** Pedido que continúa un ticket de tercero. */
  ticketId?: string;
}

// ───────────────────────── Contexto ─────────────────────────

export interface FirmaPresente {
  solicitudId: string;
  hash: string;
  verificadaEn: string;
}

export interface EstadoDeSesion {
  /** Sesión viva con passkey (AAL2) en un dispositivo enrolado. */
  passkeyViva: boolean;
  dispositivoEnrolado: boolean;
  /** Segundos desde el último Face ID local; nivel 2 exige ≤ `faceIdMaxSegundos`. */
  faceIdHaceSegundos?: number;
  /** Red o ubicación nueva → re-autenticación. */
  redNueva?: boolean;
  /** Firma WebAuthn ya verificada por el núcleo para una solicitud concreta. */
  firma?: FirmaPresente;
}

/** Reconocimiento de hablante: factor blando (7.3). */
export interface SenalDeVoz {
  /** Similitud 0..1 con la voz enrolada de quien manda. */
  puntaje: number;
  /** Señal de voz sintética: degrada, nunca sube. */
  sintetico: boolean;
}

export type EstadoDeAnimo = 'neutral' | 'enojado' | 'triste' | 'cansado';

export type Area = 'general' | 'meditacion' | 'oficina' | 'plata' | 'cuerpo' | 'revision';

export type Registro = 'sarcasmo' | 'calmado' | 'con_terceros' | 'aprobacion_critica' | 'serio';

/** Coincidencia calculada fuera (pgvector). Si falta, se usa `emparejarPorTokens`. */
export interface Coincidencia {
  rutaId: string;
  similitud: number;
  parametros?: Record<string, ValorDeParametro>;
}

export interface Contexto {
  /** ISO 8601. Nunca se usa `Date.now()` dentro del paquete. */
  ahora: string;
  sesion: EstadoDeSesion;
  voz?: SenalDeVoz;
  animo?: EstadoDeAnimo;
  area?: Area;
  modoSerio?: boolean;
  /** Alguien más en la sala o en el hilo. */
  tercerosPresentes?: boolean;
  /** El pedido habla sobre personas reales (clientes, equipo, familia). */
  sobreTerceros?: boolean;
  rutas: Ruta[];
  umbrales?: Partial<Umbrales>;
  accionesCriticasUltimaHora?: number;
  coincidencias?: Coincidencia[];
  /** Memoria semántica (hechos y preferencias); alimenta el prompt y las preferencias de presentación. */
  memoria?: Memoria;
}

// ───────────────────────── Umbrales ─────────────────────────

export interface Umbrales {
  vozMinima: number;
  faceIdMaxSegundos: number;
  similitudReceta: number;
  similitudCandidata: number;
  repeticionesParaReceta: number;
  ventanaDiasParaReceta: number;
  estabilidadMinima: number;
  usosPorSemanaParaCaliente: number;
  repeticionesParaVista: number;
  fallosMaximos: number;
  semanasSinUsoParaEnfriar: number;
  diasParaArchivar: number;
  horasParaActivarSola: number;
  multiploDeTtlParaFrescura: number;
  accionesCriticasPorHoraMax: number;
  aprobacionExpiraSegundos: number;
  resumenCuarentenaMax: number;
  itemsMaxBoletin: number;
  maxFrasesPorVoz: number;
}

// ───────────────────────── Decisión ─────────────────────────

export interface TrabajoPlantilla {
  tipo: string;
  parametros: Record<string, ValorDeParametro>;
  /** Siempre en un worktree aislado. */
  worktree: true;
  /** Nunca con secretos de producción. */
  secretosDeProduccion: false;
  /** Nunca pushea; subir es una aprobación de nivel 3 aparte. */
  puedePushear: false;
  herramientasPermitidas: string[];
  presupuestoUsd: number;
  procedencia: Procedencia;
  ticketId?: string;
}

export interface MiembroDeEquipo {
  perfilId: string;
  instancia: number;
}

/** Solicitud canónica de aprobación crítica (7.5): lo que se ve es lo que se firma. */
export interface SolicitudDeAprobacion {
  id: string;
  tipo: ClaseDeAccion;
  resumenFijo: string;
  destinatario?: string;
  monto?: number;
  hashDelContenido?: string;
  procedencia: Procedencia;
  ticketId?: string;
  creada: string;
  /** ≤ `aprobacionExpiraSegundos` después de `creada`. */
  expira: string;
  /** JSON canónico (claves ordenadas) de los campos anteriores. */
  canonico: string;
  /** SHA-256 hex de `canonico`; es el `challenge` de WebAuthn. */
  hash: string;
}

export type TipoDeEventoDeSeguridad =
  | 'inyeccion_sospechada'
  | 'voz_sintetica'
  | 'voz_no_reconocida'
  | 'remitente_fuera_de_allowlist'
  | 'rafaga_de_acciones_criticas'
  | 'red_nueva'
  | 'receta_alterada'
  | 'esquema_invalido'
  | 'factor_insuficiente';

export interface EventoDeSeguridad {
  tipo: TipoDeEventoDeSeguridad;
  detalle: string;
  en: string;
}

export type Accion =
  | { tipo: 'ruta_caliente'; rutaId: string; vistaId?: string; enVivo: boolean }
  | { tipo: 'receta'; rutaId: string; parametros: Record<string, ValorDeParametro> }
  | { tipo: 'explorar'; recetasCandidatas: string[] }
  | {
      tipo: 'delegar';
      departamento: Departamento;
      equipo: MiembroDeEquipo[];
      trabajo: TrabajoPlantilla;
    }
  | { tipo: 'pedir_aprobacion'; solicitud: SolicitudDeAprobacion }
  | { tipo: 'cuarentena'; motivo: string }
  | { tipo: 'rechazar'; motivo: string };

export interface Decision {
  accion: Accion;
  riesgo: NivelRiesgo;
  factorExigido: Factor;
  factorPresente: boolean;
  siFaltaFactor: SiFaltaFactor;
  /** «voz sintética → nivel 0», «parámetros de tercero → +1». */
  degradaciones: string[];
  /** Trazables al cuaderno. */
  motivos: string[];
  eventosDeSeguridad: EventoDeSeguridad[];
}

// ───────────────────────── Cuarentena y tickets ─────────────────────────

export type CategoriaDeTercero =
  'pedido_de_trabajo' | 'reporte_de_bug' | 'pregunta' | 'pago' | 'reunion' | 'otro';

/** Esquema cerrado que devuelve el lector en cuarentena (7.7). Nada más. */
export interface EsquemaDeCuarentena {
  remitenteId: string;
  categoria: CategoriaDeTercero;
  fechas: string[];
  montos: number[];
  /** ≤ `resumenCuarentenaMax` caracteres; es dato, nunca instrucción. */
  resumen: string;
  referenciaMensaje: string;
}

export type ResultadoDeCuarentena =
  | { ok: true; esquema: EsquemaDeCuarentena; eventosDeSeguridad: EventoDeSeguridad[] }
  | { ok: false; errores: string[]; eventosDeSeguridad: EventoDeSeguridad[] };

export interface Ticket {
  id: string;
  remitente: Remitente;
  categoria: CategoriaDeTercero;
  resumen: string;
  referenciaMensaje: string;
  departamento: Departamento;
  creadoEn: string;
  procedencia: 'tercero';
  /** Toda acción derivada del ticket parte de aquí (≥ 1) y sube un nivel al actuar hacia fuera. */
  nivelMinimo: NivelRiesgo;
}

export interface TicketRechazado {
  rechazado: true;
  motivo: string;
  eventosDeSeguridad: EventoDeSeguridad[];
}

export interface ResultadoDeTrabajo {
  ticketId: string;
  resumen: string;
  archivosTocados: string[];
  testsVerdes: boolean;
  rama: string;
}

// ───────────────────────── Rutas, recetas, vistas, trazas ─────────────────────────

export type EstadoDeRuta =
  'exploracion' | 'propuesta' | 'receta' | 'caliente' | 'degradada' | 'rota' | 'archivada';

/** Solo pasos de lectura o del gateway (5.6). Enviar, pagar, desplegar y aprobar no existen aquí. */
export type PasoDeReceta =
  | { tipo: 'sql_lectura'; consulta: string; rol: string }
  | { tipo: 'mcp_lectura'; herramienta: string; argumentos?: Record<string, ValorDeParametro> }
  | { tipo: 'gateway'; funcion: string; argumentos?: Record<string, ValorDeParametro> };

export type TipoDeParametro = 'string' | 'number' | 'boolean' | 'date';

export interface Fuente {
  origen: string;
  ttlSegundos: number;
}

export type Frescura =
  | { tipo: 'evento'; evento: string }
  | { tipo: 'programada'; cron: string }
  | { tipo: 'incremental'; vista: string };

export interface Receta {
  intencion: { canonica: string; ejemplos: string[] };
  parametros: Record<string, TipoDeParametro>;
  pasos: PasoDeReceta[];
  fuentes: Fuente[];
  frescura: Frescura;
  /** Nivel heredado del mínimo observado en la exploración; nunca mayor. */
  permisoMaximo: NivelRiesgo;
  superficiePorDefecto?: string;
  temas: string[];
  version: number;
  /** Ids de trazas que la respaldan. */
  evidencia: string[];
  /** Hash del contenido; una receta alterada no corre. */
  hash: string;
}

export interface MetricasDeRuta {
  usos7d: number;
  usos14d: number;
  usosTotales: number;
  fallos: number;
  latenciaMedianaMs: number;
  costoDiarioUsd: number;
  ultimoUso?: string;
  /** Cuándo se refrescó el estado precomputado (rutas calientes). */
  actualizadoEn?: string;
}

export interface Ruta {
  id: string;
  estado: EstadoDeRuta;
  receta?: Receta;
  metricas: MetricasDeRuta;
  creadaEn: string;
  origen: 'aprendida' | 'humana';
  fijadaPorElkis?: boolean;
  /** Esquema, versión de MCP o permiso cambiados → rota. */
  fuenteCambiada?: boolean;
}

export interface Vista {
  id: string;
  rutaId: string;
  version: number;
  /** Spec de UI: lo define `@jules/catalogo` (`SpecJules`); aquí no se redefine. */
  spec: unknown;
  variantes: string[];
  predeterminada?: string;
  /** Veces que se eligió cada variante; 3 elecciones → predeterminada. */
  elecciones: Record<string, number>;
}

export interface Traza {
  id: string;
  pedidoId: string;
  /** Texto original del pedido; alimenta los `ejemplos` de la receta destilada. */
  texto?: string;
  intencionCanonica: string;
  clase: ClaseDeAccion;
  tipoDeSuperficie?: string;
  herramientas: string[];
  parametros: Record<string, ValorDeParametro>;
  rutaUsada: 'caliente' | 'receta' | 'exploracion';
  rutaId?: string;
  latenciaMs: number;
  costoUsd: number;
  corregido: boolean;
  fallo: boolean;
  nivelObservado: NivelRiesgo;
  temas: string[];
  /** Si el dato estaba dentro de su TTL al responder. */
  dentroDeTtl?: boolean;
  en: string;
}

// ───────────────────────── Evolución ─────────────────────────

export type TipoDePropuesta =
  | 'promover_a_receta'
  | 'promover_a_caliente'
  | 'consolidar_vista'
  | 'degradar'
  | 'retirar'
  | 'corregir';

export type EstadoDePropuesta =
  'pendiente' | 'aprobada' | 'ajustada' | 'rechazada' | 'activada_sola';

export interface Propuesta {
  id: string;
  tipo: TipoDePropuesta;
  rutaId?: string;
  intencionCanonica: string;
  evidencia: string[];
  nivel: NivelRiesgo;
  soloLectura: boolean;
  creadaEn: string;
  estado: EstadoDePropuesta;
  /** «Te hice esta ruta pensando en lo que me pediste…» */
  mensajeParaElkis: string;
  ajuste?: Record<string, unknown>;
  receta?: Receta;
}

export type DecisionDeElkis =
  | { tipo: 'aprobar' }
  | { tipo: 'ajustar'; ajuste: Record<string, unknown> }
  | { tipo: 'rechazar'; motivo?: string };

export interface Transicion {
  de: EstadoDeRuta;
  a: EstadoDeRuta;
  motivo: string;
}

export interface ValidacionDeReceta {
  valida: boolean;
  errores: string[];
}

export type TipoDeRutaUsada = Traza['rutaUsada'];

export interface Metricas {
  rutasConsolidadas: { recetas: number; calientes: number; vistasConVariante: number };
  /** Fracción 0..1 de pedidos por tipo. */
  tasaDeRuta: Record<TipoDeRutaUsada, number>;
  latenciaMedianaMs: Record<TipoDeRutaUsada, number | null>;
  costo: {
    porPedidoUsd: Record<TipoDeRutaUsada, number | null>;
    mantenerCalientesPorDiaUsd: number;
  };
  /** Fracción de respuestas dentro de su TTL; null si no hay datos. */
  frescuraCumplida: number | null;
  correcciones: number;
  /** Etapa de vida calculada (6.3), nunca otorgada. */
  etapa: 0 | 1 | 2 | 3 | 4;
}

// ───────────────────────── Perfiles ─────────────────────────

export interface PerfilGeneral {
  tipo: 'general';
  id: string;
  nombre: string;
  clonable: false;
  departamento: Departamento;
  /** Lee contenido ajeno: sin envío ni escritura en memoria confirmada. */
  cuarentena: boolean;
  puedeEnviar: boolean;
  puedeEscribirMemoriaConfirmada: boolean;
  herramientas: string[];
}

export interface PerfilDeRol {
  tipo: 'rol';
  id: string;
  nombre: string;
  clonable: true;
  departamento: Departamento;
  maxInstancias: number;
  herramientas: string[];
}

export type Perfil = PerfilGeneral | PerfilDeRol;

export interface SolicitudDeEquipo {
  perfilId: string;
  instancias: number;
}

export type AreaDelCientifico =
  | 'entrenamiento'
  | 'sueno'
  | 'finanzas'
  | 'agentes'
  | 'ingenieria_de_interfaces'
  | 'modelos_nuevos'
  | 'noticias_tech';

export type NivelDeEvidencia =
  | 'metaanalisis'
  | 'ensayo_controlado'
  | 'cohorte'
  | 'caso'
  | 'opinion'
  | 'documentacion_oficial'
  | 'preprint';

export interface ItemDeBoletin {
  queCambio: string;
  nivelDeEvidencia: NivelDeEvidencia;
  queSignifica: string;
  /** Obligatoria; sin primaria el ítem no entra. */
  fuentePrimaria: string;
  /** YYYY-MM-DD de la publicación o del cambio. */
  fecha?: string;
  tema: string;
  cambiaDecision: boolean;
}

export interface Boletin {
  id: string;
  fecha: string;
  items: ItemDeBoletin[];
}

export interface ValidacionDeBoletin {
  valido: boolean;
  errores: string[];
}

export interface ItemDeInvestigacion {
  id: string;
  origen: 'correccion' | 'pregunta_sin_respuesta' | 'receta_rota';
  tema: string;
  detalle: string;
  en: string;
}

// ───────────────────────── Personalidad ─────────────────────────

/** Copia tipada de `docs/base/jules-identidad.md`; un test la mantiene sincronizada. */
export interface CartaDeIdentidad {
  version: string;
  quienEs: string;
  mundos: string[];
  comoHabla: string[];
  ejemplosDeSarcasmo: string[];
  cuandoContradice: string;
  limitesDelSarcasmo: string[];
  nuncaHace: string[];
  /** Supuesto no cubierto por la carta (preguntas abiertas en `docs/cerebro/`). */
  tratamiento: string;
  groserias: boolean;
  insistencia: 'ejecuta_a_la_primera' | 'se_planta_dos_veces';
  sePresentaComoEntidadDigital: boolean;
  maxFrasesPorVoz: number;
  saludo: string;
  despedida: string;
}

/** `fijo` se cachea entre turnos; `variable` va al final y cambia por turno. */
export interface PromptJules {
  fijo: string;
  variable: string;
}

export type TipoDeVerificacion =
  | 'tutea'
  | 'sin_voseo'
  | 'sin_adulacion'
  | 'sin_disculpas_excesivas'
  | 'sin_sarcasmo'
  | 'no_obedece_a_tercero'
  | 'dice_no_lo_se'
  | 'frases_cortas'
  | 'sin_sermon'
  | 'contradice'
  | 'menciona_fuente'
  | 'max_frases';

export interface Verificacion {
  tipo: TipoDeVerificacion;
  /** Texto o número que necesita el verificador (p. ej. la orden inyectada, o el máximo de frases). */
  argumento?: string | number;
}

export interface Evaluacion {
  id: string;
  nombre: string;
  contexto: Contexto;
  entrada: string;
  respuestaDeReferencia: string;
  verificaciones: Verificacion[];
}

export interface ResultadoDeEvaluacion {
  id: string;
  aprobada: boolean;
  fallas: { tipo: TipoDeVerificacion; detalle: string }[];
}
