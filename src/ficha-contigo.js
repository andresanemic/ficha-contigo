'use strict';

// Ficha Contigo — proyecto 4 de los diez de Vespi: la ficha clínica.
//
// Este archivo es la carrocería; el núcleo ejecutable es el kernel de Vespi, que
// este proyecto consume sin modificar. El predicado de suficiencia, la pausa, la
// verificación separada y el recibo sellado son del núcleo. Lo que el núcleo no
// puede expresar y este proyecto agrega son el propósito, el alcance sobre una
// parte concreta de la ficha, la huella que ata la autorización al contenido, la
// revocación, el mandato de emergencia otorgado por adelantado con su revisión
// pendiente, y la traducción de la razón a la persona.
//
// El núcleo se carga desde la copia vendorizada que Lore Plugin instala en los
// hosts, no desde el árbol de desarrollo: esa copia está fijada al corte y sus
// bytes están declarados en su `SOURCE.md`, mientras el árbol de desarrollo avanza.
// `test/red.test.js` verifica esas huellas, así que si el corte se mueve, esta
// suite lo dice en vez de dejar que el proyecto siga corriendo contra un núcleo
// que nadie revisó.

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const KERNEL = '../vendor/vespi-kernel';

const { sufficient } = require(`${KERNEL}/authority.js`);
const { createOperation, runOperation, pauseOperation, resumeOperation, STATES } = require(`${KERNEL}/operation.js`);
const { verifyReceipt } = require(`${KERNEL}/receipt.js`);

const REGISTRO = 'registro.jsonl';

// Lo que el verificador independiente tiene que recalcular desde el registro, para
// un acceso ordinario. Un verificador que no produce este conjunto no verificó nada:
// devolver un subconjunto, o añadir uno propio, es creerle al ejecutor en vez de mirar.
const CHECKS_INDEPENDIENTES = ['autorizacion-cubria', 'acceso-en-registro', 'ejecutado-una-vez', 'proposito-declarado', 'huella-de-la-ficha'];
// Un acceso de emergencia suma el suyo. La revisión posterior NO va acá: en el
// momento de ejercer el acceso la revisión está abierta por definición, y la
// comprueba la tercera parte, más tarde, en `auditar`.
const CHECKS_EMERGENCIA = [...CHECKS_INDEPENDIENTES, 'mandato-previo'];

const VEREDICTOS = ['justificado', 'injustificado'];

function entero(value) {
  if (typeof value === 'bigint') return value >= 0n ? value : null;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  return typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : null;
}

function texto(value) {
  return typeof value === 'string' && value.length > 0;
}

