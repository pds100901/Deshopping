import type { Contexto, NivelRiesgo, Registro } from '../tipos';

export interface RegistroElegido {
  registro: Registro;
  motivo: string;
}

/** Motivos fijos por registro: los comparten `registroPara`, el prompt y los tests. */
export const MOTIVOS_DE_REGISTRO: Record<Registro, string> = {
  serio: 'modo serio activado por la persona',
  aprobacion_critica: 'aprobación crítica: clara y sin chistes',
  con_terceros: 'habla con o sobre terceros: nunca se burla de personas reales',
  calmado: 'meditación o ánimo bajo: calmada, breve y cálida',
  sarcasmo: 'registro por defecto: sarcasmo sin filtro para destrabar, nunca para herir',
};

/**
 * Prioridad: modoSerio → serio; riesgo 3 o área revision → aprobacion_critica;
 * terceros presentes o pedido sobre terceros → con_terceros;
 * meditación o ánimo enojado/triste/cansado → calmado; si no → sarcasmo.
 */
export function registroPara(contexto: Contexto, riesgo?: NivelRiesgo): RegistroElegido {
  const registro = elegir(contexto, riesgo);
  return { registro, motivo: MOTIVOS_DE_REGISTRO[registro] };
}

function elegir(contexto: Contexto, riesgo?: NivelRiesgo): Registro {
  if (contexto.modoSerio) return 'serio';
  if (riesgo === 3 || contexto.area === 'revision') return 'aprobacion_critica';
  if (contexto.tercerosPresentes || contexto.sobreTerceros) return 'con_terceros';
  const animoBajo =
    contexto.animo === 'enojado' || contexto.animo === 'triste' || contexto.animo === 'cansado';
  if (contexto.area === 'meditacion' || animoBajo) return 'calmado';
  return 'sarcasmo';
}
