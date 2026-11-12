# Cobros dentro de «Pedidos de clientes»

`cobros.js` es el módulo de abonos con comprobante (agente Don Colón). No corre en este repositorio:
va insertado dentro del script principal del artefacto «Pedidos de clientes», donde están los datos.
Aquí se guarda la fuente y sus pruebas.

- **Dónde está instalado:** solo en la copia privada de prueba, con clientas inventadas. La app real
  no se ha tocado.
- **Qué agrega:** la vista «🧾 Cobros» (se abre desde «Por cobrar»), abonos nuevos en `pagos` con
  referencia, método, autor y origen, y apuntes en la colección nueva `auditoria`.
- **Qué no cambia:** ningún documento existente. El saldo y las estadísticas los sigue calculando la app.

Pruebas (datos inventados): `npm test`

Para instalarlo en el artefacto hay que insertarlo antes de `/* ---------- arranque ---------- */`,
envuelto en una función que deje visible `xvCobros`, y registrar la vista `cobros` en `XV_NAMES`,
`XV_TITLES` y el mapa de `xvRefresh`.
