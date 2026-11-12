import type {
  Contexto,
  Decision,
  EventoDeSeguridad,
  Factor,
  NivelRiesgo,
  SiFaltaFactor,
  Umbrales,
} from '../tipos';

const FACTOR_POR_NIVEL: Record<NivelRiesgo, Factor> = {
  0: 'sesion',
  1: 'voz',
  2: 'face_id',
  3: 'firma',
};

const SI_FALTA_POR_NIVEL: Record<NivelRiesgo, SiFaltaFactor> = {
  0: 'enmascarar',
  1: 'confirmar_toque',
  2: 'face_id',
  3: 'no_ejecutar',
};

export function factorExigido(nivel: NivelRiesgo): Factor {
  return FACTOR_POR_NIVEL[nivel];
}

/** La voz nunca satisface nivel 3; Face ID vale ≤ `faceIdMaxSegundos`; la firma debe corresponder a la solicitud. */
export function factorPresente(
  nivel: NivelRiesgo,
  contexto: Contexto,
  vozReconocida: boolean,
  umbrales: Umbrales,
  solicitudId?: string,
): boolean {
  const { sesion } = contexto;
  // Red nueva exige re-autenticación: ningún nivel queda cubierto hasta entonces.
  const sesionViva = sesion.passkeyViva && sesion.dispositivoEnrolado && !sesion.redNueva;
  if (!sesionViva) return false;
  if (nivel === 0) return true;
  if (nivel === 3) {
    // Solo una firma de ESTA solicitud; la voz y el Face ID no cuentan aquí.
    return solicitudId !== undefined && sesion.firma?.solicitudId === solicitudId;
  }
  if (!vozReconocida) return false;
  if (nivel === 1) return true;
  return (
    sesion.faceIdHaceSegundos !== undefined &&
    sesion.faceIdHaceSegundos <= umbrales.faceIdMaxSegundos
  );
}

export function siFaltaFactor(nivel: NivelRiesgo): SiFaltaFactor {
  return SI_FALTA_POR_NIVEL[nivel];
}

export type FactorEvaluado = Pick<
  Decision,
  'factorExigido' | 'factorPresente' | 'siFaltaFactor'
> & {
  eventos: EventoDeSeguridad[];
};

/** Cierre común de toda decisión: factor exigido vs presente; si falta, qué hacer y el evento. */
export function evaluarFactor(
  nivel: NivelRiesgo,
  contexto: Contexto,
  vozReconocida: boolean,
  umbrales: Umbrales,
  solicitudId?: string,
): FactorEvaluado {
  const exigido = factorExigido(nivel);
  const presente = factorPresente(nivel, contexto, vozReconocida, umbrales, solicitudId);
  return {
    factorExigido: exigido,
    factorPresente: presente,
    siFaltaFactor: presente ? 'nada' : siFaltaFactor(nivel),
    eventos: presente
      ? []
      : [
          {
            tipo: 'factor_insuficiente',
            detalle: `nivel ${nivel} exige ${exigido}`,
            en: contexto.ahora,
          },
        ],
  };
}
