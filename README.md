[![Ficha Contigo: patient-granted access to a clinical record](./assets/cover.png)](./assets/cover.png)

# Ficha Contigo

<p align="center">
  <a href="#espanol"><img src="https://img.shields.io/badge/status-working_path-D7B698?style=for-the-badge&labelColor=07111A" alt="Status: working path"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-review--only-D7B698?style=for-the-badge&labelColor=07111A" alt="License: review only"></a>
  <a href="./docs/EVIDENCE.md"><img src="https://img.shields.io/badge/suite-all_13_pass-E0C170?style=for-the-badge&labelColor=07111A" alt="Suite: all 13 tests pass"></a>
  <a href="./docs/HOW_IT_WORKS.md"><img src="https://img.shields.io/badge/agreement-written_before_code-D7B698?style=for-the-badge&labelColor=07111A" alt="Agreement written before code"></a>
  <a href="https://github.com/andresanemic/vespi"><img src="https://img.shields.io/badge/built_with-Vespi_and_Lore_Plugin-E0C170?style=for-the-badge&labelColor=07111A" alt="Built with Vespi and Lore Plugin"></a>
  <a href="https://github.com/andresanemic/vespi/tree/ed559e83c976dd6e6a379a5510db776206f670b4"><img src="https://img.shields.io/badge/kernel-0.1.5_release-ed559e8?style=for-the-badge&labelColor=07111A&color=E0C170" alt="Kernel: 0.1.5 release (commit ed559e8)"></a>
</p>

<p align="center"><b>Ficha Contigo</b> — a patient cannot see who opened which part of their clinical record, or why.<br>
The person grants access with limits, emergency access is agreed in advance, and every access is checked. Evidence: 13/13 tests. Fictional patients and data. Chilean Law 21.668.<br>
<b>Ficha Contigo</b> — una paciente no ve quién abrió qué parte de su ficha clínica ni para qué.<br>
La persona da acceso con límites, el acceso de emergencia se acuerda antes y cada acceso se comprueba. Evidencia: 13/13 pruebas. Pacientes y datos ficticios. Ley 21.668 de Chile.</p>

<details open>
<summary><b>Read in English</b></summary>

<a id="english"></a>

**Ficha Contigo gives a patient a visible say over who may open each part of a clinical record, for what purpose and for how long.**

> **The unit is the part of the record the patient allowed, for a purpose and until a time. Emergency access is granted in advance.**

## The problem

When a person hands clinical information to an institution, the relationship can become hard to inspect from the patient's side. Which professional asked for which part? For what purpose? What was actually opened? A professional may have a sound reason to ask, but the reason alone does not tell the patient what crossed the boundary. And when the patient cannot answer during an emergency, a team may face an uncomfortable choice between waiting and improvising access.

Ficha Contigo makes that boundary the subject of a small local prototype. The patient grants a named part of a fictional record, for a declared purpose, at a named institution, within a time window and use budget. A separate emergency mandate can be granted beforehand. If used, it leaves an immediate record and a human review that stays open until the patient or a designated reviewer closes it.

## If you are judging Find Your Way or Meridian, start here

Read the project foundation and its walkthrough. Start with [How it works](./docs/HOW_IT_WORKS.md).

Open the test record. See [Evidence](./docs/EVIDENCE.md).

Read the legal and verification limits. See [Legal and limits](./docs/LEGAL_AND_LIMITS.md).

Review the publication conditions. See [Code not included](./docs/CODE_NOT_INCLUDED.md) and the [review-only license](./LICENSE).

## In one minute

In the recorded fictional case, `persona-1` has three example parts: a laboratory result, an imaging report and personal history. `prof-1` first asks for the laboratory result to continue treatment. The request is blocked because a stated purpose is not permission. The patient then grants only that part, at one institution, for two accesses and until a stated date. One in-scope read is recorded as verified and returns an example value. A request for the imaging report falls outside the grant and is blocked. Later, the patient can revoke the permission without erasing the earlier read. For an emergency, she has separately granted a mandate in advance; exercising it opens a review that remains pending until she closes it. All people, institutions, record contents and values in this walkthrough are fictional.

## What it looks like in practice

The English lines below render the Spanish output recorded by the terminal walkthrough. The source transcript marks its value as an example, and the Spanish section reproduces that output. This public repository does not include source code or a runnable command today.

