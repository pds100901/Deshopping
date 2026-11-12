import type {
  Accion,
  Contexto,
  Decision,
  Intencion,
  NivelRiesgo,
  Pedido,
  Ruta,
  Umbrales,
  ValorDeParametro,
} from '../tipos';
import { frescuraCumplida } from '../evolucion/frescura';
import { preferencia } from '../memoria/consultar';
import { resolverUmbrales } from '../umbrales';
import { crearSolicitudDeAprobacion } from './aprobacion';
import { clasificarIntencion } from './clasificar';
import { detectarInyeccion } from './cuarentena';
import { crearTrabajo, equipoPorDefecto } from './delegar';
import { emparejarPorTokens } from './emparejar';
import { evaluarFactor, factorExigido, factorPresente } from './factores';
import { esVozReconocida, evaluarRiesgo, nivelDeClase, type RiesgoEvaluado } from './riesgo';

const MOTIVO_CUARENTENA = 'contenido de tercero: pasa al lector en cuarentena, no se ejecuta';
const MOTIVO_SISTEMA = 'el sistema solo observa y propone';
const MOTIVO_EN_VIVO = 'dato más viejo que 2×TTL: se responde en vivo y se dice';

/** Acción elegida antes de mirar el nivel 3, con la ruta usada (si hubo) y sus parámetros. */
interface Eleccion {
  accion: Accion;
  ruta?: Ruta;
  parametros: Record<string, ValorDeParametro>;
  motivos: string[];
}

/** Rama 1: un tercero nunca da órdenes; su texto solo se mira para registrar inyecciones. */
function decisionDeCuarentena(pedido: Pedido, contexto: Contexto, umbrales: Umbrales): Decision {
  return {
    accion: { tipo: 'cuarentena', motivo: MOTIVO_CUARENTENA },
    riesgo: 0,
    factorExigido: factorExigido(0),
    factorPresente: factorPresente(0, contexto, esVozReconocida(contexto, umbrales), umbrales),
    siFaltaFactor: 'nada',
    degradaciones: [],
    motivos: [MOTIVO_CUARENTENA],
    eventosDeSeguridad: detectarInyeccion(pedido.texto).map((frase) => ({
      tipo: 'inyeccion_sospechada',
      detalle: `«${frase}» en un pedido de tercero`,
      en: contexto.ahora,
    })),
  };
}

/** Rechazo sin ejecución: no hay nada que pedir al usuario, así que `siFaltaFactor` es `nada`. */
function rechazo(
  motivo: string,
  evaluado: RiesgoEvaluado,
  contexto: Contexto,
  umbrales: Umbrales,
  motivos: string[],
): Decision {
  const { riesgo, vozReconocida } = evaluado;
  return {
    accion: { tipo: 'rechazar', motivo },
    riesgo,
    factorExigido: factorExigido(riesgo),
    factorPresente: factorPresente(riesgo, contexto, vozReconocida, umbrales),
    siFaltaFactor: 'nada',
    degradaciones: evaluado.degradaciones,
    motivos: [...motivos, motivo],
    eventosDeSeguridad: evaluado.eventosDeSeguridad,
  };
}

const esUsable = (ruta: Ruta): boolean =>
  ruta.receta !== undefined && (ruta.estado === 'receta' || ruta.estado === 'caliente');

/** Rama 5 (5.4): caliente exacta → receta ≥ similitudReceta → candidatas → explorar. */
function elegirRutaBase(intencion: Intencion, contexto: Contexto, umbrales: Umbrales): Eleccion {
  // Las recetas solo leen (5.6): un pedido de nivel 2 o 3 nunca se resuelve con una.
  const nivelDelPedido = nivelDeClase(intencion.clase);
  if (nivelDelPedido >= 2) {
    return {
      accion: { tipo: 'explorar', recetasCandidatas: [] },
      parametros: intencion.parametros,
      motivos: [`pedido de nivel ${nivelDelPedido}: las recetas son de lectura y no se usan`],
    };
  }
  const usables = new Map(contexto.rutas.filter(esUsable).map((ruta) => [ruta.id, ruta]));
  const coincidencias = (
    contexto.coincidencias ?? emparejarPorTokens(intencion.canonica, contexto.rutas)
  )
    .filter((c) => usables.has(c.rutaId))
    .sort((a, b) => b.similitud - a.similitud);
  const mejor = coincidencias[0];
  const ruta = mejor && usables.get(mejor.rutaId);
  if (mejor && ruta) {
    if (mejor.similitud === 1 && ruta.estado === 'caliente') {
      const enVivo = !frescuraCumplida(ruta, contexto.ahora, umbrales);
      return {
        accion: { tipo: 'ruta_caliente', rutaId: ruta.id, enVivo },
        ruta,
        parametros: intencion.parametros,
        motivos: [`ruta caliente exacta: ${ruta.id}`, ...(enVivo ? [MOTIVO_EN_VIVO] : [])],
      };
    }
    if (mejor.similitud >= umbrales.similitudReceta) {
      const parametros = { ...intencion.parametros, ...mejor.parametros };
      return {
        accion: { tipo: 'receta', rutaId: ruta.id, parametros },
        ruta,
        parametros,
        motivos: [`receta ${ruta.id} (similitud ${mejor.similitud})`],
      };
    }
  }
  const recetasCandidatas = coincidencias
    .filter((c) => c.similitud >= umbrales.similitudCandidata)
    .map((c) => c.rutaId);
  return {
    accion: { tipo: 'explorar', recetasCandidatas },
    parametros: intencion.parametros,
    motivos: [
      recetasCandidatas.length > 0
        ? `explorar con candidatas: ${recetasCandidatas.join(', ')}`
        : 'sin ruta aprendida: explorar',
    ],
  };
}

