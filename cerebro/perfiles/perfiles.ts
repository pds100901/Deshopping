import type {
  MiembroDeEquipo,
  Perfil,
  PerfilDeRol,
  PerfilGeneral,
  SolicitudDeEquipo,
} from '../tipos';
import { CIENTIFICO } from './cientifico';

/** Únicos y no clonables: Jules, el Científico, el Contador. */
export const PERFILES_GENERALES: PerfilGeneral[] = [
  {
    tipo: 'general',
    id: 'jules',
    nombre: 'Jules',
    clonable: false,
    departamento: 'personal',
    cuarentena: false,
    // Enviar siempre pasa por aprobación; los hechos los confirma quien manda.
    puedeEnviar: false,
    puedeEscribirMemoriaConfirmada: false,
    herramientas: ['leer', 'componer_superficie', 'delegar', 'pedir_aprobacion'],
  },
  CIENTIFICO,
  {
    tipo: 'general',
    id: 'contador',
    nombre: 'El Contador',
    clonable: false,
    departamento: 'finanzas',
    cuarentena: false,
    puedeEnviar: false,
    puedeEscribirMemoriaConfirmada: false,
    herramientas: ['leer', 'sql_lectura', 'calcular'],
  },
];

function rol(
  id: string,
  nombre: string,
  departamento: PerfilDeRol['departamento'],
  maxInstancias: number,
  herramientas: string[],
): PerfilDeRol {
  return { tipo: 'rol', id, nombre, clonable: true, departamento, maxInstancias, herramientas };
}

/** Clonables: front, backend, qa, … Ninguno envía, paga ni despliega. */
export const PERFILES_DE_ROL: PerfilDeRol[] = [
  rol('front', 'Front designer', 'desarrollo', 3, ['leer', 'editar', 'ejecutar_tests']),
  rol('backend', 'Backend', 'desarrollo', 3, ['leer', 'editar', 'ejecutar_tests']),
  rol('qa', 'QA', 'desarrollo', 2, ['leer', 'ejecutar_tests']),
  rol('vendedor', 'Vendedor', 'ventas', 2, ['leer', 'redactar']),
  rol('redactor', 'Redactor', 'contenido', 2, ['leer', 'redactar']),
  rol('disenador', 'Diseñador', 'contenido', 2, ['leer', 'disenar']),
  rol('asistente', 'Asistente', 'personal', 1, ['leer', 'agendar']),
];

export function buscarPerfil(
  id: string,
  perfiles: Perfil[] = [...PERFILES_GENERALES, ...PERFILES_DE_ROL],
): Perfil | undefined {
  return perfiles.find((p) => p.id === id);
}

/** Lanza si se piden 2+ instancias de un perfil general o más de `maxInstancias` de un rol. */
export function armarEquipo(
  solicitud: SolicitudDeEquipo[],
  perfiles?: Perfil[],
): MiembroDeEquipo[] {
  // Se acumulan las instancias por perfil, respetando el orden de primera aparición.
  const pedidas = new Map<string, number>();
  for (const { perfilId, instancias } of solicitud) {
    const perfil = buscarPerfil(perfilId, perfiles);
    if (!perfil) throw new Error(`perfil desconocido: ${perfilId}`);
    if (instancias < 1) throw new Error(`${perfilId} requiere al menos 1 instancia`);
    pedidas.set(perfilId, (pedidas.get(perfilId) ?? 0) + instancias);
  }

  const equipo: MiembroDeEquipo[] = [];
  for (const [perfilId, total] of pedidas) {
    const perfil = buscarPerfil(perfilId, perfiles) as Perfil;
    if (perfil.tipo === 'general' && total > 1) {
      throw new Error(`perfil general no clonable: ${perfilId}`);
    }
    if (perfil.tipo === 'rol' && total > perfil.maxInstancias) {
      throw new Error(`${perfilId} admite como máximo ${perfil.maxInstancias} instancias`);
    }
    for (let instancia = 1; instancia <= total; instancia++) equipo.push({ perfilId, instancia });
  }
  return equipo;
}
