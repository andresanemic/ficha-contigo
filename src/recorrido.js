'use strict';

// El recorrido de Ficha Contigo: la paciente autoriza una parte de su ficha, el
// acceso ocurre, un segundo profesional se pasa de alcance y queda bloqueado con
// su motivo, la ficha se corrige y deja de abrir, se revoca, y el acceso de
// emergencia que la paciente otorgó por adelantado se ejerce, deja recibo
// inmediato y deja una revisión que alguien tiene que cerrar.
//
// Cada línea sale de una ejecución real. Los datos son de ejemplo, la prueba de
// conocimiento cero va simulada, y esto no cumple ninguna norma.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FichaContigo } = require('./ficha-contigo.js');
const { verifyReceipt } = require('../vendor/vespi-kernel/receipt.js');

const T0 = '2026-09-29T12:00:00.000Z';
const T1 = '2026-09-29T13:00:00.000Z';
const T2 = '2026-10-05T09:00:00.000Z';

function linea(t = '') { process.stdout.write(`${t}\n`); }
function titulo(t) { linea(`\n── ${t}`); }

function mostrar(r) {
  linea(`  estado:   ${r.estado}`);
  if (r.detalle) linea(`  detalle:  ${r.detalle}`);
  if (r.salida) linea(`  salida:   ${r.salida}`);
  if (r.recibo) {
    linea(`  recibo:   ${r.recibo.status} · sello ${String(r.recibo.digest).slice(0, 16)}…`);
    linea(`  anclaje:  ${r.recibo.anchor.status} en ${r.recibo.anchor.network} — nada llegó a la red; esto NO se verificó afuera`);
  }
  if (r.revision) linea(`  revisión: ${r.revision.estado} · plazo ${r.revision.plazo} · ${r.revision.cerrada ? `veredicto «${r.revision.veredicto}»` : 'FALTA cerrarla'}`);
}

