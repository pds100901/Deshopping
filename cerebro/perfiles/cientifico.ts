import { resolverUmbrales } from '../umbrales';
import type {
  AreaDelCientifico,
  Boletin,
  ItemDeInvestigacion,
  PerfilGeneral,
  Ruta,
  Traza,
  Umbrales,
  ValidacionDeBoletin,
} from '../tipos';

export const AREAS_DEL_CIENTIFICO: AreaDelCientifico[] = [
  'entrenamiento',
  'sueno',
  'finanzas',
  'agentes',
  'ingenieria_de_interfaces',
  'modelos_nuevos',
  'noticias_tech',
];

/** Perfil general en cuarentena: lee, no envía, no escribe memoria confirmada. */
export const CIENTIFICO: PerfilGeneral = {
  tipo: 'general',
  id: 'cientifico',
  nombre: 'El Científico',
  clonable: false,
  departamento: 'investigacion',
  cuarentena: true,
  puedeEnviar: false,
  puedeEscribirMemoriaConfirmada: false,
  herramientas: [
    'leer',
    'buscar_en_allowlist',
    'proponer_hecho',
    'proponer_decision',
    'proponer_correccion',
  ],
};

/** Áreas fijas ∪ `temas` de las rutas activas (receta o caliente), sin duplicados. */
export function temasVigilados(rutas: Ruta[]): string[] {
  const temas = new Set<string>(AREAS_DEL_CIENTIFICO);
  for (const ruta of rutas) {
    if (ruta.estado !== 'receta' && ruta.estado !== 'caliente') continue;
    for (const tema of ruta.receta?.temas ?? []) temas.add(tema);
  }
  return [...temas];
}

/** Dominios de prensa o blog genérico: no cuentan como fuente primaria. */
const FUENTES_NO_PRIMARIAS = [
  'medium.com',
  'blog.',
  'news.',
  'techcrunch',
  'theverge',
  'x.com',
  'twitter.com',
  'reddit.com',
];

/** ≤ `itemsMaxBoletin` ítems, fuente primaria obligatoria, preprints marcados. */
export function validarBoletin(
  boletin: Boletin,
  umbrales?: Partial<Umbrales>,
): ValidacionDeBoletin {
  const { itemsMaxBoletin } = resolverUmbrales(umbrales);
  const errores: string[] = [];

  if (boletin.items.length === 0) errores.push('el boletín no tiene ítems');
  if (boletin.items.length > itemsMaxBoletin) {
    errores.push(`el boletín admite como máximo ${itemsMaxBoletin} ítems`);
  }

  boletin.items.forEach((item, indice) => {
    const n = indice + 1;
    const fuente = item.fuentePrimaria.trim().toLowerCase();
    if (fuente === '') errores.push(`ítem ${n}: sin fuente primaria`);
    else if (FUENTES_NO_PRIMARIAS.some((d) => fuente.includes(d))) {
      errores.push(`ítem ${n}: la fuente no es primaria`);
    }
    if (item.queCambio.trim() === '') errores.push(`ítem ${n}: falta qué cambió`);
    if (item.queSignifica.trim() === '') errores.push(`ítem ${n}: falta qué significa`);
    if (
      item.nivelDeEvidencia === 'preprint' &&
      !item.queSignifica.toLowerCase().includes('preprint')
    ) {
      errores.push(`ítem ${n}: preprint sin marcar como tal`);
    }
    if (!item.cambiaDecision && item.nivelDeEvidencia === 'opinion') {
      errores.push(`ítem ${n}: opinión que no cambia ninguna decisión; no entra al boletín`);
    }
  });

  return { valido: errores.length === 0, errores };
}

/** Correcciones de quien manda y recetas rotas entran a la cola de investigación. */
export function colaDeInvestigacion(
  trazas: Traza[],
  rutas: Ruta[],
  ahora: string,
): ItemDeInvestigacion[] {
  const correcciones: ItemDeInvestigacion[] = trazas
    .filter((t) => t.corregido)
    .sort((a, b) => a.en.localeCompare(b.en))
    .map((t) => ({
      id: `inv-correccion-${t.id}`,
      origen: 'correccion',
      tema: t.temas[0] ?? 'general',
      detalle: `corrección sobre “${t.intencionCanonica}”`,
      en: t.en,
    }));

  const rotas: ItemDeInvestigacion[] = rutas
    .filter((r) => r.estado === 'rota')
    .map((r) => ({
      id: `inv-receta_rota-${r.id}`,
      origen: 'receta_rota',
      tema: r.receta?.temas[0] ?? 'general',
      detalle: `la receta “${r.receta?.intencion.canonica ?? r.id}” se rompió: fuente cambiada`,
      en: ahora,
    }));

  return [...correcciones, ...rotas];
}