function huellaDe(value) {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function huellaParte({ id, version, valor }) {
  return huellaDe({ id, version, valor });
}

function iso(now) {
  if (now === undefined || now === null) return new Date().toISOString();
  const ms = Date.parse(now);
  return Number.isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString();
}

class FichaContigo {
  constructor({ dir } = {}) {
    this.dir = dir;
    this.ruta = path.join(dir, REGISTRO);
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.ruta)) fs.writeFileSync(this.ruta, '', 'utf8');
  }

  leer() {
    return fs.readFileSync(this.ruta, 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  }

  escribir(linea) {
    fs.appendFileSync(this.ruta, `${JSON.stringify(linea)}\n`, 'utf8');
    return linea;
  }

  lineas(tipo) {
    return this.leer().filter((l) => l.tipo === tipo);
  }

  // --- Quiénes están en la historia ---

  registrarPaciente({ id, nombre }) {
    if (!texto(id)) throw new Error('una paciente necesita id');
    const previa = this.lineas('paciente').find((p) => p.id === id);
    if (previa) return previa;
    return this.escribir({ tipo: 'paciente', id, nombre: nombre || id, en: iso() });
  }

  registrarInstitucion({ id, nombre }) {
    if (!texto(id)) throw new Error('una institución necesita id');
    const previa = this.lineas('institucion').find((p) => p.id === id);
    if (previa) return previa;
    return this.escribir({ tipo: 'institucion', id, nombre: nombre || id, en: iso() });
  }

  registrarProfesional({ id, nombre, institucion }) {
    if (!texto(id) || !texto(institucion)) throw new Error('un profesional necesita id y la institución en la que atiende');
    const previa = this.lineas('profesional').find((p) => p.id === id);
    if (previa) return previa;
    if (!this.instituciones().some((i) => i.id === institucion)) throw new Error(`no hay institución ${String(institucion)} donde este profesional atienda`);
    return this.escribir({ tipo: 'profesional', id, nombre: nombre || id, institucion, en: iso() });
  }

  registrarParte({ id, nombre, valor, persona = 'persona-1' }) {
    if (!texto(id) || !texto(nombre)) throw new Error('una parte de la ficha necesita id y nombre');
    const previa = this.lineas('parte').find((p) => p.id === id);
    if (previa) return previa;
    const linea = {
      tipo: 'parte',
      id,
      persona,
      nombre,
      valor: String(valor),
      version: 1,
      huella: huellaParte({ id, version: 1, valor: String(valor) }),
      en: iso(),
    };
    return this.escribir(linea);
  }

  // Una parte de la ficha se corrige, no se reescribe: la versión anterior queda
  // con su huella en el registro. Es lo que hace que «ficha alterada después de
  // autorizada» sea detectable por alguien que solo lea el archivo.
  corregirParte({ id, valor, por, motivo }) {
    const previa = this.partes().find((p) => p.id === id);
    if (!previa) throw new Error(`no hay parte ${String(id)} que corregir`);
    if (!texto(valor)) throw new Error('una corrección necesita el valor corregido');
    const version = Number(previa.version) + 1;
    const nueva = {
      tipo: 'parte',
      id,
      persona: previa.persona,
      nombre: previa.nombre,
      valor: String(valor),
      version,
      huella: huellaParte({ id, version, valor: String(valor) }),
      en: iso(),
    };
    this.escribir(nueva);
    this.escribir({
      tipo: 'correccion',
      parte: id,
      por: texto(por) ? por : 'sin nombre',
      motivo: texto(motivo) ? motivo : 'sin motivo declarado',
      huella_antes: previa.huella,
      huella_despues: nueva.huella,
      version_antes: previa.version,
      version_despues: version,
      en: iso(),
    });
    return nueva;
  }

  pacientes() { return this.lineas('paciente'); }
  instituciones() { return this.lineas('institucion'); }
  profesionales() { return this.lineas('profesional'); }

  // Una parte cambia de estado (se corrige), así que el registro se lee como una
  // línea por parte: la última gana. El historial queda completo en el archivo.
  partes() {
    const porId = new Map();
    for (const p of this.lineas('parte')) porId.set(p.id, p);
    return [...porId.values()];
  }

  correcciones() { return this.lineas('correccion'); }
  accesos() { return this.lineas('acceso'); }
  recibos() { return this.lineas('recibo'); }
  demostraciones() { return this.lineas('demostracion'); }

  profesional(id) { return this.lineas('profesional').find((p) => p.id === id) || null; }

  // Una autorización cambia de estado (se revoca), igual que un mandato.
  autorizaciones() {
    const porId = new Map();
    for (const a of this.lineas('autorizacion')) porId.set(a.id, a);
    return [...porId.values()];
  }

  mandatos() {
    const porId = new Map();
    for (const m of this.lineas('mandato')) porId.set(m.id, m);
    return [...porId.values()];
  }

  solicitudes() {
    const porId = new Map();
    for (const s of this.lineas('solicitud')) porId.set(s.id, s);
    return [...porId.values()];
  }

  permisosDe(profesional) {
    return [
      ...this.autorizaciones().filter((a) => a.profesional === profesional),
      ...this.mandatos().filter((m) => m.profesional === profesional),
    ];
  }

  permiso(id) {
    return this.autorizaciones().find((a) => a.id === id) || this.mandatos().find((m) => m.id === id) || null;
  }

  consumoDe(permisoId) {
    return this.accesos().filter((a) => a.permiso === permisoId).reduce((suma, a) => suma + entero(a.cuerpo.unidades), 0n);
  }

  // --- La puerta de la paciente ---

  solicitar({ profesional, proposito, parte, motivo }) {
    if (!texto(profesional) || !texto(proposito) || !texto(parte)) {
      throw new Error('una solicitud necesita quién pide, para qué y qué parte de la ficha');
    }
    return this.escribir({
      tipo: 'solicitud',
      id: `sol-${this.lineas('solicitud').length + 1}`,
      profesional,
      proposito,
      parte,
      motivo: texto(motivo) ? motivo : 'sin motivo declarado',
      en: iso(),
      contestada: false,
    });
  }

  conceder(spec) {
    const delProfesional = this.solicitudes().filter((s) => s.profesional === spec.profesional && s.proposito === spec.proposito);
    if (delProfesional.length > 0 && !delProfesional.some((s) => !s.contestada)) {
      throw new Error('esa petición ya fue contestada: una autorización nueva empieza por una petición nueva');
    }
    const autorizacion = this.armarPermiso(spec, { tipo: 'autorizacion' });
    this.escribir(autorizacion);
    this.contestarSolicitudes(autorizacion);
    return autorizacion;
  }

  // El mandato de emergencia: la misma forma de permiso, con el motivo por el que
  // la paciente lo otorga sin poder estar presente, y la fecha antes de la cual
  // hay que revisarlo. Sin mandato no hay acceso de emergencia: eso no lo abre ni
  // el ejecutor ni una urgencia.
  otorgarMandato(spec) {
    const mandato = this.armarPermiso(spec, { tipo: 'mandato' });
    this.escribir(mandato);
    this.contestarSolicitudes(mandato);
    return mandato;
  }

  contestarSolicitudes(permiso) {
    for (const s of this.solicitudes()) {
      if (s.profesional === permiso.profesional && s.proposito === permiso.proposito && !s.contestada) {
        this.escribir({ ...s, contestada: true, permiso: permiso.id });
      }
    }
  }

  armarPermiso(spec, { tipo }) {
    for (const campo of ['id', 'profesional', 'proposito', 'parte', 'presupuesto', 'vence']) {
      if (!texto(spec[campo])) throw new Error(`un permiso necesita ${campo}: no hay permiso sin él`);
    }
    if (entero(spec.presupuesto) === null) throw new Error('el presupuesto del permiso es un número entero de accesos');
    if (Number.isNaN(Date.parse(spec.vence))) throw new Error('el reloj del permiso no es una hora');
    if (this.permiso(spec.id)) throw new Error(`ya existe el permiso ${spec.id}`);
    const parte = this.partes().find((p) => p.id === spec.parte);
    if (!parte) throw new Error(`no hay parte ${String(spec.parte)} en la ficha`);
    const prof = this.profesional(spec.profesional);
    if (!prof) throw new Error(`no hay profesional ${String(spec.profesional)} en el registro`);
    if (tipo === 'mandato' && !texto(spec.motivo)) {
      throw new Error('un mandato de emergencia necesita el motivo por el que la paciente lo otorga sin poder estar');
    }
    if (tipo === 'mandato' && (spec.revision_antes === undefined || Number.isNaN(Date.parse(spec.revision_antes)))) {
      throw new Error('un mandato de emergencia dice hasta cuándo hay que revisarlo: sin plazo, la revisión no se cierra nunca');
    }
    return {
      tipo,
      id: spec.id,
      clase: tipo === 'mandato' ? 'acceso de emergencia' : 'autorización',
      persona: texto(spec.persona) ? spec.persona : 'la paciente',
      profesional: spec.profesional,
      institucion: prof.institucion,
      proposito: spec.proposito,
      parte: spec.parte,
      presupuesto: spec.presupuesto,
      vence: iso(spec.vence),
      // La huella viaja con el permiso: es lo que ata la autorización a un
      // contenido y no solo a un nombre de parte.
      huella: parte.huella,
      version: parte.version,
      motivo: tipo === 'mandato' ? spec.motivo : null,
      revision_antes: tipo === 'mandato' ? iso(spec.revision_antes) : null,
      pauser: Array.isArray(spec.pauser) ? spec.pauser.filter((p) => texto(p)) : [],
      otorgado_por: texto(spec.persona) ? spec.persona : 'la paciente',
      otorgado_en: iso(),
      en: iso(),
      revocado: false,
      revocado_por: null,
      revocado_en: null,
      motivo_revocacion: null,
    };
  }

  revocar({ persona, permiso, autorizacion, motivo }) {
    const id = texto(permiso) ? permiso : autorizacion;
    const previo = this.permiso(id);
    if (!previo) throw new Error(`no hay permiso ${String(id)} que revocar`);
    if (previo.otorgado_por !== persona) {
      throw new Error(`solo quien otorgó el permiso puede quitarlo: ${previo.otorgado_por} (y no ${String(persona)})`);
    }
    if (previo.revocado) throw new Error(`el permiso ${permiso} ya estaba revocado y no se reactiva solo`);
    this.escribir({
      ...previo,
      revocado: true,
      revocado_por: persona,
      revocado_en: iso(),
      motivo_revocacion: texto(motivo) ? motivo : 'sin motivo declarado',
    });
    return this.escribir({
      tipo: 'revocacion',
      permiso,
      clase: previo.clase,
      persona,
      motivo: texto(motivo) ? motivo : 'sin motivo declarado',
      en: iso(),
    });
  }

  // La autoridad que el núcleo entiende, con el presupuesto que QUEDA.
  autoridadDe(permiso, restante) {
    const libre = entero(restante === undefined ? String(entero(permiso.presupuesto) - this.consumoDe(permiso.id)) : restante);
    return {
      spend: [{
        asset: `parte:${permiso.parte}`,
        maxAmount: String(libre < 0n ? 0n : libre),
        to: `institucion:${permiso.institucion}`,
        expiresAt: permiso.vence,
      }],
      ...(permiso.pauser.length > 0 ? { pausers: [...permiso.pauser] } : {}),
    };
  }

  // La puerta: primero lo que el permiso no puede decir —propósito, alcance, huella—
  // y después el predicado del núcleo sobre institución, reloj y presupuesto.
  evaluar(pedido, now, { emergencia = false } = {}) {
    const delProfesional = this.permisosDe(pedido.profesional);
    const clase = emergencia ? 'mandato' : 'autorizacion';
    const candidatos = delProfesional.filter((p) => p.tipo === clase);
    const ingreso = emergencia ? 'mandato de emergencia' : 'autorización';
    if (candidatos.length === 0) {
      // El acceso de emergencia tiene su propia ausencia: no hay «permiso de
      // emergencia» al que culpa, no hay «se revocó». La razón que se le da a la
      // paciente es que la puerta no existe porque ella no la firmó antes.
      if (emergencia) {
        const revocado = delProfesional.find((p) => p.tipo === 'mandato' && p.revocado);
        const cola = revocado
          ? ` El mandato ${revocado.id} fue revocado por ${revocado.revocado_por} (${String(revocado.motivo_revocacion)}), y una revocación no se reactiva sola.`
          : '';
        return {
          ok: false,
          motivo: `no hay mandato de emergencia otorgado por adelantado a ${pedido.profesional}: una urgencia no abre lo que la paciente no firmó antes${cola}`,
          salida: 'vuelve a la paciente: el acceso de emergencia se otorga antes, con motivo, alcance y reloj, o no existe',
        };
      }
      const revocado = delProfesional.find((p) => p.revocado);
      if (revocado) {
        return {
          ok: false,
          motivo: `el permiso ${revocado.id} fue revocado por ${revocado.revocado_por} (${String(revocado.motivo_revocacion)}), y una revocación no se reactiva sola`,
          salida: `vuelve a ${String(revocado.otorgado_por)}: si la paciente vuelve a necesitarlo, se otorga un permiso nuevo`,
          permiso: revocado,
        };
      }
      return {
        ok: false,
        motivo: `no hay ${ingreso} de ${pedido.profesional} para ${pedido.parte}: un propósito declarado no abre la puerta`,
        salida: 'vuelve a la paciente: otorga un permiso con propósito y alcance, o deja la petición anotada sin contestar',
      };
    }
    const queCubren = [];
    const queNo = [];
    for (const permiso of candidatos) {
      if (permiso.revocado) {
        queNo.push({ permiso, encaja: false, motivo: `el permiso ${permiso.id} fue revocado por ${permiso.revocado_por} (${String(permiso.motivo_revocacion)}), y una revocación no se reactiva sola` });
        continue;
      }
      if (permiso.proposito !== pedido.proposito) {
        queNo.push({ permiso, encaja: false, motivo: `el permiso ${permiso.id} se otorgó para «${permiso.proposito}» y este acceso pide «${pedido.proposito}»: un acceso con otro propósito no abre` });
        continue;
      }
      if (permiso.parte !== pedido.parte) {
        queNo.push({ permiso, encaja: false, motivo: `el permiso ${permiso.id} abre ${permiso.parte} y el acceso pide ${pedido.parte}: el alcance es una parte de la ficha, no «la ficha»` });
        continue;
      }
      // La huella manda: una autorización sobre una versión no cubre otra versión.
      const hoy = this.partes().find((p) => p.id === permiso.parte);
      if (hoy && hoy.huella !== permiso.huella) {
        queNo.push({
          permiso,
          encaja: false,
          motivo: `la autorización ${permiso.id} se emitió sobre ${permiso.parte} con la huella ${permiso.huella.slice(0, 12)}…, y ${permiso.parte} hoy está con la huella ${String(hoy.huella).slice(0, 12)}…: una autorización no viaja a otra versión de la ficha`,
        });
        continue;
      }
      const restante = entero(permiso.presupuesto) - this.consumoDe(permiso.id);
      const check = sufficient(
        [{ asset: `parte:${pedido.parte}`, amount: pedido.unidades, to: `institucion:${String(this.profesional(pedido.profesional) && this.profesional(pedido.profesional).institucion)}` }],
        this.autoridadDe(permiso, restante),
        { now },
      );
      if (check.ok) queCubren.push({ permiso, restante });
      else queNo.push({ permiso, encaja: true, motivo: this.traducir(check.reason, permiso, pedido, restante) });
    }
    if (queCubren.length > 0) return { ok: true, permiso: queCubren[0].permiso, restante: String(queCubren[0].restante) };
    // Varios permisos pueden fallar y no todos dicen lo mismo. El que se nombra
    // primero es el que se parecía a este acceso —mismo propósito, misma parte,
    // misma huella—: un permiso de otra cosa explica por qué no abre, pero el
    // permiso que casi abría explica qué faltó.
    const encaja = (f) => (f.encaja ? 0 : 1);
    queNo.sort((a, b) => encaja(a) - encaja(b));
    const primera = queNo[0];
    const punto = /[.!?…]$/.test(primera.motivo) ? '' : '.';
    const otras = queNo.length > 1 ? `${punto} Ninguno de los ${queNo.length} permisos vivos de ${pedido.profesional} cubre este acceso.` : punto;
    return {
      ok: false,
      motivo: `${primera.motivo}${otras}`,
      salida: `vuelve a ${primera.permiso.otorgado_por}: otorga un permiso que cubra, o deja la petición anotada sin contestar`,
      permiso: primera.permiso,
    };
  }

  traducir(motivo, permiso, pedido, restante) {
    if (/expired/.test(motivo)) {
      const cuando = (motivo.match(/expired at (\S+)/) || [])[1] || permiso.vence;
      return `el permiso ${permiso.id} venció el ${cuando} y un permiso que murió con su reloj no vuelve solo`;
    }
    if (/no grant for asset .* to /.test(motivo)) {
      const propia = this.profesional(permiso.profesional);
      return `el permiso ${permiso.id} vale en ${permiso.institucion} y el acceso pide hacia ${propia ? propia.institucion : 'otra institución'}: un permiso de tratamiento no viaja a otra institución`;
    }
    if (/consume/.test(motivo)) {
      return `el presupuesto del permiso ${permiso.id} es de ${permiso.presupuesto === '1' ? '1 acceso' : `${permiso.presupuesto} accesos`} y ya gastó ${this.consumoDe(permiso.id)}; este acceso pide ${String(pedido.unidades)} y solo quedan ${String(restante)}`;
    }
    return motivo;
  }

  // --- Las operaciones ---

  abrir(pedido, opciones = {}) {
    const emergencia = opciones.emergencia === true;
    const puerta = this.evaluar(pedido, opciones.now, { emergencia });
    const clase = emergencia ? 'acceso de emergencia' : 'acceso';
    const op = createOperation({
      goal: `${pedido.profesional} ${emergencia ? 'ejerce un acceso de emergencia' : 'accede'} sobre ${pedido.parte} para «${pedido.proposito}»`,
      action: emergencia ? 'ficha-contigo:acceso-de-emergencia' : 'ficha-contigo:acceso',
      agent: pedido.profesional,
      exit: puerta.ok ? null : puerta.salida,
      authority: puerta.ok ? this.autoridadDe(puerta.permiso, puerta.restante) : { spend: [] },
    });
    op.pedido = { ...pedido };
    op.puerta = puerta;
    op.emergencia = emergencia;
    return this.guardar(op);
  }

  guardar(op) {
    const previa = this.retomar(op.id);
    if (previa) return previa;
    this.escribir({ tipo: 'operacion', id: op.id, estado: op.state, operacion: op, en: iso() });
    return op;
  }

  retomar(id) {
    const linea = this.lineas('operacion').find((l) => l.id === id);
    return linea ? linea.operacion : null;
  }

  pausar(op, quien) { return pauseOperation(op, quien); }
  reanudar(op, quien) { return resumeOperation(op, quien); }

  capacidad(pedido, puerta, emergencia) {
    const self = this;
    return {
      id: emergencia ? 'ficha-contigo:acceso-de-emergencia' : 'ficha-contigo:acceso',
      required: () => {
        if (!puerta.ok) return { impossible: true, reason: puerta.motivo, exit: puerta.salida };
        return {
          spend: [{
            asset: `parte:${pedido.parte}`,
            amount: pedido.unidades,
            to: `institucion:${String(self.profesional(pedido.profesional) && self.profesional(pedido.profesional).institucion)}`,
          }],
        };
      },
      perform: async () => {
        const parte = self.partes().find((p) => p.id === pedido.parte);
        const en = iso();
        const cuerpo = {
          clave: pedido.clave,
          paciente: puerta.permiso.persona,
          profesional: pedido.profesional,
          institucion: puerta.permiso.institucion,
          proposito: pedido.proposito,
          parte: pedido.parte,
          unidades: pedido.unidades,
          via: emergencia ? 'emergencia' : 'autorizacion',
          motivo: emergencia ? pedido.motivo : null,
          // Lo entregado y con qué huella: el verificador recalcula esto desde el
          // registro, no le cree al ejecutor.
          parte_entregada: parte ? parte.valor : null,
          huella_entregada: parte ? parte.huella : null,
          huella_autorizada: puerta.permiso.huella,
          autorizacion: puerta.permiso.id,
          por: en,
          en,
        };
        const linea = { tipo: 'acceso', clave: pedido.clave, permiso: puerta.permiso.id, cuerpo, huella: huellaDe(cuerpo) };
        self.escribir(linea);
        if (emergencia) {
          // El acceso ya ocurrió y no se puede deshacer: lo que se puede es dejar
          // la revisión abierta, con plazo, a la vista de la paciente.
          self.escribir({
            tipo: 'revision',
            acceso: pedido.clave,
            permiso: puerta.permiso.id,
            profesional: pedido.profesional,
            motivo_del_mandato: puerta.permiso.motivo,
            motivo_del_ejercicio: pedido.motivo,
            plazo: puerta.permiso.revision_antes,
            estado: 'pendiente',
            cerrada: false,
            veredicto: null,
            revisora: null,
            en,
          });
        }
        return {
          ok: true,
          evidence: { operationId: pedido.clave, type: 'acceso', status: emergencia ? 'ejercido' : 'leido', amount: pedido.unidades, code: linea.huella },
        };
      },
      io: { verify: (evidencia) => this.verificar(evidencia, { emergencia }) },
    };
  }

  // El verificador independiente: relee el registro y recalcula. No cree al
  // ejecutor en nada, y en la auditoría se le exige que haya comprobado esto.
  async verificar(evidencia, { emergencia = false } = {}) {
    const clave = evidencia && evidencia.operationId;
    const accesos = this.accesos().filter((a) => a.clave === clave);
    const uno = accesos[0];
    const permiso = uno ? this.permiso(uno.permiso) : null;
    const checks = {
      'autorizacion-cubria': Boolean(permiso)
        && !permiso.revocado
        && permiso.profesional === (uno.cuerpo.profesional)
        && permiso.parte === uno.cuerpo.parte,
      'acceso-en-registro': accesos.length === 1 && accesos[0].huella === huellaDe(accesos[0].cuerpo),
      'ejecutado-una-vez': accesos.length === 1,
      'proposito-declarado': Boolean(permiso) && uno.cuerpo.proposito === permiso.proposito,
      'huella-de-la-ficha': Boolean(permiso) && uno.cuerpo.huella_entregada === uno.cuerpo.huella_autorizada,
    };
    if (emergencia) {
      checks['mandato-previo'] = Boolean(permiso) && permiso.tipo === 'mandato' && !permiso.revocado;
    }
    const verified = Object.values(checks).every((v) => v === true);
    return { verified, checks, reason: verified ? 'recomputado desde el registro' : 'el registro no respalda el acceso' };
  }

  async correr(op, pedido, opciones = {}) {
    if (op.state === STATES.PAUSED) {
      return { estado: 'pausado', detalle: 'el acceso está pausado por quien tiene el permiso para pausarlo', salida: 'reanuda o cancela', recibo: null, revision: null };
    }
    const previo = this.recibos().find((r) => r.clave === pedido.clave);
    if (previo) {
      return { estado: 'repetido', detalle: `el acceso ${pedido.clave} ya ocurrió; no se repite`, salida: 'nada que hacer', recibo: previo.recibo, revision: this.revisionDe(pedido.clave) };
    }
    const cap = this.capacidad(pedido, op.puerta, op.emergencia);
    if (opciones.verificador) cap.io.verify = this.verificadorDe(opciones.verificador);
    // El kernel 0.1.5 verifica expiresAt contra io.now (función síncrona).
    // Convertimos opciones.now (string ISO en las pruebas) a esa función.
    const nowValue = opciones.now;
    const nowFn = typeof nowValue === 'function' ? nowValue : (nowValue !== undefined && nowValue !== null ? () => nowValue : undefined);
    const io = { verify: cap.io.verify, ask: async () => ({ approved: false, by: 'nadie' }) };
    if (nowFn) io.now = nowFn;
    const resultado = await runOperation(op, cap, io);
    const recibo = resultado.receipt;
    if (recibo && recibo.status === 'verified') this.escribir({ tipo: 'recibo', clave: pedido.clave, recibo });
    return { ...this.traducirResultado(resultado, op), recibo, revision: this.revisionDe(pedido.clave) };
  }

  verificadorDe(verificador) {
    if (verificador && typeof verificador.verificar === 'function') return (evidencia) => verificador.verificar(evidencia);
    if (typeof verificador === 'function') return verificador;
    return (evidencia) => {
      const clave = evidencia && evidencia.operationId;
      const acceso = this.accesos().find((a) => a.clave === clave);
      return this.verificar(evidencia, { emergencia: Boolean(acceso) && acceso.cuerpo.via === 'emergencia' });
    };
  }

  // El núcleo dice blocked / verified; el proyecto dice bloqueado / verificado y
  // le dice a la persona qué pasó y qué puede hacer.
  traducirResultado(resultado, op) {
    if (resultado.status === 'verified') {
      return {
        estado: 'verificado',
        detalle: 'el acceso ocurrió dentro de lo otorgado y el verificador lo recomputó desde el registro',
        salida: null,
      };
    }
    if (resultado.status === 'paused') return { estado: 'pausado', detalle: 'pausado', salida: 'reanuda o cancela' };
    const recibo = resultado.receipt;
    return {
      estado: 'bloqueado',
      detalle: (recibo && (recibo.detail || recibo.reason)) || 'no se pudo abrir',
      salida: (op && op.exit) || (recibo && recibo.exit) || 'vuelve a la paciente',
    };
  }

  // El acceso ordinario: lo que la paciente autorizó, o nada.
  async acceder(pedido, opciones = {}) {
    const op = opciones.operacion ? this.retomar(opciones.operacion) : this.abrir(pedido, opciones);
    if (!op) throw new Error(`no hay operación abierta con id ${String(opciones.operacion)}`);
    if (opciones.pausar) pauseOperation(op, opciones.pausar);
    if (opciones.reanudar) resumeOperation(op, opciones.reanudar);
    return this.correr(op, op.pedido || pedido, opciones);
  }

  // El acceso de emergencia: solo existe si hay mandato otorgado antes. Se ejerce
  // sin pedir permiso en el momento y deja la revisión abierta.
  async ejercitar(pedido, opciones = {}) {
    const op = opciones.operacion ? this.retomar(opciones.operacion) : this.abrir({ ...pedido }, { ...opciones, emergencia: true });
    if (!op) throw new Error(`no hay operación abierta con id ${String(opciones.operacion)}`);
    if (opciones.pausar) pauseOperation(op, opciones.pausar);
    if (opciones.reanudar) resumeOperation(op, opciones.reanudar);
    return this.correr(op, op.pedido || pedido, opciones);
  }

  // --- La revisión posterior del acceso de emergencia ---

  revisionDe(clave) {
    const lineas = this.lineas('revision').filter((r) => r.acceso === clave);
    return lineas.length > 0 ? lineas[lineas.length - 1] : null;
  }

  revisionesPendientes() {
    return this.lineas('revision').filter((r) => !r.cerrada);
  }

  revisar({ acceso, veredicto, revisora, nota, ahora }) {
    const pendiente = this.revisionDe(acceso);
    if (!pendiente) throw new Error(`el acceso ${String(acceso)} no tiene revisión abierta: no hay nada que revisar`);
    if (pendiente.cerrada) throw new Error(`la revisión del acceso ${acceso} ya se cerró con veredicto «${pendiente.veredicto}» y no se revisa dos veces`);
    if (!VEREDICTOS.includes(veredicto)) throw new Error(`el veredicto de una revisión es ${VEREDICTOS.join(' o ')}`);
    if (texto(revisora) && revisora === pendiente.profesional) {
      throw new Error('quien ejerció el acceso no revisa el acceso: la revisión se cierra desde el lado de la paciente');
    }
    const plazo = Date.parse(pendiente.plazo);
    return this.escribir({
      ...pendiente,
      cerrada: true,
      estado: 'cerrada',
      veredicto,
      revisora: texto(revisora) ? revisora : 'la paciente',
      nota: texto(nota) ? nota : 'sin nota',
      fuera_de_plazo: Number.isNaN(plazo) ? false : Date.parse(iso(ahora)) > plazo,
      cerrada_en: iso(ahora),
      en: iso(ahora),
    });
  }

  // --- La demostración de un hecho clínico sin mostrar la ficha (simulada) ---

  // Lo que se construye es el flujo y la promesa de no soltar el dato: la
  // demostración lleva un compromiso —una huella de la afirmación y de la parte—
  // y nada del contenido. Lo que NO se construye es la prueba: el verificador de
  // conocimiento cero existe en el kernel 0.1.5, pero aquí no se integra y no hay ZK.
  demostrar({ afirmacion, parte, nonce = 'contigo' }) {
    if (!texto(afirmacion)) throw new Error('una demostración necesita la afirmación que se quiere probar');
    if (!texto(parte)) throw new Error('una demostración necesita la parte de la ficha de la que se afirma');
    const p = this.partes().find((x) => x.id === parte);
    if (!p) throw new Error(`no hay parte ${String(parte)} en la ficha`);
    const compromiso = huellaDe({ afirmacion, parte, huella: p.huella, nonce });
    const linea = this.escribir({
      tipo: 'demostracion',
      afirmacion,
      parte,
      compromiso,
      simulada: true,
      en: iso(),
    });
    return {
      afirmacion,
      parte,
      compromiso,
      simulada: true,
      razon: 'la prueba va simulada: el kernel 0.1.5 incluye un verificador de conocimiento cero, pero Ficha Contigo no lo integra y aquí no hay ZK. Lo que se demuestra es el flujo y que la demostración no transporta la ficha.',
      en: linea.en,
    };
  }

  // --- La tercera parte audita sin creer a nadie ---

  auditar(recibo) {
    const sello = verifyReceipt(recibo);
    if (!sello.ok) return { ok: false, motivo: `el recibo no verifica: ${sello.reason}` };
    const clave = recibo.evidence && recibo.evidence.operationId;
    const accesos = this.accesos().filter((a) => a.clave === clave);
    if (accesos.length === 0) return { ok: false, motivo: 'el recibo dice que hubo un acceso y el registro no lo tiene' };
    if (accesos.length > 1) return { ok: false, motivo: `el acceso ${clave} aparece ${accesos.length} veces en el registro` };
    const acceso = accesos[0];
    if (acceso.huella !== huellaDe(acceso.cuerpo)) {
      return { ok: false, motivo: 'el acceso fue editado después de escrito: su huella ya no calza' };
    }
    const emergencia = acceso.cuerpo.via === 'emergencia';
    const requeridos = emergencia ? CHECKS_EMERGENCIA : CHECKS_INDEPENDIENTES;
    const cubiertos = (recibo.coverage || []).filter((c) => requeridos.includes(c));
    const faltan = requeridos.filter((c) => !cubiertos.includes(c));
    if (faltan.length > 0) {
      return {
        ok: false,
        motivo: `el verificador creyó al ejecutor: no recomputó ${faltan.join(', ')} desde el registro, y una verificación independiente no puede dar por bueno lo que no midió`,
        checks: cubiertos,
      };
    }
    if (emergencia) {
      const revision = this.revisionDe(clave);
      if (!revision || !revision.cerrada) {
        return {
          ok: false,
          motivo: `el acceso de emergencia ${clave} no tiene revisión posterior cerrada: se ejerció con el mandato ${acceso.permiso} y nadie ha dicho si estaba justificado`,
          checks: cubiertos,
        };
      }
      return { ok: true, checks: cubiertos, revision, motivo: `el registro, el mandato ${acceso.permiso} y el recibo dicen lo mismo; la revisión cerrada dice «${revision.veredicto}»` };
    }
    return { ok: true, checks: cubiertos, motivo: 'el registro, la autorización y el recibo dicen lo mismo' };
  }

  // Lo que la paciente pregunta primero: ¿quién leyó qué de mi ficha, y con qué permiso?
  registroDeLaPaciente() {
    return this.leer().map((l) => {
      const comun = { tipo: l.tipo, en: l.en };
      if (l.tipo === 'solicitud') return { ...comun, texto: `${String(l.profesional)} pidió ${String(l.parte)} para «${String(l.proposito)}» — ${String(l.motivo)}` };
      if (l.tipo === 'autorizacion') return { ...comun, texto: `permiso ${String(l.id)}: ${String(l.profesional)} puede abrir ${String(l.parte)} para «${String(l.proposito)}» en ${String(l.institucion)}, ${String(l.presupuesto)} accesos, hasta ${String(l.vence)}` };
      if (l.tipo === 'mandato') return { ...comun, texto: `${String(l.persona)} otorgó a ${String(l.profesional)} un mandato de emergencia sobre ${String(l.parte)} («${String(l.motivo)}»), 1 uso, hasta ${String(l.vence)}, por revisar antes de ${String(l.revision_antes)}` };
      if (l.tipo === 'acceso') return { ...comun, texto: `${String(l.cuerpo.profesional)} leyó ${String(l.cuerpo.parte)} de la ficha de ${String(l.cuerpo.paciente)} para «${String(l.cuerpo.proposito)}» con ${String(l.permiso)} (huella ${String(l.cuerpo.huella_entregada).slice(0, 12)}…)` };
      if (l.tipo === 'revocacion') return { ...comun, texto: `${String(l.persona)} revocó el ${String(l.clase)} ${String(l.permiso)} — ${String(l.motivo)}`, efecto: `esto no cierra hacia atrás lo que ya ocurrió: los accesos que ya salieron siguen en el registro, con su hora y su huella` };
      if (l.tipo === 'revision') return { ...comun, texto: `revisión del acceso de emergencia ${String(l.acceso)}: ${l.cerrada ? `cerrada con veredicto «${String(l.veredicto)}» por ${String(l.revisora)}` : `PENDIENTE, plazo ${String(l.plazo)}`}` };
      if (l.tipo === 'demostracion') return { ...comun, texto: `se demostró «${String(l.afirmacion)}» sin mostrar la ficha (prueba ${l.simulada ? 'SIMULADA' : 'real'}), compromiso ${String(l.compromiso).slice(0, 16)}…` };
      if (l.tipo === 'parte') return { ...comun, texto: `parte ${String(l.id)} «${String(l.nombre)}» versión ${String(l.version)}, huella ${String(l.huella).slice(0, 12)}…` };
      if (l.tipo === 'correccion') return { ...comun, texto: `${String(l.parte)} fue corregida por ${String(l.por)}: huella ${String(l.huella_antes).slice(0, 12)}… → ${String(l.huella_despues).slice(0, 12)}… (${String(l.motivo)})` };
      return comun;
    });
  }
}

module.exports = { FichaContigo, CHECKS_INDEPENDIENTES, CHECKS_EMERGENCIA };
