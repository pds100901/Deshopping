import type { ClaseDeAccion, Departamento, Intencion, ValorDeParametro } from '../tipos';

interface Regla {
  clase: ClaseDeAccion;
  patrones: RegExp[];
}

/**
 * Reglas sobre el texto normalizado, en orden: gana la primera que calza.
 * Las más específicas (y más riesgosas) van primero para que «muéstrame la clave»
 * no caiga en `observar` ni «borra el pendiente» en `borrar_datos`.
 */
const REGLAS: Regla[] = [
  { clase: 'push_main', patrones: [/\b(push|pushea\w*|mergea\w*|merge)\b.*\bmain\b/] },
  {
    clase: 'desplegar_produccion',
    patrones: [/\b(sub[eia]\w*|despliega\w*|desplegar|deploy\w*)\b.*\b(produccion|prod)\b/],
  },
  { clase: 'desplegar_preview', patrones: [/\b(preview|staging)\b/] },
  {
    clase: 'mostrar_credenciales',
    patrones: [/\b(muestrame|muestra|dame|pasame)\b.*\b(clave|contrasena|credencial\w*|token)\b/],
  },
  { clase: 'borrar_pendiente', patrones: [/\b(borra|elimina)\b.*\b(pendiente|tarea)\b/] },
  { clase: 'borrar_datos', patrones: [/\b(borra|elimina)\b.*\b(datos|base)\b/] },
  { clase: 'cambiar_permisos', patrones: [/\bcambia\b.*\bpermisos?\b/] },
  { clase: 'pagar', patrones: [/\b(paga|pagale|transfiere|transferile)\b/] },
  {
    clase: 'enviar',
    patrones: [/\b(envia|manda|responde|contesta)\b.*\b(whatsapp|correo|mail|mensaje)\b/],
  },
  {
    clase: 'lanzar_agente',
    patrones: [
      /\b(lanza|arma)\b.*\b(agente|equipo)\b/,
      /\bque (el )?(desarrollo|ventas|contenido|finanzas|investigacion|cientifico)\b.*\b(haga|revise|investigue)\b/,
    ],
  },
  { clase: 'crear_borrador', patrones: [/\bborrador\b/] },
  { clase: 'cambiar_rutina', patrones: [/\brutina\b/] },
  { clase: 'guardar_preferencia', patrones: [/\b(guarda|recuerda)\b.*\bprefiero\b/] },
  { clase: 'crear_pendiente', patrones: [/\b(anota|agrega)\b.*\b(pendiente|tarea)\b/] },
  { clase: 'mover_evento_propio', patrones: [/\b(mueve|cambia)\b.*\b(reunion|evento)\b/] },
  { clase: 'confirmar_hecho', patrones: [/\bconfirma que\b/, /\bsi es cierto\b/] },
  {
    clase: 'consultar_sensible',
    patrones: [/\b(saldo|cuenta|cartola|sueldo|plata|gastos?|deuda|salud|sueno|peso)\b/],
  },
  { clase: 'filtrar', patrones: [/\bfiltra\b/, /\bsolo los\b/] },
  { clase: 'fijar', patrones: [/\bfija\b/, /\bdeja fijo\b/] },
  {
    clase: 'observar',
    patrones: [/\b(abre|muestra|muestrame|agenda|agentes)\b/, /\b(como va|que tengo|mi semana)\b/],
  },
];

/** Departamento nombrado explícitamente; si no hay, se infiere por tema. */
const DEPARTAMENTOS: [Departamento, RegExp][] = [
  ['investigacion', /\b(compras?|shein|temu|carritos?|ofertas?|cupon\w*)\b/],
  ['ventas', /\b(ventas|pedidos?|encargos?|clientas?|clientes?|whatsapp|cotiza\w*)\b/],
  ['contenido', /\b(contenido|reels?|historias?|guion\w*|videos?|plantillas?)\b/],
  ['finanzas', /\b(finanzas|cuentas|codigos?|descuentos?|promos?|saldos?|adelantos?)\b/],
  ['personal', /\b(agenda|viajes?|entregas?|envios?)\b/],
  ['desarrollo', /\b(tienda|catalogo|inventario|existencias|regalos?)\b/],
];

const TEMAS: [string, RegExp][] = [
  ['finanzas', /\b(plata|gastos?|saldo|cuenta|cartola|sueldo|deuda|paga\w*|transfiere)\b/],
  ['sueno', /\b(sueno|dormi\w*)\b/],
  ['entrenamiento', /\b(entrenamiento|entrenar|gimnasio|peso)\b/],
  ['salud', /\bsalud\b/],
  ['agentes', /\bagentes?\b/],
];

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const PALABRAS_VACIAS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'lo',
  'de',
  'del',
  'a',
  'al',
  'en',
  'y',
  'o',
  'que',
  'por',
  'para',
  'con',
  'sin',
  'mi',
  'mis',
  'me',
  'tu',
  'su',
  'sus',
  'se',
]);

/** Tokens normalizados sin palabras vacías: lo que de verdad distingue una intención. */
export function tokensClave(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((palabra) => palabra !== '' && !PALABRAS_VACIAS.has(palabra));
}

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Monto con `$` en el texto original (antes de quitar signos): «$15.000» → 15000. */
function extraerMonto(texto: string): number | undefined {
  const coincidencia = /\$\s?(\d[\d.]*(?:,\d+)?)/.exec(texto);
  if (!coincidencia?.[1]) return undefined;
  return Number(coincidencia[1].replace(/\./g, '').replace(',', '.'));
}

function extraerParametros(texto: string, normal: string): Record<string, ValorDeParametro> {
  const parametros: Record<string, ValorDeParametro> = {};
  const palabras = normal.split(' ');
  const mes = MESES.find((m) => palabras.includes(m));
  if (mes) parametros.mes = mes;
  const dia = ['hoy', 'manana', 'ayer'].find((d) => palabras.includes(d));
  if (dia) parametros.dia = dia;
  const monto = extraerMonto(texto);
  if (monto !== undefined) parametros.monto = monto;
  const variante = /\ben barras\b/.test(normal)
    ? 'barras'
    : /\bcompacta\b/.test(normal)
      ? 'compacta'
      : undefined;
  if (variante) parametros.variante = variante;
  return parametros;
}

function departamentoDe(normal: string): Departamento {
  return DEPARTAMENTOS.find(([, patron]) => patron.test(normal))?.[0] ?? 'desarrollo';
}

/**
 * Clasificador determinista por palabras clave para la demo.
 * Reemplazable por Haiku sin cambiar el contrato: devuelve una `Intencion`.
 * La canónica es el texto normalizado sin palabras vacías («gastos del mes» → «gastos mes»).
 * Si no reconoce nada: clase `consultar`, confianza 0.5.
 */
export function clasificarIntencion(texto: string): Intencion {
  const normal = normalizar(texto);
  const regla = REGLAS.find((r) => r.patrones.some((p) => p.test(normal)));
  const clase = regla?.clase ?? 'consultar';
  const intencion: Intencion = {
    canonica: tokensClave(texto).join(' '),
    clase,
    parametros: extraerParametros(texto, normal),
    temas: TEMAS.filter(([, patron]) => patron.test(normal)).map(([tema]) => tema),
    confianza: regla ? 1 : 0.5,
  };
  if (clase === 'lanzar_agente') intencion.departamento = departamentoDe(normal);
  return intencion;
}