```text
Fictional example: persona-1, prof-1, part-1
part-1  laboratory result  v1

Request, before the patient grants access
status:   blocked
detail:   no authorization for prof-1 to open part-1: a stated purpose does not open the door
exit:     return to the patient for a permission with purpose and scope
```

After a separate grant for that part, purpose, institution, time and use budget, the recorded walkthrough continues:

```text
authorization: prof-1 may open part-1, 2 accesses, until 2026-10-01
status:        verified
detail:        access was within the grant and the verifier recomputed it from the record
delivered:     EXAMPLE VALUE: 7.4
```

The same permission does not cover another part. The recorded block says the authorization opens `part-1` while the request asks for `part-2`. In the emergency path, the patient has already granted a one-use mandate with a review deadline. The access leaves an open review that the professional who used it cannot close, and the audit does not treat it as closed until the patient side does. The detailed Spanish walkthrough in [How it works](./docs/HOW_IT_WORKS.md) and the recorded evidence in [Evidence](./docs/EVIDENCE.md) show the full sequence.

## How it works

```text
Patient grants purpose + record part + institution + expiry + uses
                              |
Professional requests access |
                              v
                 purpose, scope, time, uses,
                    revocation and fingerprint
                    /                     \
               blocked                   allowed
             with a reason                   |
                                      access + receipt
                                             |
                                independent recomputation

Advance emergency mandate -> access + immediate receipt
                           -> open review
                           -> patient or designee closes it
```

| Actor | Rights in the model | Limit |
|---|---|---|
| Patient | Grant and revoke ordinary access, grant an emergency mandate in advance, read the record and close its later review | Revocation works forward. It does not erase an access that already happened. |
| Institution | Hold the example record and act within the patient's grant | It is fictional; no real provider or record is connected. |
| Treating or later professional | Request access for a declared purpose | A request or professional reason alone is not permission; a request outside scope is blocked. |
| Emergency professional | Use an emergency mandate already granted by the patient | Without the advance grant there is no emergency access; the user of that access cannot close its review. |
| Verifier | Recompute recorded access and check receipt integrity | It checks the record, not medical truth, identity or legal compliance. |

The complete rule set, including what happens when the part changes, is in [How it works](./docs/HOW_IT_WORKS.md).

## Why Ficha Contigo

| You need | What it gives you | Where it lives |
|---|---|---|
| Permission for one part, not a whole record | A named part, purpose, institution, expiry and use budget | [How it works](./docs/HOW_IT_WORKS.md) |
| A change to stop matching an earlier permission | The grant carries the part's fingerprint; a mismatch is blocked | [How it works](./docs/HOW_IT_WORKS.md) |
| A way to withdraw future access | Patient revocation blocks later access while the earlier event stays recorded | [How it works](./docs/HOW_IT_WORKS.md) |
| An emergency path that was agreed in advance | A separate mandate, immediate receipt and later human review | [How it works](./docs/HOW_IT_WORKS.md) |
| A record the patient can inspect independently | A local JSONL record intended to be readable without Ficha Contigo | [Evidence](./docs/EVIDENCE.md) |
| A check beyond the executor's claim | Verification recomputes recorded access and checks the receipt | [Evidence](./docs/EVIDENCE.md) |

## What it is not

Ficha Contigo is not an electronic health record, a clinical system, a provider integration, an identity service, a medical decision-maker or a compliance claim. The public repository currently contains the agreement, documentation and recorded evidence, not source code. Its example data is fictional and local.

## Evidence you can open

The supplied current suite record reports **13 tests, 13 pass, 0 skipped**, run on Node v24.15.0. The suite ran in a clean clone of the project, with an empty HOME and no network, against the kernel copied into the project under `vendor/vespi-kernel` and checked module by module against its `SOURCE.md`. Thirteen cases were written before implementation. In the first red run, twelve behavior cases were red against the module skeleton, while the kernel digest guard passed against the then-pinned cut. A later recorded run reports 13/13 against that cut. The 2026-10-03 capture was red for a different reason: the project was still pinned to an older kernel cut (0.1.3), and the kernel is consumed by digest, so the movement showed up in the suite. That pin was reassessed and the project now runs against kernel **0.1.5 release** (commit `ed559e8`); the capture in `docs/suite-2026-10-09.txt` is the result. Details and test names are in [Evidence](./docs/EVIDENCE.md).

