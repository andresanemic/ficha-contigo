# How it works

## Scope

Ficha Contigo is a local, terminal-based prototype. It models a patient's control over access to separate parts of a clinical record and writes an inspectable JSONL record. All people, institutions and record contents are fictional; no real health or identifying data is present. No institution is connected and the record does not leave the project.

The project consumes Vespi's kernel without modifying it. The emergency mandate and its review are implemented in the project layer, not in kernel 0.1.3. The zero-knowledge demonstration is simulated, and the receipt's Stellar testnet anchor remains pending: nothing is sent to a network.

## Actors and boundaries

| Actor | What they can do in this model | Boundary |
|---|---|---|
| Patient | Grant and revoke ordinary access; grant an emergency mandate in advance; read the record; close the later emergency review | Only the patient grants or revokes these permissions. Revocation does not erase an access that already happened. |
| Institution | Hold the example record and act only within the patient's authorization | It is fictional; the prototype does not connect to a provider or custody real data. |
| Treating professional | Request and access a named record part for a declared purpose when authorized | A request or a professional reason alone does not grant access. |
| Later professional | Request access within the same constraints | An out-of-scope request is blocked with its reason. |
| Emergency professional | Use an emergency permission the patient granted beforehand | No prior mandate means no emergency access. The person who used it cannot close its review. |
| Verifier | Recompute what the record supports, independently of the executor's report | It verifies the recorded workflow and receipt integrity, not medical truth, identity or legal compliance. |

## A request, from start to finish

Suppose the fictional patient `persona-1` has a laboratory result (`parte-1`), an imaging report (`parte-2`) and personal history (`parte-3`). `prof-1` asks to read `parte-1` for continuity of treatment. The patient grants access to that part, for that purpose, at one institution, until a stated expiry and within a stated use budget. That permission does not cover the imaging report or personal history.

Before opening the record, the workflow checks the declared purpose, named part, destination, expiry, remaining uses, revocation state and the part's fingerprint. The fingerprint binds permission to the content that was authorized. If that content changes, the old permission no longer covers it; the block names both the authorized and current fingerprints. A successful access leaves a receipt and a record line. Repeating the same access key returns the first receipt rather than opening the record again.

If the patient later revokes the permission, a later request is blocked. The earlier access remains visible in its original order. A professional who asks for a different part is also blocked, even if the stated reason is clinically plausible; a wider scope requires another patient authorization.

For an emergency, the patient can grant a separate mandate before it is needed. It includes a declared reason, scope, expiry and use budget. Exercising it creates an immediate receipt and an open review. The patient, or a person the patient designated, closes that review later; it does not close itself, and the professional who used the emergency access cannot close it. Until it is closed, the record shows the review as pending and the audit does not treat the emergency as closed.

```text
Patient grants permission (purpose + part + institution + clock + uses)
                  |
Professional requests access
                  |
       scope and fingerprint checks
          /                 \
       blocked            permitted
     with reason              |
                         access + receipt
                              |
                   independent recomputation

Emergency mandate granted in advance -> access + immediate receipt
                                      -> review remains open
                                      -> patient/designated reviewer closes it
```

## What the agreement makes the workflow enforce

- A request is not permission. Without a matching authorization, nothing opens.
- Every ordinary permission is tied to a purpose, one or more specific record parts, an institution, an expiry and a use budget.
- The permission carries the fingerprint of the authorized part. A changed part needs a new authorization.
- The patient alone grants and revokes ordinary permissions. Revocation is permanent for that permission and works forward from the revocation; it does not erase earlier access.
- Emergency access exists only when the patient granted it in advance with a reason, scope and clock. It leaves an immediate receipt and a review that must be closed by the patient or their designee.
- A repeated access with the same key returns the original receipt.
- The verifier recomputes access facts from the record rather than trusting the executor's summary. Editing a receipt by hand must make its verification fail.
- A blocked action records the reason and a route back to what the patient can authorize.
- Simulated behavior must be labeled as simulated.

