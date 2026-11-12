import type { Hecho, Memoria, PropuestaDeHecho, TipoDeHecho } from './tipos';

/** Caducidad por tipo en días; `null` no caduca (perfil, contacto). */
export const CADUCIDAD_DIAS: Record<TipoDeHecho, number | null> = {
  perfil: null,
  salud: 90,
  finanzas: 30,
  relaciones: 180,
  trabajo: 180,
  contacto: null,
  otro: 90,
};

const MS_POR_DIA = 86_400_000;
const CONFIANZA_MAXIMA_DE_TERCERO = 0.3;
const PREFIJO_DE_RE_ENUNCIACION = 'confirmado por Elkis';

const acotar = (n: number, maximo: number): number => Math.min(Math.max(n, 0), maximo);

/** Un hecho sin `caducaEn` no caduca; uno con fecha vence al pasarla. */
const vigente = (hecho: Hecho, ahora: string): boolean =>
  hecho.caducaEn === undefined || Date.parse(hecho.caducaEn) >= Date.parse(ahora);

/** Nace `propuesto`; origen `tercero` → confianza ≤ 0,3. */
export function proponerHecho(propuesta: PropuestaDeHecho, ahora: string, id: string): Hecho {
  const tope = propuesta.procedencia.origen === 'tercero' ? CONFIANZA_MAXIMA_DE_TERCERO : 1;
  return {
    id,
    enunciado: propuesta.enunciado,
    tipo: propuesta.tipo,
    temas: propuesta.temas,
    procedencia: propuesta.procedencia,
    confianza: acotar(propuesta.confianza, tope),
    estado: 'propuesto',
    creadoEn: ahora,
    actualizadoEn: ahora,
    version: 1,
  };
}

/** Solo quien manda confirma; un hecho de origen `tercero` se confirma solo si lo re-enuncia (nota con `PREFIJO_DE_RE_ENUNCIACION`). */
export function confirmarHecho(hecho: Hecho, ahora: string): Hecho {
  const { origen, nota } = hecho.procedencia;
  if (origen === 'tercero' && !nota?.startsWith(PREFIJO_DE_RE_ENUNCIACION)) {
    throw new Error('un hecho de tercero solo se confirma si quien manda lo re-enuncia');
  }
  const dias = CADUCIDAD_DIAS[hecho.tipo];
  const confirmado: Hecho = {
    ...hecho,
    estado: 'confirmado',
    confirmadoEn: ahora,
    actualizadoEn: ahora,
    version: hecho.version + 1,
  };
  if (dias === null) delete confirmado.caducaEn;
  else confirmado.caducaEn = new Date(Date.parse(ahora) + dias * MS_POR_DIA).toISOString();
  return confirmado;
}

export function rechazarHecho(hecho: Hecho, ahora: string, motivo?: string): Hecho {
  return {
    ...hecho,
    estado: 'rechazado',
    actualizadoEn: ahora,
    version: hecho.version + 1,
    procedencia: motivo === undefined ? hecho.procedencia : { ...hecho.procedencia, nota: motivo },
  };
}

/** Marca `caducado` lo confirmado cuya `caducaEn` ya pasó. No borra nada. */
export function caducar(memoria: Memoria, ahora: string): Memoria {
  return {
    ...memoria,
    hechos: memoria.hechos.map((h) =>
      h.estado === 'confirmado' && !vigente(h, ahora)
        ? { ...h, estado: 'caducado', actualizadoEn: ahora, version: h.version + 1 }
        : h,
    ),
  };
}

/** Lo único con lo que Jules actúa: confirmado y vigente. */
export function baseParaActuar(memoria: Memoria, ahora: string): Hecho[] {
  return memoria.hechos.filter((h) => h.estado === 'confirmado' && vigente(h, ahora));
}
