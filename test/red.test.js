'use strict';

// RED de Ficha Contigo. Escrito ANTES del código, el 2026-09-29.
//
// Los siete casos que nombra la consigna: entrega de datos clínicos sin
// autorización con propósito declarado; profesional que pide acceso y excede el
// alcance; acceso de emergencia ejercido sin que la persona lo haya otorgado por
// adelantado; acceso de emergencia sin revisión posterior; ficha alterada después
// de autorizada; revocación que no cierra un acceso ya ocurrido, y el registro lo
// tiene que mostrar; y el caso de control, un acceso dentro de lo autorizado que
// debe poder ocurrir.
//
// Más los que le son propios: el acceso no se repite, el recibo editado a mano no
// verifica, el verificador que solo cree al ejecutor no puede dar verde, la
// demostración de conocimiento cero no transporta el dato y se declara simulada, y
// el registro es un archivo que la paciente puede abrir sin Ficha Contigo.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { FichaContigo } = require('../src/ficha-contigo.js');

const T0 = '2026-09-29T12:00:00.000Z';
const T1 = '2026-09-29T13:00:00.000Z';
const T2 = '2026-10-05T09:00:00.000Z';

function temporal() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ficha-contigo-'));
}

function ficha() {
  const f = new FichaContigo({ dir: temporal() });
  f.registrarPaciente({ id: 'persona-1', nombre: 'Paciente de ejemplo' });
  f.registrarInstitucion({ id: 'inst-1', nombre: 'Centro de Salud Alerce (ejemplo)' });
  f.registrarInstitucion({ id: 'inst-2', nombre: 'Instituto Proserpina (ejemplo)' });
  f.registrarProfesional({ id: 'prof-1', nombre: 'Profesional tratante (ejemplo)', institucion: 'inst-1' });
  f.registrarProfesional({ id: 'prof-2', nombre: 'Segundo profesional (ejemplo)', institucion: 'inst-2' });
  f.registrarParte({ id: 'parte-1', nombre: 'resultado de laboratorio', valor: 'VALOR DE EJEMPLO: 7,4' });
  f.registrarParte({ id: 'parte-2', nombre: 'informe de imagenología', valor: 'VALOR DE EJEMPLO: sin hallazgos' });
  f.registrarParte({ id: 'parte-3', nombre: 'antecedentes personales', valor: 'VALOR DE EJEMPLO: nada relevante' });
  return f;
}

const AUTORIZACION = {
  persona: 'persona-1',
  id: 'aut-1',
  profesional: 'prof-1',
  proposito: 'continuidad del tratamiento',
  parte: 'parte-1',
  presupuesto: '2',
  vence: '2026-10-01T00:00:00.000Z',
  pauser: ['persona-1'],
};

const MANDATO = {
  persona: 'persona-1',
  id: 'mandato-1',
  profesional: 'prof-1',
  proposito: 'atención de urgencia',
  parte: 'parte-1',
  motivo: 'la paciente no puede ser encontrada y hay una urgencia vital',
  presupuesto: '1',
  vence: '2026-12-31T00:00:00.000Z',
  revision_antes: '2026-10-06T00:00:00.000Z',
  pauser: ['persona-1'],
};

const ACCESO = {
  clave: 'acc-1',
  profesional: 'prof-1',
  proposito: 'continuidad del tratamiento',
  parte: 'parte-1',
  unidades: '1',
};

test('1 · la entrega de datos clínicos sin autorización no abre, aunque el propósito esté declarado', async () => {
  const f = ficha();
  f.solicitar({ profesional: 'prof-1', proposito: 'continuidad del tratamiento', parte: 'parte-1', motivo: 'la paciente me lo pidió en consulta' });
  const r = await f.acceder(ACCESO, { now: T0 });
  assert.equal(r.estado, 'bloqueado');
  assert.match(r.detalle, /no hay autorizaci/);
  assert.match(r.salida, /persona-1|la paciente/);
  assert.equal(r.recibo.status, 'blocked');
  assert.equal(f.accesos().length, 0, 'nada se entregó sin autorización');
});