Each receipt records the requester, purpose, permission, scope, fingerprint opened, verifier checks and content fingerprint. The kernel's canonical receipt digest seals it, and `verifyReceipt` checks it. The record is a local JSONL file that the patient can read without the program.

## What this demonstrates, and what it does not

The prototype demonstrates a local flow for scoped patient authorization, purpose checks, revocation, content fingerprints, receipts, independent recomputation and advance-granted emergency access with an outstanding human review. Its test suite and recorded walkthrough use fictional inputs.

It does not prove that a real clinical system can safely access or store a record, that a provider can integrate it, that a patient or professional's identity is established, that a medical fact is true, or that any law is satisfied. It has no real data, provider integration, FHIR connection, network operation, blockchain anchor or actual zero-knowledge proof. The emergency mandate belongs to the project layer rather than kernel 0.1.3. [`EVIDENCE.md`](EVIDENCE.md) records the suite status and pending kernel re-pin. This prototype shows a working path, not a finished product or readiness for use.

## Related documents

- [Evidence](EVIDENCE.md) lists the named tests and recorded results.
- [Legal and limits](LEGAL_AND_LIMITS.md) records the cited legal context and open questions.

## Español

### Alcance

Ficha Contigo es un prototipo local que funciona desde la terminal. Modela el control de la paciente sobre el acceso a partes separadas de una ficha clínica y escribe un registro JSONL inspeccionable. Todas las personas, instituciones y partes de la ficha son ficticias; no hay datos reales de salud ni datos personales reales. Ninguna institución está conectada y el registro no sale del proyecto.

El proyecto consume el kernel de Vespi sin modificarlo. El mandato de emergencia y su revisión están implementados en la capa del proyecto, no en el kernel 0.1.3. La demostración de conocimiento cero está simulada y el anclaje Stellar del recibo queda pendiente: no se envía nada a una red.

### Actores y límites

| Actor | Qué puede hacer en este modelo | Límite |
|---|---|---|
| Paciente | Conceder y revocar acceso ordinario; otorgar por adelantado un mandato de emergencia; leer el registro; cerrar después la revisión de emergencia | Solo la paciente concede o revoca estos permisos. La revocación no borra un acceso que ya ocurrió. |
| Institución | Custodiar la ficha de ejemplo y actuar solo dentro de la autorización de la paciente | Es ficticia; el prototipo no se conecta con un prestador ni custodia datos reales. |
| Profesional tratante | Solicitar y consultar una parte identificada de la ficha para un propósito declarado si tiene autorización | La solicitud o un motivo profesional por sí solos no conceden acceso. |
| Profesional que llega después | Solicitar acceso con las mismas restricciones | Una solicitud fuera del alcance se bloquea con su motivo. |
| Profesional de emergencia | Usar un permiso de emergencia que la paciente concedió antes | Sin mandato previo no hay acceso de emergencia. Quien lo usó no puede cerrar su revisión. |
| Verificador | Recalcular qué permite afirmar el registro, por separado del informe del ejecutor | Verifica el flujo registrado y la integridad del recibo, no la verdad médica, la identidad ni el cumplimiento legal. |

### Una solicitud, de principio a fin

Supongamos que la paciente ficticia `persona-1` tiene un resultado de laboratorio (`parte-1`), un informe de imagenología (`parte-2`) y antecedentes personales (`parte-3`). `prof-1` pide leer `parte-1` para dar continuidad al tratamiento. La paciente concede acceso a esa parte, para ese propósito, en una institución, hasta un vencimiento y dentro de un presupuesto de usos. Ese permiso no cubre el informe de imagenología ni los antecedentes.

Antes de abrir la ficha, el flujo comprueba el propósito declarado, la parte identificada, el destino, el vencimiento, los usos disponibles, si hubo revocación y la huella de la parte. La huella vincula el permiso al contenido autorizado. Si ese contenido cambia, el permiso anterior deja de cubrirlo; el bloqueo nombra tanto la huella autorizada como la actual. Un acceso permitido deja un recibo y una línea en el registro. Si se repite la misma clave de acceso, se devuelve el primer recibo en lugar de abrir de nuevo la ficha.

