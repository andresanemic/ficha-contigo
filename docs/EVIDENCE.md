# Evidence

## Current suite

The supplied current run reports **7 passing and 6 failing tests out of 13**. The project was built on 2026-09-29 against kernel cut `54c20c7`; its suite pins the consumed kernel by digest and intentionally fails when that kernel changes. The installed kernel is now 0.1.3, and the project has not yet been re-pinned and rerun against it. The recorded earlier green run is evidence for that earlier cut only. The failures today include behavior blocked by the changed kernel and the explicit digest check. This is the expected control doing its job, and it is also unfinished work: the suite needs an intentional re-pin and a fresh run. The code is not ready for use.

## What the named tests cover

The names below are copied from `suite-hoy.txt`.

### Patient-granted boundaries

- **1 · la entrega de datos clínicos sin autorización no abre, aunque el propósito esté declarado** (passes): a declared purpose by itself does not authorize access.
- **2 · el profesional que excede el alcance queda bloqueado, con su motivo** (passes): access outside the granted part is blocked with a reason.
- **3 · el acceso de emergencia sin otorgamiento previo no existe** (passes): emergency access requires an advance grant.
- **4 · el acceso de emergencia deja revisión abierta y sin cerrar no pasa la auditoría** (passes): emergency access creates an open review that must be closed.
- **5 · la ficha alterada después de autorizada deja de abrir, y el bloqueo nombra las dos huellas** (fails today): the grant is bound to the part's fingerprint and a changed part must be blocked with both fingerprints named.
- **6 · la revocación no cierra un acceso ya ocurrido, y el registro lo muestra** (fails today): revocation does not rewrite earlier access.
- **7 · caso de control: un acceso dentro de lo autorizado sí ocurre y se verifica** (fails today): a valid in-scope control case.
- **8 · el mismo acceso no se ejecuta dos veces: el segundo devuelve el recibo del primero** (fails today): repeated access returns the first receipt.

### Receipts and independent verification

- **9 · un recibo editado a mano no verifica** (passes): a changed receipt fails verification.
- **10 · un verificador que solo cree al ejecutor no puede producir un verde en la auditoría** (fails today): the audit must recompute from the record rather than accept the executor's claim.
- **12 · el registro es un archivo que la paciente puede abrir sin Ficha Contigo** (passes): the record is independently readable.

### Explicitly simulated capability and kernel pin

- **11 · la demostración de conocimiento cero no transporta el dato y se declara simulada** (passes): checks the labeled simulation and that the data is not carried in the demonstration flow; it is not a cryptographic proof.
- **13 · el núcleo que consume Ficha Contigo es el corte fijado, módulo por módulo** (fails today): verifies the pinned kernel digests and deliberately asks for a manual re-pin after kernel movement.

## What the earlier adversarial phase found

The agreement and `FASES.md` say that thirteen behavior cases were written before implementation and their red output was observed with the module skeleton present, so the failures were behavioral rather than caused by a missing module. The cases targeted unauthorized access, excess scope, emergency access without a prior mandate, mandatory open review, altered record content, forward-only revocation, a valid control access, idempotency, hand-edited receipts, a verifier that merely trusts the executor, the simulated proof boundary, readable records and the exact kernel cut. The 2026-09-29 green receipt later reports 13/13 passing against the pinned cut. These records describe the tests and walkthrough; they are not an external clinical or security audit.

## Recorded walkthrough and limits

The 2026-09-29 walkthrough log reports a full fictional flow: ordinary permission and access, an out-of-scope block, content correction and fingerprint mismatch, revocation, a pre-granted emergency access, an open review and patient-side closure, budget and expiry blocks, a simulated zero-knowledge demonstration, receipt checks and independent audit. It says the Stellar anchor remained `pending` and nothing reached the network. The example patient, institutions, professionals and record parts are fictional. The record also states that the test does not establish legal compliance, real-data custody, provider interoperability, FHIR support or permission from a provider.

The agreement says the law's article 13 regulation was not read or verified. The zero-knowledge verifier was deferred to kernel 0.1.4, and the emergency capability lives in this project's layer rather than kernel 0.1.3. No testnet transaction or explorer receipt exists for this project.

## How to rerun when the code opens

During the judges' review period the source will be published under the review-only license. From the project root, run `npm test`. The suite command in the source package is `node --test "test/*.test.js"`. First inspect the pinned digest case and deliberately re-evaluate each kernel digest against the chosen installed kernel; do not mechanically replace the pin. Then rerun the suite in a fresh session and compare the output with the recorded result. A new green run should identify the kernel cut it tested. No network or testnet transaction is part of this procedure.

## Español

### Suite actual

La corrida actual suministrada informa **7 pruebas aprobadas y 6 fallidas de un total de 13**. El proyecto se construyó el 2026-09-29 contra el corte `54c20c7` del kernel; su suite fija por digest el kernel consumido y falla intencionalmente cuando ese kernel cambia. El kernel instalado ahora es 0.1.3 y el proyecto aún no se ha vuelto a fijar ni a correr contra él. La corrida verde anterior es evidencia de ese corte anterior, no del kernel instalado hoy. Entre las fallas actuales hay comportamientos bloqueados por el cambio de kernel y la comprobación explícita de digest. Es el control esperado en funcionamiento, y también es trabajo pendiente: la suite requiere una nueva fijación deliberada y una corrida fresca. Las pruebas no indican que el código esté listo para uso.