test('2 · el profesional que excede el alcance queda bloqueado, con su motivo', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  // Misma institución, otra parte de la ficha.
  const otraParte = await f.acceder({ ...ACCESO, clave: 'acc-2', parte: 'parte-2' }, { now: T0 });
  assert.equal(otraParte.estado, 'bloqueado');
  assert.match(otraParte.detalle, /parte-1/);
  assert.match(otraParte.detalle, /parte-2/);
  // Mismo profesional, pero de otra institución: el destino no se cruza solo.
  const otraInstitucion = await f.acceder({ ...ACCESO, clave: 'acc-3', profesional: 'prof-2' }, { now: T0 });
  assert.equal(otraInstitucion.estado, 'bloqueado');
  // Y con propósito propio, que es el motivo real por el que llega el segundo.
  f.conceder({ ...AUTORIZACION, id: 'aut-2', profesional: 'prof-2' });
  const otroProposito = await f.acceder({ ...ACCESO, clave: 'acc-4', profesional: 'prof-2', proposito: 'revisión para un tercero' }, { now: T0 });
  assert.equal(otroProposito.estado, 'bloqueado');
  assert.match(otroProposito.detalle, /continuidad del tratamiento/);
  assert.match(otroProposito.detalle, /revisión para un tercero/);
});

test('3 · el acceso de emergencia sin otorgamiento previo no existe', async () => {
  const f = ficha();
  const r = await f.ejercitar({ ...ACCESO, clave: 'acc-5', proposito: 'atención de urgencia', motivo: 'la paciente está inconsciente' }, { now: T0 });
  assert.equal(r.estado, 'bloqueado');
  assert.match(r.detalle, /mandato|otorgado por adelantado|no hay/i);
  assert.equal(r.revision, null, 'un acceso que no ocurrió no genera revisión pendiente');
  assert.equal(f.accesos().length, 0);
});

test('4 · el acceso de emergencia deja revisión abierta y sin cerrar no pasa la auditoría', async () => {
  const f = ficha();
  f.otorgarMandato(MANDATO);
  const r = await f.ejercitar({ ...ACCESO, clave: 'acc-6', proposito: 'atención de urgencia', motivo: 'la paciente está inconsciente' }, { now: T0 });
  assert.equal(r.estado, 'verificado');
  assert.ok(r.revision, 'el acceso ejercido deja revisión abierta');
  assert.equal(r.revision.estado, 'pendiente');
  // Mientras esté pendiente, la auditoría no da verde: es un acceso sin revisar.
  const antes = f.auditar(r.recibo);
  assert.equal(antes.ok, false);
  assert.match(antes.motivo, /revisi/);
  assert.match(antes.motivo, /acc-6/);
  // La paciente (o su designada) revisa y la auditoría pasa, con el veredicto a la vista.
  f.revisar({ acceso: 'acc-6', veredicto: 'injustificado', revisora: 'persona-1', nota: 'no había urgencia vital', ahora: T1 });
  const despues = f.auditar(r.recibo);
  assert.equal(despues.ok, true);
  assert.equal(despues.revision.veredicto, 'injustificado');
  // Y la revisión no la cierra quien ejerció el acceso: se revisa desde otro lado.
  assert.throws(
    () => f.revisar({ acceso: 'acc-6', veredicto: 'justificado', revisora: 'prof-1', ahora: T1 }),
    /revisi/i,
  );
});

test('5 · la ficha alterada después de autorizada deja de abrir, y el bloqueo nombra las dos huellas', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  const r = await f.acceder(ACCESO, { now: T0 });
  assert.equal(r.estado, 'verificado');
  const antes = f.partes().find((p) => p.id === 'parte-1');
  // La institución corrige la parte de la ficha después de que la paciente la autorizó.
  f.corregirParte({ id: 'parte-1', valor: 'VALOR DE EJEMPLO: 9,9 (corregido)', por: 'inst-1', motivo: 'corrección de laboratorio' });
  const despues = await f.acceder({ ...ACCESO, clave: 'acc-2' }, { now: T1 });
  assert.equal(despues.estado, 'bloqueado');
  assert.match(despues.detalle, /autoriz/);
  assert.match(despues.detalle, new RegExp(antes.huella.slice(0, 12)));
  const ahora = f.partes().find((p) => p.id === 'parte-1');
  assert.match(despues.detalle, new RegExp(ahora.huella.slice(0, 12)));
  assert.notEqual(antes.huella, ahora.huella, 'la corrección cambió la huella de la parte');
});

