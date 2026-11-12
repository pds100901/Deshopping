// Genera la pista del recorrido a partir de `public/presentacion/guion-dueto.txt`.
//
//   node herramientas/generar-recorrido.mjs
//
// El recorrido se mueve con el reloj de `dueto-recorrido.mp3` y con los tiempos por carácter de
// `dueto-recorrido.alineacion.json`. Este guion todavía no tiene voz grabada, así que el script
// calcula los tiempos a ritmo de lectura y, si hay `ffmpeg`, crea una pista en silencio del mismo
// largo: el recorrido corre con subtítulos y sin narración.
//
// Para ponerle voz: graba el guion completo en un solo audio, guárdalo como `dueto-recorrido.mp3`
// y reemplaza el JSON por una alineación real (formato «with-timestamps» de ElevenLabs).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const carpeta = new URL('../public/presentacion/', import.meta.url);

/** Segundos por carácter y pausas (ritmo de lectura tranquilo). */
const POR_CARACTER = 0.064;
const PAUSA = { ',': 0.18, ';': 0.25, ':': 0.25, '.': 0.4, '?': 0.4, '!': 0.4 };
const ENTRE_LINEAS = 0.7;
const INICIO = 0.4;
const COLA = 2.5;

const VOCES = { PAU: 'pau', JULES: 'jules' };

const lineas = readFileSync(new URL('guion-dueto.txt', carpeta), 'utf8')
  .split(/\n\s*\n/)
  .map((l) => l.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .map((l) => {
    const m = /^([A-ZÁÉÍÓÚÑ]+):\s*(.+)$/.exec(l);
    if (!m || !VOCES[m[1]]) throw new Error(`Línea sin voz (PAU: o JULES:): «${l}»`);
    return { voz: VOCES[m[1]], texto: m[2] };
  });

const characters = [];
const inicios = [];
const finales = [];
let t = INICIO;
lineas.forEach((linea, n) => {
  if (n > 0) {
    // Dos saltos de línea separan las líneas del guion; duran la pausa entre líneas.
    for (const dur of [0, ENTRE_LINEAS]) {
      characters.push('\n');
      inicios.push(t);
      t += dur;
      finales.push(t);
    }
  }
  for (const c of linea.texto) {
    characters.push(c);
    inicios.push(t);
    t += POR_CARACTER + (PAUSA[c] ?? 0);
    finales.push(t);
  }
});

const redondo = (x) => Math.round(x * 1000) / 1000;
writeFileSync(
  new URL('dueto-recorrido.alineacion.json', carpeta),
  `${JSON.stringify({
    texto: lineas.map((l) => l.texto).join('\n\n'),
    alineacion: {
      characters,
      character_start_times_seconds: inicios.map(redondo),
      character_end_times_seconds: finales.map(redondo),
    },
    voces: lineas.map((l) => l.voz),
  })}\n`,
);

const duracion = Math.ceil(t + COLA);
console.log(`Alineación: ${lineas.length} líneas, ${duracion} s.`);
try {
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono',
      '-t', String(duracion), '-c:a', 'libmp3lame', '-b:a', '16k',
      new URL('dueto-recorrido.mp3', carpeta).pathname,
    ],
    { stdio: 'inherit' },
  );
  console.log('Pista en silencio: dueto-recorrido.mp3');
} catch {
  console.warn(
    `No se pudo crear la pista con ffmpeg. Hace falta un dueto-recorrido.mp3 de al menos ${duracion} s.`,
  );
}