Si después la paciente revoca el permiso, una solicitud posterior se bloquea. El acceso anterior permanece visible en su orden original. También se bloquea a un profesional que pide otra parte, aunque su motivo declarado parezca clínicamente razonable; ampliar el alcance exige otra autorización de la paciente.

Para una emergencia, la paciente puede otorgar un mandato separado antes de que se necesite. Incluye un motivo declarado, alcance, vencimiento y presupuesto de usos. Ejercerlo crea un recibo inmediato y una revisión abierta. La paciente, o alguien que haya designado, cierra esa revisión después; no se cierra sola y el profesional que usó el acceso de emergencia no puede cerrarla. Mientras siga abierta, el registro la muestra pendiente y la auditoría no presenta el acceso de emergencia como cerrado.

```text
La paciente concede permiso (propósito + parte + institución + plazo + usos)
                              |
El profesional solicita acceso
                              |
                 comprobación de alcance y huella
                       /                  \
                 bloqueado             permitido
               con su motivo                |
                                  acceso + recibo
                                          |
                               recálculo independiente

Mandato de emergencia previo -> acceso + recibo inmediato
                              -> revisión permanece abierta
                              -> paciente/designada la cierra
```

### Qué hace cumplir el flujo del acuerdo

- Una solicitud no es un permiso. Sin autorización coincidente, nada se abre.
- Cada permiso ordinario se vincula a un propósito, una o más partes específicas, una institución, un vencimiento y un presupuesto de usos.
- El permiso lleva la huella de la parte autorizada. Si la parte cambia, se necesita otra autorización.
- Solo la paciente concede y revoca permisos ordinarios. La revocación es permanente para ese permiso y rige hacia adelante; no borra accesos anteriores.
- El acceso de emergencia solo existe si la paciente lo otorgó antes con un motivo, alcance y plazo. Deja un recibo inmediato y una revisión que la paciente o alguien designado debe cerrar.
- Un acceso repetido con la misma clave devuelve el recibo original.
- El verificador recalcula los hechos de acceso desde el registro en vez de confiar en el resumen del ejecutor. Editar un recibo a mano debe hacer que falle la verificación.
- Una acción bloqueada registra el motivo y una salida para volver a lo que la paciente sí puede autorizar.
- El comportamiento simulado se debe identificar como tal.

Cada recibo registra quién solicitó, el propósito, el permiso, el alcance, la huella abierta, las comprobaciones del verificador y la huella del contenido. El digest canónico del recibo del kernel lo sella y `verifyReceipt` lo comprueba. El registro es un archivo JSONL local que la paciente puede leer sin el programa.

### Qué demuestra y qué no

El prototipo demuestra un flujo local de autorización de alcance concedida por la paciente, comprobación de propósito, revocación, huellas de contenido, recibos, recálculo independiente y acceso de emergencia otorgado por adelantado con una revisión humana pendiente. La suite de pruebas y el recorrido registrado usan datos ficticios.

No demuestra que un sistema clínico real pueda acceder o guardar una ficha de manera segura, que un prestador pueda integrarse, que se establezca la identidad de una paciente o profesional, que un dato médico sea verdadero ni que se cumpla una ley. No tiene datos reales, integración con prestadores, conexión FHIR, operación de red, anclaje en blockchain ni prueba real de conocimiento cero. El mandato de emergencia pertenece a la capa del proyecto y no al kernel 0.1.3. [`EVIDENCE.md`](EVIDENCE.md) informa el estado de la suite y la nueva fijación del kernel pendiente. Este prototipo muestra un camino que funciona, no un producto terminado ni algo listo para uso.

### Documentos relacionados

- [Evidencia](EVIDENCE.md) enumera las pruebas y sus resultados registrados.
- [Marco legal y límites](LEGAL_AND_LIMITS.md) reúne el contexto legal citado y las preguntas abiertas.
