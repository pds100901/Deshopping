import type {
  ClaseDeAccion,
  Contexto,
  NivelRiesgo,
  Pedido,
  EventoDeSeguridad,
  Umbrales,
} from '../tipos';

const NIVEL_POR_CLASE: Record<ClaseDeAccion, NivelRiesgo> = {
  observar: 0,
  consultar: 0,
  filtrar: 0,
  fijar: 0,
  consultar_sensible: 1,
  guardar_preferencia: 1,
  crear_pendiente: 1,
  mover_evento_propio: 1,
  confirmar_hecho: 1,
  lanzar_agente: 2,
  crear_borrador: 2,
  borrar_pendiente: 2,
  cambiar_rutina: 2,
  desplegar_preview: 2,
  enviar: 3,
  pagar: 3,
  desplegar_produccion: 3,
  push_main: 3,
  borrar_datos: 3,
  cambiar_permisos: 3,
  cambiar_identidad: 3,
  mostrar_credenciales: 3,
  contactar_nuevo: 3,
};

/** Nivel base de cada clase de acción (tabla 7.4). */
export function nivelDeClase(clase: ClaseDeAccion): NivelRiesgo {
  return NIVEL_POR_CLASE[clase];
}

/**
 * La voz es factor blando (7.3): cuenta solo con puntaje ≥ umbral y sin señal de sintético.
 * Sin señal de voz se trata como no reconocida.
 */
export function esVozReconocida(contexto: Contexto, umbrales: Umbrales): boolean {
  const voz = contexto.voz;
  return voz !== undefined && voz.puntaje >= umbrales.vozMinima && !voz.sintetico;
}

export interface RiesgoEvaluado {
  riesgo: NivelRiesgo;
  vozReconocida: boolean;
  degradaciones: string[];
  eventosDeSeguridad: EventoDeSeguridad[];
  /** Ráfaga de acciones críticas: se rechaza con pausa. */
  pausa: boolean;
}

/** Aplica degradaciones: voz sintética o baja, parámetros de tercero (+1), ráfaga, red nueva. */
export function evaluarRiesgo(
  clase: ClaseDeAccion,
  pedido: Pedido,
  contexto: Contexto,
  umbrales: Umbrales,
): RiesgoEvaluado {
  const degradaciones: string[] = [];
  const eventosDeSeguridad: EventoDeSeguridad[] = [];
  const evento = (tipo: EventoDeSeguridad['tipo'], detalle: string) =>
    eventosDeSeguridad.push({ tipo, detalle, en: contexto.ahora });

  const { voz } = contexto;
  if (voz?.sintetico) {
    degradaciones.push('voz sintética → voz no reconocida');
    evento('voz_sintetica', `señal de voz sintética (puntaje ${voz.puntaje})`);
  } else if (voz !== undefined && voz.puntaje < umbrales.vozMinima) {
    degradaciones.push('voz bajo el umbral → voz no reconocida');
    evento('voz_no_reconocida', `puntaje ${voz.puntaje} < ${umbrales.vozMinima}`);
  }

  let riesgo: number = nivelDeClase(clase);
  // Todo lo que nace de un ticket de tercero parte, como mínimo, del nivel 1.
  if (pedido.ticketId !== undefined && riesgo < 1) riesgo = 1;
  if (pedido.parametrosDeTercero) {
    riesgo = Math.min(3, riesgo + 1);
    degradaciones.push('parámetros de tercero → +1');
  }

  const pausa =
    riesgo === 3 &&
    (contexto.accionesCriticasUltimaHora ?? 0) > umbrales.accionesCriticasPorHoraMax;
  if (pausa) {
    evento(
      'rafaga_de_acciones_criticas',
      `${contexto.accionesCriticasUltimaHora} acciones críticas en la última hora`,
    );
  }
  // El factor se trata como ausente en `factorPresente`; aquí solo se registra.
  if (contexto.sesion.redNueva) evento('red_nueva', 'red o ubicación nueva: re-autenticación');

  return {
    riesgo: riesgo as NivelRiesgo,
    vozReconocida: esVozReconocida(contexto, umbrales),
    degradaciones,
    eventosDeSeguridad,
    pausa,
  };
}