### Qué cubren los nombres de las pruebas

Los nombres que siguen se copiaron de `suite-hoy.txt`.

#### Límites concedidos por la paciente

- **1 · la entrega de datos clínicos sin autorización no abre, aunque el propósito esté declarado** (pasa): declarar un propósito no autoriza por sí solo el acceso.
- **2 · el profesional que excede el alcance queda bloqueado, con su motivo** (pasa): el acceso fuera de la parte concedida se bloquea con una razón.
- **3 · el acceso de emergencia sin otorgamiento previo no existe** (pasa): el acceso de emergencia requiere una concesión previa.
- **4 · el acceso de emergencia deja revisión abierta y sin cerrar no pasa la auditoría** (pasa): el acceso de emergencia crea una revisión abierta que debe cerrarse.
- **5 · la ficha alterada después de autorizada deja de abrir, y el bloqueo nombra las dos huellas** (falla hoy): el permiso está ligado a la huella de la parte y un cambio debe bloquearla con ambas huellas identificadas.
- **6 · la revocación no cierra un acceso ya ocurrido, y el registro lo muestra** (falla hoy): la revocación no reescribe un acceso anterior.
- **7 · caso de control: un acceso dentro de lo autorizado sí ocurre y se verifica** (falla hoy): un caso de control permitido dentro del alcance.
- **8 · el mismo acceso no se ejecuta dos veces: el segundo devuelve el recibo del primero** (falla hoy): un intento repetido devuelve el primer recibo.

#### Recibos y verificación independiente

- **9 · un recibo editado a mano no verifica** (pasa): un recibo alterado no pasa la verificación.
- **10 · un verificador que solo cree al ejecutor no puede producir un verde en la auditoría** (falla hoy): la auditoría debe recalcular desde el registro, no aceptar lo que afirma el ejecutor.
- **12 · el registro es un archivo que la paciente puede abrir sin Ficha Contigo** (pasa): el registro se puede leer por separado.

#### Capacidad simulada y huella del kernel

- **11 · la demostración de conocimiento cero no transporta el dato y se declara simulada** (pasa): comprueba la etiqueta de simulación y que el flujo de demostración no transporte el dato; no es una prueba criptográfica.
- **13 · el núcleo que consume Ficha Contigo es el corte fijado, módulo por módulo** (falla hoy): verifica los digest fijados y solicita intencionalmente una nueva fijación manual si el kernel cambia.

### Qué encontró la fase adversarial anterior

El acuerdo y `FASES.md` dicen que los trece casos de comportamiento se escribieron antes de la implementación y que se observó su salida roja con el esqueleto del módulo ya presente, de modo que fallaban por comportamiento y no por ausencia del módulo. La corrida roja registró que todos los métodos del esqueleto decían «no implementado». Los casos cubrían acceso sin autorización, exceso de alcance, emergencia sin mandato previo, revisión obligatoria abierta, cambio del contenido, revocación hacia adelante, acceso de control permitido, idempotencia, recibos editados a mano, un verificador que solo confía en el ejecutor, el límite de la demostración simulada, registro legible y el corte exacto del kernel. El recibo verde del 2026-09-29 informa después 13/13 contra el corte fijado. Estos registros describen pruebas y un recorrido; no son una auditoría clínica ni de seguridad externa.

### Recorrido registrado y límites

El registro del recorrido del 2026-09-29 informa un flujo ficticio completo: permiso y acceso ordinarios, bloqueo fuera de alcance, corrección del contenido y diferencia de huellas, revocación, acceso de emergencia concedido antes, revisión abierta y cierre por la paciente, bloqueos por presupuesto y vencimiento, demostración simulada de conocimiento cero, comprobaciones de recibos y auditoría independiente. Indica que el anclaje Stellar siguió `pending` y que nada llegó a la red. La paciente, las instituciones, los profesionales y las partes de la ficha del ejemplo son ficticios. El registro también dice que las pruebas no establecen cumplimiento legal, custodia de datos reales, interoperabilidad con prestadores, soporte FHIR ni permiso de un prestador.

El acuerdo dice que el reglamento del artículo 13 no se leyó ni verificó. El verificador de conocimiento cero quedó para el kernel 0.1.4, y el acceso de emergencia vive en la capa del proyecto y no en el kernel 0.1.3. Este proyecto no tiene transacciones de testnet ni recibos en exploradores.

### Cómo volver a correr las pruebas cuando se abra el código

Durante el periodo de revisión de los jueces se publicará el código bajo la licencia de solo revisión. Desde la raíz del proyecto, ejecuta `npm test`. El comando de la suite en el paquete fuente es `node --test "test/*.test.js"`. Primero revisa el caso de digest fijados y vuelve a evaluar deliberadamente cada digest del kernel frente al kernel instalado elegido; no reemplaces la fijación de forma mecánica. Después vuelve a correr la suite en una sesión nueva y compara la salida con el resultado registrado. Una nueva corrida verde debe identificar el corte de kernel que probó. Este procedimiento no requiere red ni transacciones de testnet.
