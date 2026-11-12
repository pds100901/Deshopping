import type {
  CategoriaDeTercero,
  Contexto,
  Decision,
  Departamento,
  EsquemaDeCuarentena,
  EventoDeSeguridad,
  Intencion,
  NivelRiesgo,
  Remitente,
  ResultadoDeCuarentena,
  ResultadoDeTrabajo,
  Ticket,
  TicketRechazado,
  Umbrales,
} from '../tipos';
import { resolverUmbrales } from '../umbrales';
import { normalizar } from './clasificar';
import { crearTrabajo, equipoPorDefecto } from './delegar';
import { evaluarFactor } from './factores';
import { esVozReconocida } from './riesgo';

/** Frases típicas de inyección, ya normalizadas (sin tildes, minúsculas). */
export const FRASES_DE_INYECCION = [
  'ignora lo anterior',
  'ignora las instrucciones',
  'olvida tus instrucciones',
  'eres ahora',
  'actua como',
  'system prompt',
  'envia la clave',
  'envia la contrasena',
  'muestrame el token',
  'transfiere',
  'ejecuta el comando',
  'disregard',
  'ignore previous',
  'new instructions',
];

const CATEGORIAS: CategoriaDeTercero[] = [
  'pedido_de_trabajo',
  'reporte_de_bug',
  'pregunta',
  'pago',
  'reunion',
  'otro',
];

const CAMPOS_DEL_ESQUEMA: (keyof EsquemaDeCuarentena)[] = [
  'remitenteId',
  'categoria',
  'fechas',
  'montos',
  'resumen',
  'referenciaMensaje',
];

const DEPARTAMENTO_POR_CATEGORIA: Record<CategoriaDeTercero, Departamento> = {
  pedido_de_trabajo: 'desarrollo',
  reporte_de_bug: 'desarrollo',
  pago: 'finanzas',
  reunion: 'personal',
  pregunta: 'personal',
  otro: 'personal',
};

/** Frases típicas de inyección; detectarlas es telemetría, no barrera (constitución 12). */
export function detectarInyeccion(texto: string): string[] {
  const normal = ` ${normalizar(texto)} `;
  return FRASES_DE_INYECCION.filter((frase) => normal.includes(` ${frase} `));
}

const esTextoNoVacio = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function erroresDeCampos(o: Record<string, unknown>, umbrales: Umbrales): string[] {
  const errores: string[] = [];
  for (const clave of Object.keys(o)) {
    if (!(CAMPOS_DEL_ESQUEMA as string[]).includes(clave))
      errores.push(`campo no permitido: ${clave}`);
  }
  for (const clave of CAMPOS_DEL_ESQUEMA) {
    if (!(clave in o)) errores.push(`falta el campo: ${clave}`);
  }
  const { remitenteId, categoria, fechas, montos, resumen, referenciaMensaje } = o;
  if ('remitenteId' in o && !esTextoNoVacio(remitenteId))
    errores.push('remitenteId debe ser texto no vacío');
  if ('categoria' in o && !CATEGORIAS.includes(categoria as CategoriaDeTercero)) {
    errores.push(`categoría no permitida: ${String(categoria)}`);
  }
  if ('fechas' in o && !(Array.isArray(fechas) && fechas.every((f) => typeof f === 'string'))) {
    errores.push('fechas debe ser una lista de textos');
  }
  if ('montos' in o && !(Array.isArray(montos) && montos.every((m) => Number.isFinite(m)))) {
    errores.push('montos debe ser una lista de números finitos');
  }
  if (
    'resumen' in o &&
    !(typeof resumen === 'string' && resumen.length <= umbrales.resumenCuarentenaMax)
  ) {
    errores.push(`resumen debe ser texto de hasta ${umbrales.resumenCuarentenaMax} caracteres`);
  }
  if ('referenciaMensaje' in o && !esTextoNoVacio(referenciaMensaje)) {
    errores.push('referenciaMensaje debe ser texto no vacío');
  }
  return errores;
}

