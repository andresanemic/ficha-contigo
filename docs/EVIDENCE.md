# Evidence

## Current suite

The recorded run of 2026-10-11 reports **13 tests, 13 pass, 0 skipped**, on Node v24.15.0. It ran in a clean clone of the project, with an empty HOME and no network, against the kernel copied into the project under `vendor/vespi-kernel` and checked module by module against its `SOURCE.md` (Vespi 0.1.6, commit `98a3328`). The full output is in [`suite-2026-10-11.txt`](suite-2026-10-11.txt).

## Why the earlier capture was red

The 2026-10-03 capture was red because the project was still pinned to an older kernel cut (0.1.3). The kernel is consumed by digest, module by module, so the movement showed up in the suite and in the pin check. That pin was reassessed and the project now runs against kernel 0.1.6 (commit `98a3328`); the run above is the result of that re-pin.

## What the named tests cover

The names below are copied from `suite-2026-10-11.txt`.

### Patient-granted boundaries

- **1 · la entrega de datos clínicos sin autorización no abre, aunque el propósito esté declarado** (passes): a declared purpose by itself does not authorize access.
- **2 · el profesional que excede el alcance queda bloqueado, con su motivo** (passes): access outside the granted part is blocked with a reason.
- **3 · el acceso de emergencia sin otorgamiento previo no existe** (passes): emergency access requires an advance grant.
- **4 · el acceso de emergencia deja revisión abierta y sin cerrar no pasa la auditoría** (passes): emergency access creates an open review that must be closed.
- **5 · la ficha alterada después de autorizada deja de abrir, y el bloqueo nombra las dos huellas** (passes): the grant is bound to the part's fingerprint and a changed part must be blocked with both fingerprints named.
- **6 · la revocación no cierra un acceso ya ocurrido, y el registro lo muestra** (passes): revocation does not rewrite earlier access.
- **7 · caso de control: un acceso dentro de lo autorizado sí ocurre y se verifica** (passes): a valid in-scope control case.
- **8 · el mismo acceso no se ejecuta dos veces: el segundo devuelve el recibo del primero** (passes): repeated access returns the first receipt.

### Receipts and independent verification

- **9 · un recibo editado a mano no verifica** (passes): a hand-edited receipt does not verify.
- **10 · un verificador que solo cree al ejecutor no puede producir un verde en la auditoría** (passes): the audit must recompute from the record rather than accept the executor's claim.
- **12 · el registro es un archivo que la paciente puede abrir sin Ficha Contigo** (passes): the record is independently readable.

### Explicitly simulated capability and kernel pin

- **11 · la demostración de conocimiento cero no transporta el dato y se declara simulada** (passes): checks the labeled simulation and that the data is not carried in the demonstration flow; it is not a cryptographic proof.
- **13 · el núcleo que consume Ficha Contigo es el corte fijado, módulo por módulo** (passes): verifies the pinned kernel digests and deliberately asks for a manual re-pin after kernel movement.

## What the earlier adversarial phase found

The agreement and `FASES.md` say that thirteen behavior cases were written before implementation and their red output was observed with the module skeleton present, so the red came from behavior rather than from a missing module. The cases targeted unauthorized access, excess scope, emergency access without a prior mandate, mandatory open review, altered record content, forward-only revocation, a valid control access, idempotency, hand-edited receipts, a verifier that merely trusts the executor, the simulated proof boundary, readable records and the exact kernel cut. The 2026-09-29 green receipt later reports 13/13 passing against the pinned cut. These records describe the tests and walkthrough; they are not an external clinical or security audit.

## Recorded walkthrough and limits

The 2026-09-29 walkthrough log reports a full fictional flow: ordinary permission and access, an out-of-scope block, content correction and fingerprint mismatch, revocation, a pre-granted emergency access, an open review and patient-side closure, budget and expiry blocks, a simulated zero-knowledge demonstration, receipt checks and independent audit. It says the Stellar anchor remained `pending` and nothing reached the network. The example patient, institutions, professionals and record parts are fictional. The record also states that the test does not establish legal compliance, real-data custody, provider interoperability, FHIR support or permission from a provider.

The agreement says the law's article 13 regulation was not read or verified. The zero-knowledge verifier was deferred to kernel 0.1.4, and the emergency capability lives in this project's layer rather than kernel 0.1.3. No testnet transaction or explorer receipt exists for this project.

## How to rerun the suite

The source is in this repository under the review-only license (reading and cloning for evaluation; no modification or redistribution). From the project root, run `npm test` on Node 24. The suite command in the source package is `node --test "test/*.test.js"`. A rerun should give the same count as the recorded run: **13 tests, 13 pass, 0 skipped**, on Node v24.15.0. The full output of that run is the reference and is kept in [`suite-2026-10-11.txt`](suite-2026-10-11.txt). A new run should identify the kernel cut it tested. No network or testnet transaction is part of this procedure.

# Español

## Suite actual

La corrida registrada del 2026-10-11 informa **13 pruebas, 13 pasan, 0 omitidas**, con Node v24.15.0. Se corrió en un clon limpio del proyecto, con HOME vacío y sin red, contra el kernel copiado dentro del proyecto en `vendor/vespi-kernel` y verificado módulo por módulo contra su `SOURCE.md` (Vespi 0.1.6, commit `98a3328`). La salida completa está en [`suite-2026-10-11.txt`](suite-2026-10-11.txt).

## Por qué la captura anterior estaba en rojo

