/**
 * Contrato de la memoria semántica de Jules (capa «semántica / perfil» de `bases-del-core.md` 5.10):
 * hechos y preferencias con procedencia, confianza, estado y caducidad.
 * La memoria episódica (trazas, episodios) vive en el almacenamiento y no se modela aquí.
 */
import type { ValorDeParametro } from '../tipos';

export type OrigenDeHecho = 'elkis' | 'jules' | 'cientifico' | 'tercero' | 'sistema';

/** Un hecho propuesto no se usa para actuar hasta que quien manda lo confirme (constitución 14). */
export type EstadoDeHecho = 'propuesto' | 'confirmado' | 'caducado' | 'rechazado';

export type TipoDeHecho =
  'perfil' | 'salud' | 'finanzas' | 'relaciones' | 'trabajo' | 'contacto' | 'otro';

export interface ProcedenciaDeHecho {
  origen: OrigenDeHecho;
  /** Ids de episodios, trazas o boletines que lo respaldan. */
  evidencia: string[];
  en: string;
  nota?: string;
}

export interface Hecho {
  id: string;
  enunciado: string;
  tipo: TipoDeHecho;
  temas: string[];
  procedencia: ProcedenciaDeHecho;
  /** 0..1. Un hecho de origen `tercero` nunca supera 0,3 ni se confirma solo. */
  confianza: number;
  estado: EstadoDeHecho;
  creadoEn: string;
  actualizadoEn: string;
  confirmadoEn?: string;
  /** Caducidad por tipo (`CADUCIDAD_DIAS`); sin valor → no caduca. */
  caducaEn?: string;
  /** Última vez que el espejo editable y el almacenamiento coincidieron para este hecho. */
  sincronizadoEn?: string;
  version: number;
}

/** Preferencia de presentación o de trato: «plata.grafico = barras», «tema = oscuro». */
export interface Preferencia {
  clave: string;
  valor: ValorDeParametro;
  /** Dominio al que aplica («plata», «agenda»); sin dominio → global. */
  dominio?: string;
  origen: OrigenDeHecho;
  estado: EstadoDeHecho;
  actualizadoEn: string;
  sincronizadoEn?: string;
}

export interface Memoria {
  hechos: Hecho[];
  preferencias: Preferencia[];
}

export interface PropuestaDeHecho {
  enunciado: string;
  tipo: TipoDeHecho;
  temas: string[];
  procedencia: ProcedenciaDeHecho;
  confianza: number;
}

export interface ConsultaDeMemoria {
  temas?: string[];
  texto?: string;
}

/** Jules sabe, sabe pero sin confirmar, o se abstiene y ofrece averiguarlo. */
export type RespuestaDeMemoria =
  | { tipo: 'sabe'; hechos: Hecho[]; sinConfirmar: Hecho[] }
  | { tipo: 'no_confirmado'; sinConfirmar: Hecho[] }
  | { tipo: 'no_lo_se'; ofrece: 'averiguarlo' };