/** Valida la salida del lector en cuarentena: esquema cerrado, sin campos extra, resumen acotado. */
export function validarLecturaEnCuarentena(
  salida: unknown,
  ahora: string,
  umbrales: Umbrales,
): ResultadoDeCuarentena {
  const esObjeto = typeof salida === 'object' && salida !== null && !Array.isArray(salida);
  const o = esObjeto ? (salida as Record<string, unknown>) : {};
  const errores = esObjeto ? erroresDeCampos(o, umbrales) : ['la salida debe ser un objeto'];
  // El resumen es dato, nunca instrucción: una frase sospechosa no invalida, se registra.
  const eventosDeSeguridad: EventoDeSeguridad[] =
    typeof o.resumen === 'string'
      ? detectarInyeccion(o.resumen).map((frase) => ({
          tipo: 'inyeccion_sospechada',
          detalle: `frase en el resumen: «${frase}»`,
          en: ahora,
        }))
      : [];
  if (errores.length > 0) {
    eventosDeSeguridad.push({ tipo: 'esquema_invalido', detalle: errores.join('; '), en: ahora });
    return { ok: false, errores, eventosDeSeguridad };
  }
  return { ok: true, esquema: o as unknown as EsquemaDeCuarentena, eventosDeSeguridad };
}

/** Solo remitentes de la allowlist; el ticket nace con nivel mínimo 1. */
export function crearTicket(
  esquema: EsquemaDeCuarentena,
  remitente: Remitente,
  ahora: string,
): Ticket | TicketRechazado {
  if (!remitente.enAllowlist) {
    const motivo = `remitente fuera de la allowlist: ${remitente.id}`;
    return {
      rechazado: true,
      motivo,
      eventosDeSeguridad: [{ tipo: 'remitente_fuera_de_allowlist', detalle: motivo, en: ahora }],
    };
  }
  if (esquema.remitenteId !== remitente.id) {
    const motivo = `el esquema dice ${esquema.remitenteId} pero el remitente es ${remitente.id}`;
    return {
      rechazado: true,
      motivo,
      eventosDeSeguridad: [{ tipo: 'esquema_invalido', detalle: motivo, en: ahora }],
    };
  }
  return {
    id: `ticket-${esquema.referenciaMensaje}`,
    remitente,
    categoria: esquema.categoria,
    resumen: esquema.resumen,
    referenciaMensaje: esquema.referenciaMensaje,
    departamento: DEPARTAMENTO_POR_CATEGORIA[esquema.categoria],
    creadoEn: ahora,
    procedencia: 'tercero',
    nivelMinimo: 1,
  };
}

/** Delegación al departamento del ticket: worktree, sin secretos, sin push. */
export function decidirSobreTicket(ticket: Ticket, contexto: Contexto): Decision {
  const umbrales = resolverUmbrales(contexto.umbrales);
  const intencion: Intencion = {
    canonica: normalizar(ticket.resumen),
    clase: 'lanzar_agente',
    parametros: {},
    temas: [],
    departamento: ticket.departamento,
    confianza: 1,
  };
  // Lanzar un agente es nivel 2; el ticket nunca baja de su nivel mínimo.
  const riesgo = Math.max(2, ticket.nivelMinimo) as NivelRiesgo;
  const factor = evaluarFactor(riesgo, contexto, esVozReconocida(contexto, umbrales), umbrales);
  return {
    accion: {
      tipo: 'delegar',
      departamento: ticket.departamento,
      equipo: equipoPorDefecto(ticket.departamento),
      trabajo: crearTrabajo(intencion, 'tercero', ticket.id),
    },
    riesgo,
    factorExigido: factor.factorExigido,
    factorPresente: factor.factorPresente,
    siFaltaFactor: factor.siFaltaFactor,
    degradaciones: [],
    motivos: [
      `${ticket.id} → ${ticket.departamento}`,
      'ticket de tercero: trabajo en worktree sin secretos y sin push',
    ],
    eventosDeSeguridad: factor.eventos,
  };
}

/**
 * «Pidieron X. Hice Y. ¿Lo subo?»: registro de aprobación crítica, sin chistes.
 * Solo usa el resumen del esquema; el texto libre del tercero nunca llega aquí.
 */
export function redactarInforme(ticket: Ticket, resultado: ResultadoDeTrabajo): string {
  const quien = ticket.remitente.nombre ?? ticket.remitente.id;
  const tests = resultado.testsVerdes ? 'en verde' : 'en rojo';
  return (
    `Pidieron: ${ticket.resumen} (${quien}, vía ${ticket.categoria}). ` +
    `Hice: ${resultado.resumen} en la rama ${resultado.rama}, ` +
    `${resultado.archivosTocados.length} archivo(s), tests ${tests}. ` +
    '¿Lo subo? Subir a producción pide tu passkey.'
  );
}