test('6 · la revocación no cierra un acceso ya ocurrido, y el registro lo muestra', async () => {
  const f = ficha();
  f.conceder({ ...AUTORIZACION, presupuesto: '2' });
  const uno = await f.acceder({ ...ACCESO, clave: 'acc-1' }, { now: T0 });
  assert.equal(uno.estado, 'verificado');
  f.revocar({ persona: 'persona-1', autorizacion: 'aut-1', motivo: 'ya no lo necesito' });
  const despues = await f.acceder({ ...ACCESO, clave: 'acc-2' }, { now: T1 });
  assert.equal(despues.estado, 'bloqueado');
  assert.match(despues.detalle, /revocad/);
  // El acceso ya ocurrido no se borra: sigue en el registro, con su orden real.
  assert.equal(f.accesos().length, 1);
  assert.equal(f.accesos()[0].clave, 'acc-1');
  const vista = f.registroDeLaPaciente();
  const tipos = vista.map((l) => l.tipo);
  assert.ok(indiceDe(tipos, 'acceso') < indiceDe(tipos, 'revocacion'), 'el acceso va antes de la revocación en el registro');
  const revocacion = vista.find((l) => l.tipo === 'revocacion');
  assert.match(revocacion.efecto, /no cierra|no deshace|ocurrido/i);
  // Y el recibo del acceso que ya ocurrió sigue sellado: revocar no reescribe el pasado.
  assert.equal(f.accesos()[0].cuerpo.autorizacion, 'aut-1');
});

test('7 · caso de control: un acceso dentro de lo autorizado sí ocurre y se verifica', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  const r = await f.acceder(ACCESO, { now: T0 });
  assert.equal(r.estado, 'verificado');
  assert.equal(r.recibo.status, 'verified');
  assert.equal(r.recibo.anchor.status, 'pending', 'nada llegó a una red');
  const auditoria = f.auditar(r.recibo);
  assert.equal(auditoria.ok, true, auditoria.motivo);
  const entregado = f.accesos()[0].cuerpo;
  assert.equal(entregado.parte, 'parte-1');
  assert.equal(entregado.parte_entregada, 'VALOR DE EJEMPLO: 7,4');
  assert.equal(entregado.huella_entregada, f.partes().find((p) => p.id === 'parte-1').huella);
});

test('8 · el mismo acceso no se ejecuta dos veces: el segundo devuelve el recibo del primero', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  const uno = await f.acceder(ACCESO, { now: T0 });
  const dos = await f.acceder(ACCESO, { now: T1 });
  assert.equal(uno.estado, 'verificado');
  assert.equal(dos.estado, 'repetido');
  assert.equal(dos.recibo.digest, uno.recibo.digest);
  assert.equal(f.accesos().length, 1);
});

test('9 · un recibo editado a mano no verifica', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  const r = await f.acceder(ACCESO, { now: T0 });
  const { verifyReceipt } = require('../vendor/vespi-kernel/receipt.js');
  assert.equal(verifyReceipt(r.recibo).ok, true);
  assert.equal(verifyReceipt({ ...r.recibo, detail: 'todo bien' }).ok, false);
});

test('10 · un verificador que solo cree al ejecutor no puede producir un verde en la auditoría', async () => {
  const f = ficha();
  f.conceder(AUTORIZACION);
  const r = await f.acceder({ ...ACCESO, clave: 'acc-9' }, {
    now: T0,
    verificador: { verificar: async () => ({ verified: true, checks: { me_lo_creo: true }, reason: 'me lo creo' }) },
  });
  assert.equal(r.estado, 'verificado', 'el kernel acepta lo que le digan');
  const auditoria = f.auditar(r.recibo);
  assert.equal(auditoria.ok, false);
  assert.match(auditoria.motivo, /creyó al ejecutor/);
});