/** Si el pedido no fija la variante de presentación, aplica la preferencia confirmada de quien manda (5.10). */
function elegirRuta(intencion: Intencion, contexto: Contexto, umbrales: Umbrales): Eleccion {
  const preferida =
    contexto.memoria && intencion.parametros.variante === undefined
      ? preferencia(contexto.memoria, 'variante', intencion.temas[0])
      : undefined;
  if (!preferida) return elegirRutaBase(intencion, contexto, umbrales);
  const eleccion = elegirRutaBase(
    { ...intencion, parametros: { ...intencion.parametros, variante: preferida.valor } },
    contexto,
    umbrales,
  );
  return {
    ...eleccion,
    motivos: [...eleccion.motivos, `variante por preferencia: ${preferida.valor}`],
  };
}

/** Rama 4: trabajo largo → departamento, equipo y plantilla aislada (worktree, sin secretos, sin push). */
function elegirDelegacion(intencion: Intencion, pedido: Pedido): Eleccion {
  const departamento = intencion.departamento ?? 'desarrollo';
  return {
    accion: {
      tipo: 'delegar',
      departamento,
      equipo: equipoPorDefecto(departamento),
      trabajo: crearTrabajo(intencion, pedido.procedencia, pedido.ticketId),
    },
    parametros: intencion.parametros,
    motivos: [`delegar a ${departamento}`],
  };
}

/**
 * El árbol de decisión de Jules (ADR-0002, ADR-0003):
 * 1. tercero → cuarentena; 2. intención; 3. riesgo y degradaciones; 4. delegación;
 * 5. rutas (caliente exacta → receta ≥ 0,92 → candidatas 0,80 → explorar);
 * 6. nivel 3 → pedir_aprobacion con solicitud canónica; 7. factor exigido vs presente.
 */
export function decidir(pedido: Pedido, contexto: Contexto): Decision {
  const umbrales = resolverUmbrales(contexto.umbrales);
  if (pedido.procedencia === 'tercero') return decisionDeCuarentena(pedido, contexto, umbrales);

  const intencion = pedido.intencion ?? clasificarIntencion(pedido.texto);
  const evaluado = evaluarRiesgo(intencion.clase, pedido, contexto, umbrales);
  const motivos = [
    `intención: ${intencion.clase} («${intencion.canonica}»)`,
    `riesgo evaluado: ${evaluado.riesgo}`,
  ];
  if (pedido.procedencia === 'sistema' && evaluado.riesgo !== 0) {
    return rechazo(MOTIVO_SISTEMA, evaluado, contexto, umbrales, motivos);
  }
  if (evaluado.pausa) {
    const motivo = 'ráfaga de acciones críticas: pausa y aviso';
    return rechazo(motivo, evaluado, contexto, umbrales, motivos);
  }

  const eleccion =
    intencion.clase === 'lanzar_agente'
      ? elegirDelegacion(intencion, pedido)
      : elegirRuta(intencion, contexto, umbrales);
  motivos.push(...eleccion.motivos);

  // Una receta o ruta caliente nunca baja el nivel exigido (5.6, 7.4).
  const permiso = eleccion.ruta?.receta?.permisoMaximo ?? 0;
  const nivel = Math.max(evaluado.riesgo, permiso) as NivelRiesgo;

  let accion = eleccion.accion;
  let solicitudId: string | undefined;
  if (nivel === 3) {
    const { monto, destinatario } = eleccion.parametros;
    const solicitud = crearSolicitudDeAprobacion(
      {
        id: `aprobacion-${pedido.id}`,
        tipo: intencion.clase,
        resumenFijo: intencion.canonica,
        monto: typeof monto === 'number' ? monto : undefined,
        destinatario: typeof destinatario === 'string' ? destinatario : undefined,
        procedencia: pedido.parametrosDeTercero || pedido.ticketId ? 'tercero' : pedido.procedencia,
        ticketId: pedido.ticketId,
      },
      contexto.ahora,
      umbrales,
    );
    accion = { tipo: 'pedir_aprobacion', solicitud };
    solicitudId = solicitud.id;
    motivos.push('nivel 3: pide firma sobre la solicitud canónica');
  }

  const factor = evaluarFactor(nivel, contexto, evaluado.vozReconocida, umbrales, solicitudId);
  if (nivel === 0 && !evaluado.vozReconocida) motivos.push('datos sensibles enmascarados');

  return {
    accion,
    riesgo: nivel,
    factorExigido: factor.factorExigido,
    factorPresente: factor.factorPresente,
    siFaltaFactor: factor.siFaltaFactor,
    degradaciones: evaluado.degradaciones,
    motivos,
    eventosDeSeguridad: [...evaluado.eventosDeSeguridad, ...factor.eventos],
  };
}

/** Contexto mínimo seguro: sin passkey, sin voz, área general, sin rutas. */
export function contextoPorDefecto(ahora: string): Contexto {
  return {
    ahora,
    sesion: { passkeyViva: false, dispositivoEnrolado: false },
    area: 'general',
    rutas: [],
  };
}
