'use strict';

// La interfaz de Ficha Contigo: la paciente autoriza, revoca, otorga el mandato
// de emergencia, y el profesional pide y accede, sin saber nada del kernel.

const fs = require('node:fs');
const path = require('node:path');
const { FichaContigo } = require('./ficha-contigo.js');
const { verifyReceipt } = require('../vendor/vespi-kernel/receipt.js');

const AYUDA = `ficha-contigo — la ficha clínica, del lado de la paciente

  ficha-contigo <comando> [--clave valor ...] [--registro <carpeta>]

  paciente      --id --nombre
  institucion   --id --nombre
  profesional   --id --nombre --institucion
  parte         --id --nombre --valor
  corregir      --id --valor --por [--motivo]
  partes

  solicitar      --profesional --proposito --parte [--motivo]
  pendientes
  autorizar     --id --profesional --proposito --parte --presupuesto --vence --persona [--pauser a,b]
  mandato       --id --profesional --proposito --parte --motivo --presupuesto --vence --revision-antes --persona [--pauser a,b]
  permisos
  revocar       --permiso --persona [--motivo]

  acceder       --clave --profesional --proposito --parte [--unidades] [--pausar quien]
  emergencia    --clave --profesional --proposito --parte --motivo [--unidades]
  revisar       --acceso --veredicto --revisora [--nota]
  revisiones
  accesos
  demostrar     --afirmacion --parte
  registro
  auditar       --clave

Datos de ejemplo. Sin red, sin blockchain, sin pagos y sin un tercero.
La prueba de conocimiento cero va SIMULADA: el verificador ZK está en el kernel
0.1.5, pero Ficha Contigo no lo integra. No afirma cumplir la Ley 21.668, la 19.628 ni ninguna otra norma.`;

function flags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function linea(t = '') { process.stdout.write(`${t}\n`); }

function mostrar(r) {
  if (!r) return;
  linea(`  estado:   ${r.estado}`);
  if (r.detalle) linea(`  detalle:  ${r.detalle}`);
  if (r.salida) linea(`  salida:   ${r.salida}`);
  if (r.recibo) {
    linea(`  recibo:   ${r.recibo.status} · sello ${String(r.recibo.digest).slice(0, 16)}…`);
    linea(`  anclaje:  ${r.recibo.anchor.status} en ${r.recibo.anchor.network} — nada llegó a la red; esto NO se verificó afuera`);
  }
  if (r.revision) linea(`  revisión: ${r.revision.estado} · plazo ${r.revision.plazo} · ${r.revision.cerrada ? `veredicto «${r.revision.veredicto}»` : 'FALTA cerrarla'}`);
}