async function main() {
  const dir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'ficha-contigo-recorrido-'));
  const f = new FichaContigo({ dir });
  linea(`Ficha Contigo — recorrido completo. Registro en: ${path.join(dir, 'registro.jsonl')}`);
  linea('Paciente, instituciones, profesionales y partes de la ficha son de EJEMPLO. Sin red, sin blockchain, sin pagos, sin un tercero.');

  titulo('1. La paciente y su ficha');
  f.registrarPaciente({ id: 'persona-1', nombre: 'Paciente de ejemplo' });
  f.registrarInstitucion({ id: 'inst-1', nombre: 'Centro de Salud Alerce (ejemplo)' });
  f.registrarInstitucion({ id: 'inst-2', nombre: 'Instituto Proserpina (ejemplo)' });
  f.registrarProfesional({ id: 'prof-1', nombre: 'Profesional tratante (ejemplo)', institucion: 'inst-1' });
  f.registrarProfesional({ id: 'prof-2', nombre: 'Segundo profesional (ejemplo)', institucion: 'inst-2' });
  f.registrarParte({ id: 'parte-1', nombre: 'resultado de laboratorio', valor: 'VALOR DE EJEMPLO: 7,4' });
  f.registrarParte({ id: 'parte-2', nombre: 'informe de imagenología', valor: 'VALOR DE EJEMPLO: sin hallazgos' });
  f.registrarParte({ id: 'parte-3', nombre: 'antecedentes personales', valor: 'VALOR DE EJEMPLO: nada relevante' });
  for (const p of f.partes()) linea(`  ${p.id}  ${p.nombre}  v${p.version}  huella ${p.huella.slice(0, 16)}…`);

  titulo('2. El profesional pide, con propósito declarado, y todavía no tiene nada');
  f.solicitar({ profesional: 'prof-1', proposito: 'continuidad del tratamiento', parte: 'parte-1', motivo: 'la paciente me lo pidió en consulta' });
  const pedir = { clave: 'acc-1', profesional: 'prof-1', proposito: 'continuidad del tratamiento', parte: 'parte-1', unidades: '1' };
  mostrar(await f.acceder(pedir, { now: T0 }));

  titulo('3. La paciente autoriza SOLO esa parte, con reloj y presupuesto');
  f.conceder({
    persona: 'persona-1',
    id: 'aut-1',
    profesional: 'prof-1',
    proposito: 'continuidad del tratamiento',
    parte: 'parte-1',
    presupuesto: '2',
    vence: '2026-10-01T00:00:00.000Z',
    pauser: ['persona-1'],
  });
  linea('  aut-1: prof-1 abre parte-1, 2 accesos, hasta 2026-10-01, con la huella que tiene hoy.');

  titulo('4. El acceso ocurre dentro de lo autorizado');
  const uno = await f.acceder(pedir, { now: T0 });
  mostrar(uno);
  linea(`  entregado: ${String(f.accesos()[0].cuerpo.parte_entregada)}`);

  titulo('5 · ROJO 2 — el segundo profesional pide y se pasa de alcance');
  const otraParte = await f.acceder({ ...pedir, clave: 'acc-2', profesional: 'prof-1', parte: 'parte-2' }, { now: T0 });
  linea('  (a) pide otra parte de la misma ficha:');
  linea(`      estado: ${otraParte.estado} · ${otraParte.detalle}`);
  const otraInstitucion = await f.acceder({ ...pedir, clave: 'acc-3', profesional: 'prof-2' }, { now: T0 });
  linea('  (b) el mismo profesional de otra institución, sin permiso propio:');
  linea(`      estado: ${otraInstitucion.estado} · ${otraInstitucion.detalle}`);
  f.conceder({ persona: 'persona-1', id: 'aut-2', profesional: 'prof-2', proposito: 'continuidad del tratamiento', parte: 'parte-1', presupuesto: '1', vence: '2026-10-01T00:00:00.000Z', pauser: ['persona-1'] });
  const otroProposito = await f.acceder({ ...pedir, clave: 'acc-4', profesional: 'prof-2', proposito: 'revisión para un tercero' }, { now: T0 });
  linea('  (c) con su propio permiso, pero para un propósito que no es el declarado:');
  linea(`      estado: ${otroProposito.estado} · ${otroProposito.detalle}`);

  titulo('6 · ROJO 5 — la institución corrige la parte después de que la paciente la autorizó');
  const huellaAntes = f.partes().find((p) => p.id === 'parte-1').huella;
  f.corregirParte({ id: 'parte-1', valor: 'VALOR DE EJEMPLO: 9,9 (corregido)', por: 'inst-1', motivo: 'corrección de laboratorio' });
  const huellaDespues = f.partes().find((p) => p.id === 'parte-1').huella;
  linea(`  la parte-1 pasó de ${huellaAntes.slice(0, 12)}… a ${huellaDespues.slice(0, 12)}…`);
  const alterada = await f.acceder({ ...pedir, clave: 'acc-5' }, { now: T1 });
  linea(`  estado:  ${alterada.estado}`);
  linea(`  detalle: ${alterada.detalle}`);

  titulo('7 · ROJO 6 — la paciente revoca, y lo que ya ocurrió no se borra');
  f.revocar({ persona: 'persona-1', autorizacion: 'aut-1', motivo: 'ya no lo necesito' });
  const trasRevocar = await f.acceder({ ...pedir, clave: 'acc-6' }, { now: T1 });
  linea(`  acceso nuevo tras revocar → ${trasRevocar.estado}: ${trasRevocar.detalle}`);
  linea(`  accesos que siguen en el registro: ${f.accesos().length} (el acc-1 ocurrió antes de la revocación y no se borra)`);
  const revocacion = f.registroDeLaPaciente().find((l) => l.tipo === 'revocacion');
  linea(`  lo que dice el registro: ${String(revocacion.efecto)}`);

  titulo('8 · ROJO 3 — acceso de emergencia sin mandato previo');
  mostrar(await f.ejercitar({ ...pedir, clave: 'acc-7', proposito: 'atención de urgencia', motivo: 'la paciente está inconsciente' }, { now: T1 }));

  titulo('9 · ROJO 4 — la paciente lo otorga por adelantado, con motivo y con plazo de revisión');
  f.otorgarMandato({
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
  });
  linea('  mandato-1: 1 uso, hasta 2026-12-31, y hay que revisarlo antes del 2026-10-06.');
  const emergencia = await f.ejercitar({ ...pedir, clave: 'acc-8', proposito: 'atención de urgencia', motivo: 'la paciente está inconsciente' }, { now: T1 });
  mostrar(emergencia);
  const auditoriaSinRevisar = f.auditar(emergencia.recibo);
  linea(`  auditoría sin revisión cerrada → ${auditoriaSinRevisar.ok ? 'pasa' : 'NO pasa'}: ${String(auditoriaSinRevisar.motivo)}`);

  titulo('10 · la revisión se cierra, y se cierra desde el lado de la paciente');
  try {
    f.revisar({ acceso: 'acc-8', veredicto: 'justificado', revisora: 'prof-1', ahora: T2 });
  } catch (e) {
    linea(`  prof-1 intenta revisarlo: ${e.message}`);
  }
  const revision = f.revisar({ acceso: 'acc-8', veredicto: 'injustificado', revisora: 'persona-1', nota: 'la urgencia no era vital', ahora: T2 });
  linea(`  revisión cerrada: «${revision.veredicto}» por ${revision.revisora} — ${revision.nota}`);
  const auditoriaRevisada = f.auditar(emergencia.recibo);
  linea(`  auditoría con la revisión cerrada → ${auditoriaRevisada.ok ? 'pasa' : 'NO pasa'}: ${String(auditoriaRevisada.motivo)}`);

  titulo('11 · el presupuesto y el reloj también cortan');
  f.conceder({ persona: 'persona-1', id: 'aut-3', profesional: 'prof-2', proposito: 'segunda opinión', parte: 'parte-2', presupuesto: '1', vence: '2026-10-01T00:00:00.000Z', pauser: ['persona-1'] });
  const dentro = await f.acceder({ clave: 'acc-9', profesional: 'prof-2', proposito: 'segunda opinión', parte: 'parte-2', unidades: '1' }, { now: T1 });
  linea(`  dentro del presupuesto → ${dentro.estado}`);
  const fuera = await f.acceder({ clave: 'acc-10', profesional: 'prof-2', proposito: 'segunda opinión', parte: 'parte-2', unidades: '1' }, { now: T1 });
  linea(`  pasado el presupuesto → ${fuera.estado}: ${fuera.detalle}`);
  f.conceder({ persona: 'persona-1', id: 'aut-4', profesional: 'prof-1', proposito: 'control de la semana', parte: 'parte-3', presupuesto: '2', vence: '2026-10-01T00:00:00.000Z', pauser: ['persona-1'] });
  await f.acceder({ clave: 'acc-12', profesional: 'prof-1', proposito: 'control de la semana', parte: 'parte-3', unidades: '1' }, { now: T1 });
  const vencido = await f.acceder({ clave: 'acc-13', profesional: 'prof-1', proposito: 'control de la semana', parte: 'parte-3', unidades: '1' }, { now: T2 });
  linea(`  y con el reloj vencido → ${vencido.estado}: ${vencido.detalle}`);

  titulo('12 · la prueba de conocimiento cero: el flujo, con la prueba SIMULADA');
  const demo = f.demostrar({ afirmacion: 'tiene el esquema de vacunación al día', parte: 'parte-1' });
  linea(`  afirmación: «${demo.afirmacion}»`);
  linea(`  compromiso: ${demo.compromiso.slice(0, 32)}…`);
  linea(`  simulada:   ${String(demo.simulada)}`);
  linea(`  razón:      ${demo.razon}`);
  linea('  en pantalla se ve que alguien demostró algo sobre la ficha; no se ve el valor de la parte.');

  titulo('13 · la tercera parte audita cada recibo sin creer a nadie');
  for (const r of f.recibos()) {
    const sello = verifyReceipt(r.recibo);
    const a = f.auditar(r.recibo);
    linea(`  ${r.clave}: sello ${sello.ok ? 'verifica' : 'NO verifica'} · auditoría ${a.ok ? 'pasa' : 'NO pasa'}${a.ok ? '' : ` — ${a.motivo}`}`);
  }
  const creyente = { id: 'verificador-creyente', verificar: async () => ({ verified: true, checks: { me_lo_creo: true }, reason: 'me lo creo' }) };
  const conCreyente = await f.acceder({ clave: 'acc-14', profesional: 'prof-1', proposito: 'control de la semana', parte: 'parte-3', unidades: '1' }, { now: T1, verificador: creyente });
  const aCreyente = f.auditar(conCreyente.recibo);
  linea(`  acc-14 con un verificador que solo cree al ejecutor: el acceso dice ${conCreyente.estado}, la auditoría dice ${aCreyente.ok ? 'pasa' : 'NO pasa'} — ${aCreyente.motivo}`);

  titulo('14 · lo que la paciente puede leer sin Ficha Contigo');
  for (const l of f.registroDeLaPaciente()) {
    if (['paciente', 'institucion', 'profesional', 'operacion', 'recibo'].includes(l.tipo)) continue;
    linea(`  [${l.tipo}] ${l.texto}`);
  }
  linea('  — y el registro completo, con cada línea y su huella, está en: registro.jsonl');

  titulo('15 · lo que este recorrido NO demuestra');
  linea('  - No cumple la Ley 21.668 ni la Ley 19.628 ni ninguna otra norma. El texto de los artículos 12 y 13 se leyó el 2026-09-29 y es el problema que esto responde, no un cumplimiento.');
  linea('  - El reglamento del artículo 13 que la propia ley encarga NO se leyó ni se verificó: que esté publicado es NO VERIFICADO.');
  linea('  - No se afirma nada de la Ley 21.719: quedó NO VERIFICADA en los dos proyectos anteriores y ese estado no se hereda.');
  linea('  - La prueba de conocimiento cero va SIMULADA: el kernel 0.1.5 incluye un verificador ZK, pero este recorrido no lo integra: la prueba sigue SIMULADA.');
  linea('  - El acceso de emergencia se ejerce con la autoridad propia de Ficha Contigo; este recorrido no integra el módulo emergency.js del kernel 0.1.5.');
  linea('  - No hay hash en testnet ni recibo en explorador: el anclaje quedó en `pending` a propósito.');
  linea('  - No hay custodia de datos reales, ni interoperabilidad con un prestador, ni FHIR, ni permiso de nadie.');
  linea('  - La paciente, las instituciones, los profesionales y las partes de la ficha son de ejemplo.');
  linea('');
  return dir;
}

if (require.main === module) {
  main().then((dir) => { process.stdout.write(`registro: ${path.join(dir, 'registro.jsonl')}\n`); });
}

module.exports = { main };
