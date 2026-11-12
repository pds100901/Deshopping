# La oficina de De Shopping con Pau

Una oficina en 3D con los 19 personajes (agentes de IA) que ayudan a llevar **De Shopping con Pau**: catálogo,
pedidos, compras en SHEIN y Temu, contenido, finanzas y agenda. Jules, la mano derecha de Pau, reparte
el trabajo. Cada agente abre el artefacto de claude.ai con el que trabaja.

Está hecha sobre «Oficina de Jules», de @elkis.dev (React Three Fiber), adaptada a la marca: rosados,
verde salvia, Playfair Display y Poppins.

## Requisitos

- Node 22 o superior (`node -v` para comprobarlo).
- Un navegador con WebGL (cualquier Chrome, Safari, Edge o Firefox reciente).

## Instalar

```bash
npm install
npm run dev
```

Abrí `http://127.0.0.1:5180` en el navegador. Si ese puerto está ocupado, Vite muestra otro en la terminal.

1. Antes de empezar podés explorar: tocá agentes, dales órdenes y mové la cámara. Elegí la hora del día con **1** (atardecer), **2** (noche) o **3** (día, la inicial).
2. Tocá **Empezar** para el recorrido guiado. La cámara entra a cada área y enfoca a cada agente por su nombre; un cursor animado abre los paneles de Vicky Vitrina, Clara Clic, Gigi Guion y Coco Caja.
3. Con la **barra espaciadora** (o el botón de abajo a la derecha) pausás y reanudás.
4. Al final te entrega la cámara. Con la tecla **R** volvés a empezar.

El recorrido va **con subtítulos y sin narración**: el guion es nuevo y todavía no tiene voz grabada (ver
«Ponerle voz al recorrido»). Las confirmaciones cortas de Jules al dar una orden sí suenan.

Para grabar en pantalla, la tecla **H** oculta los botones y el cursor del mouse.

`http://127.0.0.1:5180/?lab` abre el laboratorio: 9, 18 o 30 agentes, vestidor y medidor de rendimiento.

Para publicarla en un sitio: `npm run build` y subí la carpeta `dist/`. Ahí los agentes responden
siempre con sus frases guardadas (ver «Darle inteligencia»).

## El equipo

Siete personajes vienen de las hojas «Agentes de Claude» de Pau (marcados con ★); los otros doce se
crearon con el mismo estilo. Las fichas completas están en `docs/personajes.md`.

| Área (lugar en la casa) | Personaje | Rol | Artefacto que abre |
| --- | --- | --- | --- |
| Tienda en línea (piso 3) | Vicky Vitrina | Catálogo | Disponible ahora |
| | Rafa Repisa ★ | Bodega | Disponible ahora |
| | Lola Lazo | Regalos | Armá tu regalo |
| | Clara Clic | Publicación (pide aprobación) | Disponible ahora |
| Pedidos (piso 2) | Coco Caja ★ | Ventas (pide aprobación) | Pedidos de clientes |
| | Nati Nota | Pedidos | Pedidos de clientes |
| | Pepe Precio | Cotizaciones | Cotizador |
| Contenido (piso 3) | Brillitos ★ | Diseño y contenido | Plantillas, Brand Kit, Manual de marca |
| | Gigi Guion | Guiones | Banco de contenido |
| | Rolo Reel | Video | Videos «Cómo pedir» y «Cómo usar tu catálogo» |
| Finanzas (piso 2) | Grace Gráfica ★ | Reportes y estadísticas | Pedidos de clientes |
| | Don Colón ★ | Cobros | Pedidos de clientes |
| | Coni Cupón | Promociones | Códigos de descuento |
| Agenda y viajes (piso 1) | Rita Ruta ★ | Entregas | Pedidos de clientes |
| | Ana Agenda | Agenda | Agenda de Pau |
| | Beto Boleto | Viajes | Agenda de Pau |
| Compras (torre) | Vale Maleta ★ | Compras | Pedidos SHEIN, Pedidos Temu |
| | Cari Carrito | Carritos | Pedidos SHEIN, Pedidos Temu |
| | Olga Oferta | Ofertas | Códigos de descuento |

En la escena cada uno es un muñeco de bloques con los colores, el peinado y los accesorios de su hoja
(una versión simplificada, no la ilustración). El panel muestra el retrato ilustrado de los siete que
ya tienen hoja y la inicial de los demás.

Los enlaces a los artefactos solo abren para quien tiene acceso a cada uno en claude.ai.

Los agentes **no leen ni cambian los artefactos**: el enlace los abre en otra pestaña. Los nombres, las
tareas y los estados de arriba son de ejemplo, no datos en vivo de la tienda.

## Controles

- **Arrastrar**: girar la casa.
- **Rueda del mouse o pellizco**: acercar y alejar.
- **Tocar una sala**: la cámara entra a esa área.
- **Doble toque**: acerca la cámara a ese punto.
- **Vista general** (abajo a la izquierda): vuelve a ver la casa completa.