async function main(argv) {
  const [comando, ...resto] = argv;
  const f_ = flags(resto);
  const dir = f_.registro || path.join(__dirname, '..', 'datos');
  const f = new FichaContigo({ dir });

  if (!comando || f_.ayuda) { linea(AYUDA); return 0; }

  if (comando === 'paciente') {
    const p = f.registrarPaciente({ id: f_.id, nombre: f_.nombre });
    linea(`paciente anotada: ${p.id}`);
    return 0;
  }
  if (comando === 'institucion') {
    const i = f.registrarInstitucion({ id: f_.id, nombre: f_.nombre });
    linea(`institución anotada: ${i.id}`);
    return 0;
  }
  if (comando === 'profesional') {
    const p = f.registrarProfesional({ id: f_.id, nombre: f_.nombre, institucion: f_.institucion });
    linea(`profesional anotado: ${p.id} en ${p.institucion}`);
    return 0;
  }
  if (comando === 'parte') {
    const p = f.registrarParte({ id: f_.id, nombre: f_.nombre, valor: f_.valor });
    linea(`parte anotada: ${p.id} (${p.nombre}) v${p.version} — huella ${p.huella.slice(0, 16)}… — valor de ejemplo`);
    return 0;
  }
  if (comando === 'corregir') {
    const p = f.corregirParte({ id: f_.id, valor: f_.valor, por: f_.por, motivo: f_.motivo });
    linea(`parte ${p.id} corregida a v${p.version} — huella ${p.huella.slice(0, 16)}…`);
    linea('las autorizaciones otorgadas sobre la versión anterior ya no cubren esta parte.');
    return 0;
  }
  if (comando === 'partes') {
    for (const p of f.partes()) linea(`${p.id}  ${p.nombre}  v${p.version}  ${p.huella.slice(0, 16)}…`);
    return 0;
  }
  if (comando === 'solicitar') {
    const s = f.solicitar({ profesional: f_.profesional, proposito: f_.proposito, parte: f_.parte, motivo: f_.motivo });
    linea(`petición de ${s.profesional}: «${s.proposito}» sobre ${s.parte}. Queda a la vista de la paciente.`);
    linea('pedir no es tener: sin autorización, esto no abre nada.');
    return 0;
  }
  if (comando === 'pendientes') {
    for (const s of f.solicitudes().filter((x) => !x.contestada)) {
      linea(`${s.profesional} pide ${s.parte} para «${s.proposito}» — sin autorización todavía`);
    }
    return 0;
  }
  if (comando === 'autorizar') {
    const a = f.conceder({
      persona: f_.persona,
      id: f_.id,
      profesional: f_.profesional,
      proposito: f_.proposito,
      parte: f_.parte,
      presupuesto: f_.presupuesto,
      vence: f_.vence,
      pauser: typeof f_.pauser === 'string' ? f_.pauser.split(',') : [],
    });
    linea(`autorización ${a.id}: ${a.profesional} abre ${a.parte} para «${a.proposito}» en ${a.institucion}, ${a.presupuesto === '1' ? '1 acceso' : `${a.presupuesto} accesos`}, hasta ${a.vence}`);
    linea(`  con la huella ${a.huella.slice(0, 16)}…: si la parte se corrige, esta autorización deja de cubrirla.`);
    return 0;
  }
  if (comando === 'mandato') {
    const m = f.otorgarMandato({
      persona: f_.persona,
      id: f_.id,
      profesional: f_.profesional,
      proposito: f_.proposito,
      parte: f_.parte,
      motivo: f_.motivo,
      presupuesto: f_.presupuesto,
      vence: f_.vence,
      revision_antes: f_['revision-antes'],
      pauser: typeof f_.pauser === 'string' ? f_.pauser.split(',') : [],
    });
    linea(`mandato de emergencia ${m.id}: ${m.profesional} puede abrir ${m.parte} para «${m.proposito}» ${m.presupuesto === '1' ? 'una vez' : `${m.presupuesto} veces`}, hasta ${m.vence}`);
    linea(`  motivo: «${m.motivo}»`);
    linea(`  hay que revisarlo antes de ${m.revision_antes}: sin ese plazo, la revisión no se cierra nunca.`);
    return 0;
  }
  if (comando === 'permisos') {
    for (const p of [...f.autorizaciones(), ...f.mandatos()]) {
      const extra = p.tipo === 'mandato' ? ` · motivo «${p.motivo}» · revisión antes de ${p.revision_antes}` : '';
      linea(`${p.id}  ${p.tipo}  ${p.profesional} → ${p.parte} «${p.proposito}» en ${p.institucion}  ${p.presupuesto} accesos  hasta ${p.vence}  ${p.revocado ? `REVOCADO por ${p.revocado_por}` : 'vigente'}${extra}`);
    }
    return 0;
  }
  if (comando === 'revocar') {
    f.revocar({ persona: f_.persona, permiso: f_.permiso, motivo: f_.motivo });
    linea(`permiso ${f_.permiso} revocado por ${f_.persona}. Desde ahora, cualquier acceso con él se bloquea.`);
    linea('lo que ya ocurrió sigue en el registro: revocar no borra un acceso que ya se ejerció.');
    return 0;
  }
  if (comando === 'acceder') {
    const r = await f.acceder({
      clave: f_.clave,
      profesional: f_.profesional,
      proposito: f_.proposito,
      parte: f_.parte,
      unidades: f_.unidades || '1',
    }, { now: f_.ahora, pausar: f_.pausar, verificador: f_.verificador });
    linea(`acceso «${f_.clave}»: ${f_.profesional} abre ${f_.parte} para «${f_.proposito}»`);
    mostrar(r);
    return r.estado === 'verificado' || r.estado === 'repetido' ? 0 : 1;
  }
  if (comando === 'emergencia') {
    const r = await f.ejercitar({
      clave: f_.clave,
      profesional: f_.profesional,
      proposito: f_.proposito,
      parte: f_.parte,
      unidades: f_.unidades || '1',
      motivo: f_.motivo,
    }, { now: f_.ahora });
    linea(`acceso de emergencia «${f_.clave}»: ${f_.profesional} abre ${f_.parte} para «${f_.proposito}»`);
    linea('  esto solo abre si la paciente firmó un mandato antes; si no hay mandato, no hay puerta.');
    mostrar(r);
    return r.estado === 'verificado' || r.estado === 'repetido' ? 0 : 1;
  }
  if (comando === 'revisar') {
    const r = f.revisar({ acceso: f_.acceso, veredicto: f_.veredicto, revisora: f_.revisora, nota: f_.nota, ahora: f_.ahora });
    linea(`revisión del acceso ${r.acceso} cerrada con veredicto «${r.veredicto}» por ${r.revisora}${r.fuera_de_plazo ? ' — FUERA DE PLAZO' : ''}`);
    return 0;
  }
  if (comando === 'revisiones') {
    for (const r of f.lineas('revision')) {
      linea(`${r.acceso}  ${r.cerrada ? `cerrada «${r.veredicto}» por ${r.revisora}` : `PENDIENTE hasta ${r.plazo}`}  (mandato ${r.permiso}, motivo «${r.motivo_del_ejercicio}»)`);
    }
    return 0;
  }
  if (comando === 'accesos') {
    for (const a of f.accesos()) {
      linea(`${a.clave}  ${a.cuerpo.profesional} leyó ${a.cuerpo.parte} para «${a.cuerpo.proposito}» con ${a.permiso} (${a.cuerpo.via}, huella ${String(a.cuerpo.huella_entregada).slice(0, 12)}…)  ${a.cuerpo.en}`);
    }
    return 0;
  }
  if (comando === 'demostrar') {
    const d = f.demostrar({ afirmacion: f_.afirmacion, parte: f_.parte });
    linea(`afirmación:  «${d.afirmacion}»`);
    linea(`compromiso:  ${d.compromiso}`);
    linea(`simulada:    ${String(d.simulada)}`);
    linea(`razón:       ${d.razon}`);
    linea('lo que no se ve: el valor de la parte. lo que tampoco se ve: una prueba de verdad.');
    return 0;
  }
  if (comando === 'registro') {
    for (const l of f.registroDeLaPaciente()) {
      linea(`[${l.tipo}] ${l.texto}${l.efecto ? ` — ${l.efecto}` : ''}`);
    }
    return 0;
  }
  if (comando === 'auditar') {
    const r = f.recibos().find((x) => x.clave === f_.clave);
    if (!r) { linea(`no hay recibo para la clave ${String(f_.clave)}`); return 1; }
    linea(`sello del recibo: ${verifyReceipt(r.recibo).ok ? 'verifica' : 'NO verifica'}`);
    const a = f.auditar(r.recibo);
    linea(`auditoría independiente: ${a.ok ? 'pasa' : 'NO pasa'} — ${a.motivo}`);
    return a.ok ? 0 : 1;
  }

  linea(`comando desconocido: ${comando}`);
  linea(AYUDA);
  return 2;
}

module.exports = { main, AYUDA };

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