La captura del 2026-10-03 estaba en rojo porque el proyecto seguía fijado a un corte viejo del kernel (0.1.3). El kernel se consume por digest, módulo por módulo, así que el movimiento se vio en la suite y en la comprobación de la fijación. Esa fijación se reevaluó y el proyecto ahora corre contra el kernel 0.1.6 (commit `98a3328`); la corrida de arriba es el resultado de ese re-pin.

## Qué cubren los nombres de las pruebas

Los nombres que siguen se copiaron de `suite-2026-10-11.txt`.

### Límites concedidos por la paciente

- **1 · la entrega de datos clínicos sin autorización no abre, aunque el propósito esté declarado** (pasa): declarar un propósito no autoriza por sí solo el acceso.
- **2 · el profesional que excede el alcance queda bloqueado, con su motivo** (pasa): el acceso fuera de la parte concedida se bloquea con una razón.
- **3 · el acceso de emergencia sin otorgamiento previo no existe** (pasa): el acceso de emergencia requiere una concesión previa.
- **4 · el acceso de emergencia deja revisión abierta y sin cerrar no pasa la auditoría** (pasa): el acceso de emergencia crea una revisión abierta que debe cerrarse.
- **5 · la ficha alterada después de autorizada deja de abrir, y el bloqueo nombra las dos huellas** (pasa): el permiso está ligado a la huella de la parte y un cambio debe bloquearla con ambas huellas identificadas.
- **6 · la revocación no cierra un acceso ya ocurrido, y el registro lo muestra** (pasa): la revocación no reescribe un acceso anterior.
- **7 · caso de control: un acceso dentro de lo autorizado sí ocurre y se verifica** (pasa): un caso de control permitido dentro del alcance.
- **8 · el mismo acceso no se ejecuta dos veces: el segundo devuelve el recibo del primero** (pasa): un intento repetido devuelve el primer recibo.

### Recibos y verificación independiente

- **9 · un recibo editado a mano no verifica** (pasa): un recibo alterado no pasa la verificación.
- **10 · un verificador que solo cree al ejecutor no puede producir un verde en la auditoría** (pasa): la auditoría debe recalcular desde el registro, no aceptar lo que afirma el ejecutor.
- **12 · el registro es un archivo que la paciente puede abrir sin Ficha Contigo** (pasa): el registro se puede leer por separado.

### Capacidad simulada y huella del kernel

- **11 · la demostración de conocimiento cero no transporta el dato y se declara simulada** (pasa): comprueba la etiqueta de simulación y que el flujo de demostración no transporte el dato; no es una prueba criptográfica.
- **13 · el núcleo que consume Ficha Contigo es el corte fijado, módulo por módulo** (pasa): verifica los digest fijados y solicita intencionalmente una nueva fijación manual si el kernel cambia.

## Qué encontró la fase adversarial anterior

El acuerdo y `FASES.md` dicen que los trece casos de comportamiento se escribieron antes de la implementación y que se observó su salida roja con el esqueleto del módulo ya presente, de modo que el rojo venía del comportamiento y no de la ausencia del módulo. La corrida roja registró que todos los métodos del esqueleto decían «no implementado». Los casos cubrían acceso sin autorización, exceso de alcance, emergencia sin mandato previo, revisión obligatoria abierta, cambio del contenido, revocación hacia adelante, acceso de control permitido, idempotencia, recibos editados a mano, un verificador que solo confía en el ejecutor, el límite de la demostración simulada, registro legible y el corte exacto del kernel. El recibo verde del 2026-09-29 informa después 13/13 contra el corte fijado. Estos registros describen pruebas y un recorrido; no son una auditoría clínica ni de seguridad externa.

## Recorrido registrado y límites

El registro del recorrido del 2026-09-29 informa un flujo ficticio completo: permiso y acceso ordinarios, bloqueo fuera de alcance, corrección del contenido y diferencia de huellas, revocación, acceso de emergencia concedido antes, revisión abierta y cierre por la paciente, bloqueos por presupuesto y vencimiento, demostración simulada de conocimiento cero, comprobaciones de recibos y auditoría independiente. Indica que el anclaje Stellar siguió `pending` y que nada llegó a la red. La paciente, las instituciones, los profesionales y las partes de la ficha del ejemplo son ficticios. El registro también dice que las pruebas no establecen cumplimiento legal, custodia de datos reales, interoperabilidad con prestadores, soporte FHIR ni permiso de un prestador.

El acuerdo dice que el reglamento del artículo 13 no se leyó ni verificó. El verificador de conocimiento cero quedó para el kernel 0.1.4, y el acceso de emergencia vive en la capa del proyecto y no en el kernel 0.1.3. Este proyecto no tiene transacciones de testnet ni recibos en exploradores.

## Cómo volver a correr las pruebas

El código está en este repositorio bajo la licencia de solo revisión (permite leer y clonar para evaluar, no modificar ni redistribuir). Desde la raíz del proyecto, ejecuta `npm test` con Node 24. El comando de la suite en el paquete fuente es `node --test "test/*.test.js"`. Una nueva corrida debe dar el mismo conteo que la registrada: **13 pruebas, 13 pasan, 0 omitidas**, con Node v24.15.0. La salida completa de esa corrida es la referencia y se conserva en [`suite-2026-10-11.txt`](suite-2026-10-11.txt). Una corrida nueva debe identificar el corte de kernel que probó. Este procedimiento no requiere red ni transacciones de testnet.
