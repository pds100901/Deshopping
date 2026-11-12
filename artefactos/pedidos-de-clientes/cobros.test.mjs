// Pruebas del módulo de Cobros con datos inventados. Correr con: node --test artefactos/
// El módulo vive dentro de «Pedidos de clientes»; aquí se le da una versión mínima de lo que
// esa app le presta (abonos en memoria y el mismo cálculo de saldo: lo no confirmado no cuenta).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fuente = readFileSync(new URL('./cobros.js', import.meta.url), 'utf8');

function app({ hoy = '2026-11-12' } = {}) {
  const raw = { pays: {} };
  const state = { clients: {} };
  const escritos = [];
  let n = 0;
  const entorno = {
    raw, state, ui: {}, view: { name: 'cobros' }, mode: 'db', myUid: 'u_prueba',
    dbx: { doc: (ruta) => ({ set: async (d) => { escritos.push({ ruta, d }); } }) },
    nid: () => 'id' + ++n,
    round2: (x) => Math.round(x * 100) / 100,
    todayStr: () => hoy,
    dateFromStr: (s) => new Date(s + 'T12:00:00').toISOString(),
    parsePrice: (s) => Number(String(s).replace(/[^0-9.]/g, '')) || 0,
    fmtC: (x) => '₡' + Math.round(x),
    fmtDate: (iso) => String(iso).slice(0, 10),
    esc: (s) => String(s),
    logH: () => {},
    commitProofObj: (o) => o.id,
    clientCalc: (c) => {
      const total = c.total;
      const paid = Object.values(raw.pays).filter((p) => p.clientId === c.id && p.verif !== false).reduce((s, p) => s + p.amount, 0);
      return { total, paid, debe: total - paid };
    },
    putPay: (p) => { raw.pays[p.id] = p; },
    sampleFn: null, invErrText: () => '', compressDoc: async () => '', toast: () => {},
    $: () => null, xvPl: (k, a, b) => k + ' ' + (k === 1 ? a : b), openClient: () => {}, openXv: () => {},
  };
  const nombres = Object.keys(entorno);
  const exporta = 'return { cbRegister, cbConfirm, cbDupes, cbMatch, cbBest, cbPayId, cbRef, cbDay, cbRead, cbDebe };';
  const api = new Function(...nombres, fuente + '\n' + exporta)(...nombres.map((k) => entorno[k]));
  const clienta = (id, name, total) => { state.clients[id] = { id, name, total }; };
  return { ...api, raw, state, escritos, entorno, clienta };
}

const abono = (extra = {}) => ({ clientId: 'c1', amount: 15000, day: '2026-11-10', ref: '2026111098765', metodo: 'SINPE Móvil', note: '', ...extra });

test('un abono confirmado baja el saldo por el monto exacto', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  const r = a.cbRegister(abono(), true);
  assert.equal(r.ok, true);
  assert.equal(r.antes, 40000);
  assert.equal(r.despues, 25000);
  assert.equal(a.cbDebe('c1'), 25000);
  assert.equal(r.p.origen, 'cobros');
  assert.equal(r.p.creadoPor, 'u_prueba');
  assert.equal(r.p.verifPor, 'u_prueba');
});

test('el mismo comprobante enviado dos veces deja un solo abono', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  assert.equal(a.cbRegister(abono(), true).ok, true);
  const r2 = a.cbRegister(abono(), true);
  assert.equal(r2.ok, false);
  assert.ok(r2.dup);
  assert.equal(Object.keys(a.raw.pays).length, 1);
  assert.equal(a.cbDebe('c1'), 25000);
});

test('la misma referencia no se puede registrar en otra clienta ni con otro formato', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000); a.clienta('c2', 'Clienta Dos Prueba', 9000);
  a.cbRegister(abono(), true);
  const r = a.cbRegister(abono({ clientId: 'c2', amount: 9000, ref: '2026-1110 98765' }), true);
  assert.equal(r.ok, false);
  assert.equal(r.dup.clientId, 'c1');
  assert.equal(a.cbDebe('c2'), 9000);
});

test('el id sale de los datos del pago: dos dispositivos escriben el mismo documento', () => {
  const a = app(), b = app();
  a.clienta('c1', 'Clienta Uno Prueba', 40000); b.clienta('c1', 'Clienta Uno Prueba', 40000);
  assert.equal(a.cbRegister(abono(), true).p.id, b.cbRegister(abono(), true).p.id);
});