The recorded walkthrough covers an in-scope access, blocks for missing or excessive permission, content correction and fingerprint mismatch, revocation, advance-granted emergency access, an open and later closed review, budget and expiry blocks, simulated zero-knowledge flow, receipts and an independent audit. It reports the Stellar anchor as `pending`; nothing reached a network. The records are project evidence, not an external clinical or security audit.

## Ficha Contigo, Vespi and Lore Plugin

Ficha Contigo is one of the functional projects built on [Vespi](https://github.com/andresanemic/vespi) with [Lore Plugin](https://github.com/andresanemic/lore-plugin). It consumes Vespi's kernel without changing it. The project uses the kernel for bounded authority, permission checks, receipts and verification primitives. Its patient-facing language translates kernel states such as `blocked` and `verified` into Spanish reasons and outcomes. The emergency mandate and the obligation to leave a human review open belong to Ficha Contigo's project layer, not to kernel 0.1.3. Its zero-knowledge demonstration is labeled simulated; the kernel verifier for that capability was deferred to 0.1.4.

**What this relationship means.** The project was built with Lore Plugin's method (its agreement and criterion live in the project, in `acuerdo.md` and `lore/`), and its operations, authority and receipts run on the Vespi kernel 0.1.5, in the pinned copy that Lore Plugin 2.5.1 distributes (`skills/vespi/core/kernel`). That copy sits in the project as `vendor/vespi-kernel` and the suite verifies it against its `SOURCE.md`. Lore Plugin does not run inside the project. This project does not use the kernel's newer capabilities (Stellar pubnet anchors, live x402 settlement, the ZK verifier, emergency access); it exercises the core of operations, authority and receipts.

## What it does not do, and what is not verified

- It does not hold real clinical or identifying data, connect to a provider, implement FHIR or make a real clinical decision.
- It has no live emergency service, network operation, blockchain anchor or Stellar testnet transaction. The recorded anchor remains `pending`.
- Its zero-knowledge flow is simulated. There is no real proof, circuit or verifier in this project.
- It does not establish identity, professional credentials, medical truth, informed consent, legal validity or compliance with any law.
- The regulation contemplated by article 13 of Law 21.668 was not read or verified, and no competent legal professional has reviewed the project.
- The suite accredits only what its 13 named tests cover. Passing tests and a recorded walkthrough do not show readiness for clinical use.

See [Legal and limits](./docs/LEGAL_AND_LIMITS.md) for the legal context and open questions, and [Evidence](./docs/EVIDENCE.md) for the suite status.

## How to review this project

Start with [How it works](./docs/HOW_IT_WORKS.md), then compare the named tests and recorded runs in [Evidence](./docs/EVIDENCE.md). Read [Legal and limits](./docs/LEGAL_AND_LIMITS.md) and [Code not included](./docs/CODE_NOT_INCLUDED.md) before drawing conclusions. The source code will be published during the judges' review period under the [review-only license](./LICENSE), which permits reading and cloning for evaluation. When it opens, run `npm test` and compare the result with the recorded capture in `docs/suite-2026-10-09.txt`; a new run should state which kernel cut it exercised.

## Author

**Andrés Peña**, repository authority: `andresanemic`.

[<img src="./assets/icons/v2/telegram.svg" width="28" alt="Telegram">](https://t.me/andresanemic) &nbsp;&nbsp; [<picture><source media="(prefers-color-scheme: dark)" srcset="./assets/icons/v2/x-dark.svg"><img src="./assets/icons/v2/x.svg" width="28" alt="X"></picture>](https://x.com/andresanemic) &nbsp;&nbsp; [<img src="./assets/icons/v2/linkedin.svg" width="28" alt="LinkedIn">](https://www.linkedin.com/in/andresanemic/)

---

[How it works](./docs/HOW_IT_WORKS.md) · [Evidence](./docs/EVIDENCE.md) · [Legal and limits](./docs/LEGAL_AND_LIMITS.md) · [Code not included](./docs/CODE_NOT_INCLUDED.md) · [Review-only license](./LICENSE) · [Vespi](https://github.com/andresanemic/vespi) · [Lore Plugin](https://github.com/andresanemic/lore-plugin)

</details>

<details open>
<summary><b>Leer en español</b></summary>

<a id="espanol"></a>

**Ficha Contigo hace visible la decisión de la paciente sobre quién puede abrir cada parte de una ficha clínica, para qué y por cuánto tiempo.**

> **La unidad es la parte de la ficha que la paciente autorizó, para un propósito y hasta una fecha. El acceso de emergencia se concede por adelantado.**

## El problema

Cuando una persona entrega información clínica a una institución, desde su lado puede ser difícil reconstruir quién pidió qué parte, para qué y qué se abrió en realidad. Un profesional puede tener un motivo atendible para solicitar acceso, pero ese motivo por sí solo no le muestra a la paciente qué cruzó el límite. Y si ella no puede responder durante una urgencia, el equipo puede quedar ante una decisión incómoda: esperar o improvisar el acceso.

Ficha Contigo convierte ese límite en el tema de un prototipo local pequeño. La paciente concede una parte identificada de una ficha ficticia, para un propósito declarado, en una institución determinada, por un plazo y un número de usos. También puede otorgar por adelantado un mandato de emergencia separado. Si se ejerce, deja un registro inmediato y una revisión humana que sigue abierta hasta que la paciente o alguien designado la cierre.

## Si estás evaluando Find Your Way o Meridian, empieza aquí

Lee la base del proyecto y su recorrido. Empieza por [Cómo funciona](./docs/HOW_IT_WORKS.md).

Abre el registro de pruebas. Consulta [Evidencia](./docs/EVIDENCE.md).

Lee los límites jurídicos y de verificación. Consulta [Marco legal y límites](./docs/LEGAL_AND_LIMITS.md).

Revisa las condiciones de publicación. Consulta [Código no incluido](./docs/CODE_NOT_INCLUDED.md) y la [licencia de solo revisión](./LICENSE).

## En un minuto

En el caso ficticio registrado, `persona-1` tiene tres partes de ejemplo: un resultado de laboratorio, un informe de imagenología y antecedentes personales. `prof-1` pide primero el resultado para dar continuidad al tratamiento. La solicitud se bloquea porque declarar un propósito no equivale a tener permiso. Luego la paciente concede solo esa parte, en una institución, para dos accesos y hasta una fecha definida. Una lectura dentro del alcance queda registrada como verificada y devuelve un valor de ejemplo. Una solicitud del informe de imagenología queda fuera del permiso y se bloquea. Más tarde, la paciente puede revocar la autorización sin borrar la lectura anterior. Para una emergencia ya había concedido otro mandato por adelantado; al ejercerlo se abre una revisión que sigue abierta hasta que ella la cierra. Todas las personas, instituciones, partes y valores del recorrido son ficticios.

## Cómo se ve en la práctica

Los datos del recorrido son ficticios, como indica su registro. Las siguientes líneas de salida se reproducen en su idioma original; el valor se marca expresamente como ejemplo. Este repositorio no incluye hoy el código fuente ni un comando ejecutable.

```text
parte-1  resultado de laboratorio  v1  huella 207379441beefced…

estado:   bloqueado
detalle:  no hay autorización de prof-1 para parte-1: un propósito declarado no abre la puerta
salida:   vuelve a la paciente: otorga un permiso con propósito y alcance, o deja la petición anotada sin contestar
```

Después de una autorización separada para esa parte, propósito, institución, plazo y presupuesto de usos, el recorrido registrado continúa:

```text
aut-1: prof-1 abre parte-1, 2 accesos, hasta 2026-10-01, con la huella que tiene hoy.
estado:       verificado
detalle:      el acceso ocurrió dentro de lo otorgado y el verificador lo recalculó desde el registro
entregado:    VALOR DE EJEMPLO: 7,4
```

Ese permiso no cubre otra parte. El bloqueo registrado dice que la autorización abre `parte-1` mientras la solicitud pide `parte-2`. En la ruta de emergencia, la paciente ya había otorgado un mandato de un uso con plazo de revisión. El acceso deja una revisión abierta; el profesional que lo usó no puede cerrarla y la auditoría no la considera cerrada hasta que lo haga la paciente o alguien designado. [Cómo funciona](./docs/HOW_IT_WORKS.md) presenta el recorrido completo y [Evidencia](./docs/EVIDENCE.md) conserva el registro de lo que se observó.

## Cómo funciona

```text
La paciente concede propósito + parte + institución + plazo + usos
                              |
El profesional solicita acceso |
                              v
                propósito, alcance, plazo, usos,
                 revocación y huella del contenido
                    /                     \
               bloqueado                permitido
              con su razón                   |
                                      acceso + recibo
                                             |
                                recálculo independiente

Mandato de emergencia previo -> acceso + recibo inmediato
                              -> revisión queda abierta
                              -> la paciente o designada la cierra
```

| Actor | Derechos en el modelo | Límite |
|---|---|---|
| Paciente | Conceder y revocar acceso ordinario, otorgar un mandato de emergencia por adelantado, leer el registro y cerrar su revisión posterior | La revocación rige hacia adelante. No borra un acceso que ya ocurrió. |
| Institución | Guardar la ficha de ejemplo y actuar dentro de lo que autorizó la paciente | Es ficticia; no hay prestador ni ficha real conectados. |
| Profesional tratante o posterior | Solicitar acceso para un propósito declarado | La solicitud o un motivo profesional por sí solos no son permiso; una petición fuera del alcance se bloquea. |
| Profesional de emergencia | Usar un mandato que la paciente ya otorgó | Sin autorización previa no hay acceso de emergencia; quien lo ejerció no puede cerrar la revisión. |
| Verificador | Recalcular el acceso registrado y comprobar la integridad de los recibos | Revisa el registro, no la verdad médica, la identidad ni el cumplimiento legal. |

Las reglas completas, incluido qué ocurre si cambia una parte de la ficha, están en [Cómo funciona](./docs/HOW_IT_WORKS.md).

## Por qué Ficha Contigo

| Necesitas | Qué te da | Dónde vive |
|---|---|---|
| Un permiso para una parte concreta, no para toda la ficha | Una parte, propósito, institución, vencimiento y presupuesto de usos identificados | [Cómo funciona](./docs/HOW_IT_WORKS.md) |
| Que un cambio deje de coincidir con el permiso anterior | La autorización lleva la huella de la parte; si no coincide, el acceso se bloquea | [Cómo funciona](./docs/HOW_IT_WORKS.md) |
| Retirar accesos futuros | La revocación de la paciente bloquea accesos posteriores y conserva el evento anterior | [Cómo funciona](./docs/HOW_IT_WORKS.md) |
| Una ruta de emergencia acordada de antemano | Un mandato separado, recibo inmediato y revisión humana posterior | [Cómo funciona](./docs/HOW_IT_WORKS.md) |
| Un registro que la paciente pueda revisar por separado | Un registro JSONL local que se puede leer sin Ficha Contigo | [Evidencia](./docs/EVIDENCE.md) |
| Una comprobación más allá de lo que afirma quien ejecutó | La verificación recalcula el acceso registrado y comprueba el recibo | [Evidencia](./docs/EVIDENCE.md) |

## Lo que no es

Ficha Contigo no es una ficha electrónica, un sistema clínico, una integración con prestadores, un servicio de identidad, un sistema de decisiones médicas ni una afirmación de cumplimiento. El repositorio público contiene por ahora el acuerdo, la documentación y la evidencia registrada, no el código fuente. Sus datos de ejemplo son ficticios y locales.

## Evidencia que puedes abrir

El registro actual de la suite informa **13 pruebas, 13 pasan, 0 omitidas**, corridas con Node v24.15.0. La suite se corrió en un clon limpio del proyecto, con HOME vacío y sin red, contra el kernel copiado dentro del proyecto en `vendor/vespi-kernel` y verificado módulo por módulo contra su `SOURCE.md`. Los trece casos se escribieron antes de la implementación. En la primera corrida roja, doce casos de comportamiento quedaron en rojo frente al esqueleto del módulo, mientras que la comprobación del digest del kernel pasó contra el corte fijado entonces. Una corrida registrada posterior informa 13/13 contra ese corte. La captura del 2026-10-03 estaba en rojo por otro motivo: el proyecto seguía fijado a un corte viejo del kernel (0.1.3) y el kernel se consume por digest, así que el movimiento se vio en la suite. Esa fijación se reevaluó y el proyecto ahora corre contra el kernel **0.1.5 publicado** (commit `ed559e8`); la captura en `docs/suite-2026-10-09.txt` es el resultado. [Evidencia](./docs/EVIDENCE.md) detalla los nombres y resultados.

El recorrido registrado cubre un acceso dentro del alcance, bloqueos por falta o exceso de permiso, corrección del contenido y diferencia de huellas, revocación, acceso de emergencia concedido antes, una revisión abierta y luego cerrada, bloqueos por presupuesto y vencimiento, flujo de conocimiento cero simulado, recibos y auditoría independiente. El anclaje Stellar figura como `pending`; nada llegó a una red. Son registros del proyecto, no una auditoría clínica ni de seguridad externa.

## Ficha Contigo, Vespi y Lore Plugin

Ficha Contigo es uno de los proyectos funcionales construidos sobre [Vespi](https://github.com/andresanemic/vespi) con [Lore Plugin](https://github.com/andresanemic/lore-plugin). Consume el kernel de Vespi sin modificarlo. El proyecto usa el kernel para autoridad acotada, comprobaciones de permisos, recibos y primitivas de verificación. Su lenguaje para la paciente traduce estados del kernel como `blocked` y `verified` a razones y resultados en español. El mandato de emergencia y la obligación de dejar una revisión humana abierta pertenecen a la capa de Ficha Contigo, no al kernel 0.1.3. La demostración de conocimiento cero se identifica como simulada; el verificador del kernel para esa capacidad quedó para 0.1.4.

**Qué significa esta relación.** El proyecto se construyó con el método de Lore Plugin (su acuerdo y su criterio viven en el proyecto, en `acuerdo.md` y `lore/`), y sus operaciones, autoridad y recibos corren sobre el kernel de Vespi 0.1.5, en la copia fijada que distribuye Lore Plugin 2.5.1 (`skills/vespi/core/kernel`). Esa copia está en el proyecto como `vendor/vespi-kernel` y la suite la verifica contra su `SOURCE.md`. Lore Plugin no corre dentro del proyecto. Este proyecto no usa las capacidades nuevas del kernel (anclas Stellar pubnet, liquidación x402 en vivo, el verificador ZK, el acceso de emergencia); ejerce el núcleo de operaciones, autoridad y recibos.

## Lo que no hace y lo que no está verificado

- No guarda datos clínicos o identificatorios reales, no se conecta con un prestador, no implementa FHIR ni toma decisiones clínicas reales.
- No tiene un servicio de emergencia activo, operación de red, anclaje en blockchain ni transacciones en Stellar testnet. El anclaje registrado sigue `pending`.
- El flujo de conocimiento cero es simulado. Este proyecto no tiene una prueba real, circuito ni verificador.
- No establece identidad, credenciales profesionales, verdad médica, consentimiento informado, validez legal ni cumplimiento de una norma.
- El reglamento contemplado por el artículo 13 de la Ley 21.668 no se leyó ni verificó, y ninguna persona competente en derecho ha revisado el proyecto.
- La suite acredita solo lo que cubren sus 13 pruebas nombradas. Las pruebas que pasan y el recorrido registrado no demuestran que esté listo para uso clínico.

Consulta [Marco legal y límites](./docs/LEGAL_AND_LIMITS.md) para el contexto jurídico y las preguntas abiertas, y [Evidencia](./docs/EVIDENCE.md) para el estado de la suite.

## Cómo revisar este proyecto

Empieza por [Cómo funciona](./docs/HOW_IT_WORKS.md) y luego compara los nombres de las pruebas con las corridas registradas en [Evidencia](./docs/EVIDENCE.md). Lee [Marco legal y límites](./docs/LEGAL_AND_LIMITS.md) y [Código no incluido](./docs/CODE_NOT_INCLUDED.md) antes de sacar conclusiones. El código fuente se publicará durante el periodo de revisión de los jueces bajo la [licencia de solo revisión](./LICENSE), que permite leer y clonar para evaluar. Cuando se abra, ejecuta `npm test` y compara el resultado con la captura registrada en `docs/suite-2026-10-09.txt`; una corrida nueva debe indicar qué corte del kernel probó.

## Autor

**Andrés Peña**, repository authority: `andresanemic`.

[<img src="./assets/icons/v2/telegram.svg" width="28" alt="Telegram">](https://t.me/andresanemic) &nbsp;&nbsp; [<picture><source media="(prefers-color-scheme: dark)" srcset="./assets/icons/v2/x-dark.svg"><img src="./assets/icons/v2/x.svg" width="28" alt="X"></picture>](https://x.com/andresanemic) &nbsp;&nbsp; [<img src="./assets/icons/v2/linkedin.svg" width="28" alt="LinkedIn">](https://www.linkedin.com/in/andresanemic/)

---

[Cómo funciona](./docs/HOW_IT_WORKS.md) · [Evidencia](./docs/EVIDENCE.md) · [Marco legal y límites](./docs/LEGAL_AND_LIMITS.md) · [Código no incluido](./docs/CODE_NOT_INCLUDED.md) · [Licencia de solo revisión](./LICENSE) · [Vespi](https://github.com/andresanemic/vespi) · [Lore Plugin](https://github.com/andresanemic/lore-plugin)

</details>