test('11 · la demostración de conocimiento cero no transporta el dato y se declara simulada', async () => {
  const f = ficha();
  const d = f.demostrar({ afirmacion: 'tiene el esquema de vacunación al día', parte: 'parte-1' });
  assert.equal(d.simulada, true);
  assert.match(d.razon, /0\.1\.4|simulad/i);
  assert.ok(d.compromiso && d.compromiso.length === 64, 'hay un compromiso, y es una huella');
  const serializado = JSON.stringify(d);
  assert.ok(!serializado.includes('7,4'), 'la demostración no lleva el valor de la parte');
  assert.ok(!serializado.includes('laboratorio'), 'ni siquiera el nombre de la parte viaja en claro');
  // Y queda en el registro, para que la paciente vea que se demostró algo.
  assert.equal(f.demostraciones().length, 1);
  assert.equal(f.demostraciones()[0].simulada, true);
});

test('12 · el registro es un archivo que la paciente puede abrir sin Ficha Contigo', async () => {
  const dir = temporal();
  const f = new FichaContigo({ dir });
  f.registrarPaciente({ id: 'persona-1', nombre: 'Paciente de ejemplo' });
  f.registrarInstitucion({ id: 'inst-1', nombre: 'Centro de Salud Alerce (ejemplo)' });
  f.registrarProfesional({ id: 'prof-1', nombre: 'Profesional tratante (ejemplo)', institucion: 'inst-1' });
  f.registrarParte({ id: 'parte-1', nombre: 'resultado de laboratorio', valor: 'VALOR DE EJEMPLO: 7,4' });
  f.solicitar({ profesional: 'prof-1', proposito: 'continuidad del tratamiento', parte: 'parte-1', motivo: 'consulta' });
  f.conceder(AUTORIZACION);
  f.revocar({ persona: 'persona-1', autorizacion: 'aut-1', motivo: 'ya no' });
  const crudo = fs.readFileSync(path.join(dir, 'registro.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
  assert.ok(crudo.some((x) => x.tipo === 'solicitud'));
  assert.ok(crudo.some((x) => x.tipo === 'autorizacion'));
  assert.ok(crudo.some((x) => x.tipo === 'revocacion'));
  assert.ok(crudo.every((x) => x.en !== undefined), 'cada línea dice cuándo pasó');
});

// --- el corte del núcleo, verificado por bytes ---
const KERNEL = path.join(__dirname, '..', 'vendor', 'vespi-kernel');
const ESPERADOS = {
  'authority.js': 'fcf7952489d6f9c42616b52f54832524926d2f2ba6c0ea6514480a7bdc7a265e',
  'continuity.js': 'abbee9cab8c92b2c4680dba2d573bf8eb6a50ab63194e4a0b0b525af5f044e6c',
  'delegation.js': '357d8b9398ac2b2c3508565e6c2293cc6abff3801f09a60f985dc1c781e002a3',
  'operation.js': '9a95815fc10435cb55415da1531e1545168eaf209518630b83f24b10f0e78d48',
  'receipt.js': 'd006eff3538b2c701366ba09d1e41a32d267b2bad44177f0095541ce9b2a644d',
};

test('13 · el núcleo que consume Ficha Contigo es el corte fijado, módulo por módulo', () => {
  for (const [archivo, esperado] of Object.entries(ESPERADOS)) {
    const crudo = fs.readFileSync(path.join(KERNEL, archivo));
    const cuerpo = crudo.slice(crudo.indexOf(10, crudo.indexOf(10, crudo.indexOf(10) + 1) + 1) + 1);
    assert.equal(
      require('node:crypto').createHash('sha256').update(cuerpo).digest('hex'),
      esperado,
      `${archivo}: el núcleo se movió; repínalo a mano y vuelve a correr la suite`,
    );
  }
});

function indiceDe(lista, tipo) {
  const i = lista.indexOf(tipo);
  assert.notEqual(i, -1, `el registro no tiene una línea de tipo ${tipo}`);
  return i;
}