test('un abono por confirmar no cambia el saldo; al confirmarlo sí', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  const r = a.cbRegister(abono(), false);
  assert.equal(r.ok, true);
  assert.equal(r.p.verif, false);
  assert.equal(a.cbDebe('c1'), 40000);
  const c = a.cbConfirm(r.p.id);
  assert.equal(c.antes, 40000);
  assert.equal(c.despues, 25000);
  assert.equal(a.raw.pays[r.p.id].verif, true);
  assert.equal(a.cbConfirm(r.p.id), null, 'confirmar dos veces no hace nada');
  assert.equal(a.cbDebe('c1'), 25000);
});

test('sin referencia: avisa si hay un abono igual ese día y solo pasa si se acepta', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  assert.equal(a.cbRegister(abono({ ref: '' }), true).ok, true);
  const r = a.cbRegister(abono({ ref: '' }), true);
  assert.equal(r.ok, false);
  assert.equal(r.same.length, 1);
  assert.equal(a.cbRegister(abono({ ref: '' }), true, true).ok, true);
  assert.equal(a.cbDebe('c1'), 10000);
});

test('rechaza datos incompletos o imposibles', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  assert.equal(a.cbRegister(abono({ clientId: 'nadie' }), true).ok, false);
  assert.equal(a.cbRegister(abono({ amount: 0 }), true).ok, false);
  assert.equal(a.cbRegister(abono({ amount: -5 }), true).ok, false);
  assert.equal(a.cbRegister(abono({ day: '2026-11-13' }), true).ok, false, 'fecha futura');
  assert.equal(a.cbRegister(abono({ day: '10/11/2026' }), true).ok, false);
  assert.equal(Object.keys(a.raw.pays).length, 0);
});

test('cada registro y cada confirmación dejan un apunte de auditoría', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  const r = a.cbRegister(abono(), false);
  a.cbConfirm(r.p.id);
  const apuntes = a.escritos.filter((e) => e.ruta.startsWith('auditoria/')).map((e) => e.d);
  assert.deepEqual(apuntes.map((d) => d.accion), ['abono-por-confirmar', 'abono-confirmado']);
  assert.equal(apuntes[1].saldoAntes, 40000);
  assert.equal(apuntes[1].saldoDespues, 25000);
  assert.equal(apuntes[1].by, 'u_prueba');
  assert.equal(apuntes[1].pagoId, r.p.id);
});

test('no toca los abonos que ya existían', () => {
  const a = app(); a.clienta('c1', 'Clienta Uno Prueba', 40000);
  const viejo = { id: 'viejo', clientId: 'c1', amount: 5000, date: '2026-10-01T18:00:00.000Z', note: '', proof: '' };
  a.raw.pays.viejo = viejo;
  const copia = JSON.stringify(viejo);
  a.cbRegister(abono(), true);
  assert.equal(JSON.stringify(a.raw.pays.viejo), copia);
  assert.equal(a.cbDebe('c1'), 20000);
});

test('busca a la clienta por el nombre de quien pagó', () => {
  const a = app();
  a.clienta('c1', 'María Fernanda Prueba', 1); a.clienta('c2', 'Fernanda Ejemplo', 1); a.clienta('c3', 'Otra Persona', 1);
  assert.deepEqual(a.cbMatch('MARIA FERNANDA PRUEBA SOLANO').map((c) => c.id), ['c1', 'c2']);
  assert.deepEqual(a.cbMatch(''), []);
  assert.equal(a.cbBest('MARIA FERNANDA PRUEBA SOLANO'), 'c1', 'una clienta claramente mejor');
  assert.equal(a.cbBest('FERNANDA'), '', 'empate: no elige sola');
  assert.equal(a.cbBest('OTRA'), 'c3', 'única coincidencia');
});

test('lectura con IA: valida lo que devuelve el modelo', async () => {
  const conIA = (resp) => {
    const x = app();
    const nombres = Object.keys(x.entorno);
    x.entorno.sampleFn = { json: async () => resp };
    return new Function(...nombres, fuente + '\nreturn cbRead;')(...nombres.map((k) => x.entorno[k]))({});
  };
  const bien = await conIA({ monto_crc: 15000, fecha: '2026-11-10', referencia: 'Ref: 2026-1110 98765', remitente: 'Clienta Uno', metodo: 'SINPE Móvil', detalle: 'pedido', legible: true });
  assert.deepEqual(bien, { ok: true, amount: 15000, day: '2026-11-10', ref: 'REF2026111098765', remitente: 'Clienta Uno', metodo: 'SINPE Móvil', note: 'pedido' });
  const raro = await conIA({ monto_crc: 'mucho', fecha: '2031-01-01', referencia: null, remitente: null, metodo: 'Bitcoin', detalle: null, legible: true });
  assert.deepEqual(raro, { ok: true, amount: 0, day: '', ref: '', remitente: '', metodo: '', note: '' });
  assert.deepEqual(await conIA({ legible: false }), { ok: false });
});