## Dar órdenes a los agentes

1. Tocá a un agente: se abre su panel con su rol, su estado, su tarea y sus artefactos.
2. Escribí una orden en «Dale una orden…» (Enter envía) o tocá una de las sugerencias.
3. El agente responde y Jules confirma con una frase pregrabada.
4. Clara Clic (Publicación) y Coco Caja (Ventas) nunca actúan solas: esperan **Aprobar** o
   **Rechazar**. Lo mismo pasa con cualquier agente si la orden es delicada (borrar datos, pagar, enviar).

**Esc** cierra el panel.

## Darle inteligencia (opcional)

Sin esto la oficina funciona igual: los agentes responden con frases guardadas (modo local).
Con una clave, cada agente responde con un modelo de Claude, a su manera y sabiendo de qué trata el negocio.

1. Copiá el archivo de ejemplo: `cp .env.example .env`.
2. En [console.anthropic.com](https://console.anthropic.com) creá una clave en «API keys» y pegala en `ANTHROPIC_API_KEY`.
   Necesita saldo cargado en esa consola: **no es la suscripción de Claude** (Pro o Max), se paga aparte.
3. `TU_NOMBRE` ya viene como `Pau`: así te llaman los agentes.
4. `ANTHROPIC_MODEL` es el modelo que responde. Por defecto es `claude-haiku-5-5`, el más barato.
5. Volvé a correr `npm run dev`.

Si la clave falta, está mal o se acaba el saldo, el agente responde igual con su frase guardada.

La clave se queda en tu computadora: la lee solo el servidor local de esta carpeta. Nunca llega al
navegador. El archivo `.env` está en `.gitignore`: no lo subás a ningún lado.

**No publiqués la oficina con `npm run preview` en un servidor.** Ese comando es para probar en tu
computadora. Si la subís como sitio (la carpeta `dist/`), los agentes responden en modo local.

### Qué hace el cerebro

Cuando le das una orden a un agente, el servidor local (`servidor/`) se la pasa primero al cerebro de
Jules (`cerebro/`) y solo después al modelo:

- **Mide el riesgo** de la orden, de 0 (solo mirar) a 3 (crítico). Borrar datos, pagar o enviar algo es crítico.
- **Decide a qué área va** (Tienda en línea, Pedidos, Contenido, Finanzas, Agenda y viajes o Compras).
- **Pide tu aprobación cuando algo es delicado.** La lista de roles que siempre esperan está en
  `src/app/presentacion/aprobacion.ts`.
- **No obedece instrucciones escondidas** en textos copiados de otra parte (`cerebro/decision/cuarentena.ts`).
- **Habla como la marca**: español de Costa Rica con voseo, cálido y breve (`cerebro/personalidad/carta-generica.ts`
  y `servidor/orden.ts`).

Lo que no hace: no recuerda nada entre una orden y otra, no se conecta a WhatsApp ni a los artefactos,
y los agentes no ejecutan nada de verdad: responden y esperan tu decisión.

## Personalizar

| Qué | Dónde |
| --- | --- |
| Nombres y personalidad de los personajes | `src/app/personajes.ts` |
| Roles, tareas y estados de los agentes | `src/app/roster.ts` |
| Artefacto de cada rol (enlaces) | `src/app/artefactos.ts` |
| Sugerencias y respuestas guardadas | `src/app/presentacion/ordenes.ts` |
| Nombres y colores de las áreas | `src/oficina/render/layout.ts` y `src/oficina/mansion/plano.ts` |
| Ropa de cada rol | `src/oficina/vestuario/roles.ts` |
| Colores y fuentes de los paneles | `src/app/estilos.css` (bloque `:root`) |
| Guion del recorrido | `public/presentacion/guion-dueto.txt` |
| Qué hace la cámara en cada frase | `src/app/presentacion/guion.ts` |

Si cambiás el guion, corré `node herramientas/generar-recorrido.mjs` para rehacer los tiempos. Las frases
que `guion.ts` usa como ancla (por ejemplo «Vicky» o «si la toco») tienen que seguir en el texto.

## Ponerle voz al recorrido

El recorrido se mueve con el reloj de `public/presentacion/dueto-recorrido.mp3` y con los tiempos de
`dueto-recorrido.alineacion.json`. Hoy la pista es silencio y los tiempos son a ritmo de lectura,
generados por `herramientas/generar-recorrido.mjs` (necesita `ffmpeg`).

Para narrarlo: grabá el guion completo en un solo audio (Pau y Jules), guardalo como
`dueto-recorrido.mp3` y reemplazá el JSON por una alineación real con el formato «with-timestamps»
de ElevenLabs.

## Créditos y licencias

Basada en «Oficina de Jules», hecha por @elkis.dev (licencia MIT, ver `LICENSE`). Detalle de licencias
de terceros en `LICENCIAS.md`.
