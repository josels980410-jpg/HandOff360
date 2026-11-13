# MEMORY.md — Memoria viva del proyecto · HandOff 360

> Este archivo registra contexto, alcances, decisiones y pendientes para que cualquier agente (o el equipo) retome el proyecto sin perder hilo. Se actualiza con cada cambio estructural.

---

## 1. Contexto

- **Proyecto:** HandOff 360 — plataforma inteligente para la continuidad operativa en cambios de turno.
- **Hackathon:** Prototipo funcional para demo con jueces.
- **Fecha de inicio:** 2026-11-10.
- **Estado actual:** v1.0 demo funcional y verificada en navegador, con identificación local de turno por sector, modal crítico obligatorio al entrar al panel y resolución de alertas desde el detalle del caso (flujos E2E con CDP, sin errores de consola ni desbordes horizontales).

### Problema que resuelve

Cuando un turno termina, la información operativa (pendientes, alertas, novedades) se pierde entre charlas informales. HandOff 360 captura el cierre de turno, lo deja escrito en una bitácora y lo deja buscable para el siguiente turno.

### Usuario objetivo

- Personal operativo de salud, logística o retail que usa el celular en el turno.
- Personas sin capacitación técnica: botones grandes, lenguaje claro, cero fricción.

---

## 2. Alcance de esta versión (v1.0 demo)

### Incluido

- 3 sectores precargados con datos simulados: **Salud / Hospitales**, **Logística y Carga**, **Retail / Tiendas**.
- Pantalla de inicio con los 3 botones grandes y botón "Volver a Sectores".
- **Identificación de turno obligatoria** por sector: nombre del profesional y área/departamento dinámico; perfil guardado en `localStorage` y reflejado en header, dashboard, entrega, historial y chatbot.
- **Modal crítico obligatorio al entrar al panel**: muestra la alerta más urgente del sector, caso/ID y tiempo transcurrido; fondo negro, detalles verdes y texto blanco; al cerrarlo se habilita la navegación.
- **Dashboard**: hero con indicador principal, KPIs, alertas críticas, pendientes activos, último cierre.
- **KPIs y métricas operativas**: pestaña propia con tasa de resolución de turno, alertas críticas atendidas, distribución de pendientes por prioridad y tiempo promedio de cierre, todo calculado desde `localStorage`.
- **Gestión de Encargado de Área (Salud)**: dos pantallas accesibles desde el panel para registrar, asignar y mover personal por área crítica, y para controlar la cobertura de los turnos Matutino, Vespertino y Nocturno.
- **Entrega de turno**: resumen y pendientes con dictado por voz; el pendiente dictado se integra al campo, se guarda con prioridad (alta/media/baja) y el cierre genera reporte y actualiza bitácora.
- **Soporte Técnico**: acceso directo en el header de cada sector; panel estático con FAQ operativas, reporte de fallas guardado localmente, contacto 24/7 simulado y botón “💬 Hablar con un asesor” que abre el asistente con 6 chips de soporte.- **Bloc Offline**: pestaña propia para escribir o dictar notas rápidas sin internet, guardadas en `localStorage` y convertibles en pendientes oficiales.
- **Historial y buscador**: reportes de turno y casos del sector; búsqueda por nombre o ID; detalle con línea de tiempo.
- **Resolución de alertas**: desde el detalle de un caso se escribe o dicta la resolución; al guardarla se cierra la alerta activa, baja el contador del dashboard y el caso queda como `Resuelto`.
- **Chatbot asistente flotante**: lenguaje natural local (sin API externa) con acciones reales: resumen, pendientes, alertas, búsqueda, preparar/cerrar turno, navegación, lectura del Bloc Offline, conversión de notas en pendientes y 6 chips de soporte interactivo.
- **Dictado por voz**: Web Speech API (`es-MX`) con fallback si el navegador no lo soporta.
- **Persistencia 100% local** en `localStorage` bajo la clave `handoff360:v1`.
- **Diseño mobile-first** con paleta estricta verde/negro/blanco.

### Fuera de alcance (v1.0)

- Autenticación real, contraseñas, roles o permisos. El perfil local (nombre + área) no valida identidad ni protege el acceso a los datos; solo da contexto al turno.
- Sincronización entre dispositivos o navegadores.
- Notificaciones push.
- Exportación a PDF/Excel (se contempla "copiar reporte" al portapapeles).
- Backend con base de datos o APIs externas.
- Multilenguaje (solo español por ahora).

---

## 3. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | Frontend sin frameworks (JS nativo + ES Modules) | Ultraligero, sin build, sin dependencias, arranque inmediato para jueces. |
| D2 | Persistencia solo en `localStorage` | Requisito explícito 100% local; cero costos y funciona offline. |
| D3 | Flask solo como servidor estático | Entregar un backend Python "real" para el hackathon sin lógica de negocio innecesaria. |
| D4 | Chatbot basado en intenciones locales (regex/normalización) | Sin APIs de pago ni conexión; la demo debe funcionar sin internet. |
| D5 | Datos simulados por sector | Los jueces pueden probar de inmediato sin configurar nada. |
| D6 | Hash router (`#/s/<sector>/<tab>`) | Funciona en cualquier servidor estático, sin reescritura de URL. |
| D7 | Paleta estricta verde/negro/blanco | Identidad institucional pedida; el estado se comunica con fondos y texto, no con colores ajenos. |
| D8 | Reporte de cierre como snapshot | El historial debe mostrar qué se sabía al cerrar, no el estado actual mutable. |
| D9 | Botón flotante de asistente (FAB) | Accesible con el pulgar en cualquier pantalla del sector. |
| D10 | Perfil local de turno, sin login | El operador se identifica con nombre y área para dar contexto al turno; no hay contraseña, roles ni identidad remota. |
| D11 | `acceso` obligatorio por sector | Cada entrada al sector permite confirmar o cambiar el operador; las rutas operativas redirigen a `acceso` si no hay perfil. |
| D12 | Modal crítico obligatorio tras la identificación | El operador debe ver la alerta más urgente antes de operar; el acuse se guarda en `localStorage` y se reinicia al identificarse de nuevo. |
| D13 | Resolución local desde el caso | El operador registra cómo atendió la alerta; la nota queda vinculada al caso, se elimina la alerta activa y el dashboard se actualiza sin salir de la app. |
| D14 | Dictado integrado en el pendiente | El micrófono vive junto al campo y al botón `+`; la transcripción se refleja en tiempo real, respeta el límite de 160 caracteres y conserva la prioridad elegida al guardar. |
| D15 | KPIs como pestaña propia | Las métricas se calculan puras en `core/metrics.js` y se presentan en `#/s/<sector>/kpis`; la vista nunca escribe en el store para que los indicadores siempre reflejen el estado real. |
| D16 | Soporte Técnico como panel estático, no como vista | Se abre desde el header con HTML fijo y script inline (`window.HandOffSupport`): no añade otra ruta, no compite con las pestañas y no depende de la carga de módulos ni de la caché; el reporte de fallas se guarda localmente como `supportTickets`. |
| D17 | Bloc Offline con notas y no con un solo borrador | Cada nota es un registro independiente (`notes[]`) que se puede dictar, listar, borrar o convertir; convertir marca la nota para no duplicar pendientes. |
| D18 | El chatbot como interfaz del Bloc Offline | Las sugerencias “Bloc Offline” y “Convertir notas a pendientes” permiten que la IA lea y estructure las notas sin salir del chat. |
| D19 | Soporte conectado al asistente por callback | El panel inline despacha `support:advisor`; `core/support.js` escucha y recibe `onTalkToAdvisor`, y `app.js` lo conecta con `openAdvisorChat()`. Así `core/` sigue sin depender de `features/` y el flujo inverso tampoco se rompe. |
| D20 | Chips de soporte embebidos en el mensaje | Los 6 atajos viven dentro del mensaje de asesor (`.msg-chips`) y no en la barra de sugerencias, para que el orden contextual sea el que guíe al usuario y no una lista global. |
| D21 | El shell mide el viewport visible, no el de layout | `core/viewport.js` publica `--vvh`/`--vv-top`/`--kb-inset` desde `visualViewport`. Con `100dvh` el teclado en pantalla dejaba el panel del chat anclado fuera de la vista y los chips quedaban inalcanzables en iOS. |
| D22 | El chat no roba el foco en táctil | Abrir el asistente con `focus: false` evita que el teclado tape los 6 chips de soporte; el operador toca el campo cuando quiere escribir. En escritorio se mantiene el autofocus por comodidad. |
| D23 | El rol de encargado es por sector, no global | `supportsSupervisor()` en `core/staff.js` habilita las rutas `personal` y `horarios` solo en Salud. Así el módulo se abre desde el panel del sector correcto sin duplicar vistas ni meter reglas en el store. |
| D24 | La cobertura se calcula, no se declara | `computeShiftSummary()` y `computeAreaDistribution()` son funciones puras sobre `staff[]`: los contadores y las barras siempre reflejan el estado real guardado en `localStorage`. |
| D25 | Los eventos delegados se enganchan al `.view` interno | `root` sobrevive al re-render del store: engancharle listeners los duplica y cada acción se ejecuta N veces (un toggle se cancelaba solo). El listener vive en el `.view`, que se recrea en cada montaje. |
| D26 | `bindTap()` reservado a modales | El `click` de un toque móvil llega tarde y puede caer sobre un elemento que ya apareció (el scrim del chat), cerrando lo que se acababa de abrir. `bindTap()` actúa en `pointerup` y distingue un arrastre de un toque real; el Soporte y el FAB usan `click` nativo. |
| D27 | Un modal cerrado no puede reaparecer | El fallback sin `requestAnimationFrame` de `modal()` respeta el flag `closed` y cancela su timer al cerrar. Sin esa guarda, el overlay cerrado volvía a abrirse 80 ms después y bloqueaba la pantalla completa con `pointer-events: auto`. |
| D28 | Soporte como panel estático y chat con `click` nativo | El panel de Soporte es HTML fijo en `index.html` con su propio script inline (`window.HandOffSupport`): abre de inmediato, sin `modal()` ni creación dinámica, y no depende de la carga de módulos ni de la caché. El FAB del asistente vuelve al `click` nativo; `bindTap()` queda solo para las acciones dentro de modales. |

---

## 4. Esquema de datos (localStorage `handoff360:v1`)

```json
{
  "version": 1,
  "createdAt": "2026-11-10T00:00:00.000Z",
  "sectors": {
    "<sectorId>": {
      "meta": {
        "short": "Salud",
        "area": "Hospital San Rafael · Piso 4",
        "emoji": "🏥",
        "shiftLabel": "Turno Mañana",
        "shiftNumber": 12,
        "supervisor": "Dra. Elena Ríos",
        "handoffLead": "Dr. Marco Salas",
        "areas": ["Urgencias", "Hospitalización", "UCI", "Quirófano", "Consulta Externa"]
      },
      "profile": { "name": "Elena Ríos", "area": "Urgencias", "startedAt": "...", "updatedAt": "..." },
      "hero": { "label": "Ocupación de camas", "value": 82, "suffix": "%", "sub": "41 de 50 camas ocupadas", "goal": 75 },
      "kpis": [{ "id": "camas", "label": "Camas disponibles", "value": "9", "hint": "de 50 totales", "icon": "bed", "tone": "normal" }],
      "alerts": [{ "id": "AL-01", "severity": "critical", "title": "...", "detail": "...", "time": "hace 18 min", "caseId": "PAC-1042" }],
      "pendings": [{ "id": "pd-1", "text": "...", "priority": "alta", "done": false, "createdAt": "...", "doneAt": "..." }],
      "notes": [{ "id": "note-1", "text": "...", "createdAt": "...", "updatedAt": "...", "converted": false, "convertedAt": "..." }],
      "staff": [{ "id": "stf-1", "name": "Enf. Lucía Paz", "role": "Enfermería", "area": "Urgencias", "shift": "matutino", "active": true, "createdAt": "...", "updatedAt": "..." }],
      "supportTickets": [{ "id": "sup-1", "category": "Dictado por voz", "message": "...", "contact": "...", "createdAt": "..." }],
      "log": [{ "id": "log-1", "type": "inicio|cierre|pendiente|alerta", "text": "...", "at": "..." }],
      "cases": [{ "id": "PAC-1042", "name": "María González", "status": "Observación UCI", "statusTone": "critical", "location": "Cama 214", "owner": "Enf. Lucia Paz", "detail": "...", "updatedAt": "...", "timeline": [{ "time": "08:00", "text": "..." }], "resolution": { "note": "Traslado confirmado a UCI central.", "at": "...", "by": "Elena Ríos", "area": "Urgencias", "severity": "critical", "responseMs": 1080000 } }],
      "reports": [{ "id": "REP-111", "shiftLabel": "...", "supervisor": "...", "closedBy": "...", "closedByArea": "...", "summary": "...", "pendings": [], "criticalAlerts": 1, "totalAlerts": 3, "kpis": [], "hero": {}, "createdAt": "..." }],
      "reportSeq": 112,
      "draft": "",
      "lastClose": { "reportId": "REP-111", "createdAt": "..." },
      "criticalAck": { "alertId": "AL-01", "at": "..." },
      "chat": [{ "id": "msg-1", "role": "bot|user", "text": "...", "at": "...", "advisor": true, "chips": [{ "id": "cierre-turno", "label": "📋 Problema al cerrar o guardar mi turno" }], "actions": [{ "label": "...", "action": "confirm_close", "value": "" }] }]
    }
  }
}
```

### Reglas de integridad

- `profile` es independiente por sector y se crea con `setProfile(id, { name, area })`; `area` debe existir en `meta.areas`.
- `setProfile()` reinicia `criticalAck` para que el modal crítico se muestre en cada nueva identificación; `ackCriticalAlert()` guarda el acuse sin emitir.
- `criticalAck` compara `alertId` con la alerta más urgente; si no coincide o no existe, el modal se muestra al montar el dashboard.
- `initStore()` rellena `meta.areas` en estados antiguos y descarta perfiles con área inválida sin cambiar la versión de almacenamiento.
- `reportSeq` es el próximo número de reporte; los seeds usan 110/111 y arrancan en 112.
- Cerrar turno: crea `REP-<reportSeq>`, incrementa `reportSeq`, archiva `pendings` en el reporte, limpia `pendings`, limpia `draft`, agrega entrada a `log` y guarda `closedBy`/`closedByArea` del perfil activo.
- `cases` no se modifican por el cierre (son el censo/registro del sector), salvo la resolución explícita desde el detalle.
- `resolveCaseAlert(id, caseId, note)` valida la nota, guarda `resolution` en el caso, marca `status: "Resuelto"` y `statusTone: "done"`, actualiza `updatedAt`, agrega una entrada a `timeline`, elimina las alertas activas con ese `caseId` y registra la bitácora. La resolución guarda `severity` y `responseMs` para alimentar los KPIs.
- `notes` es el Bloc Offline: se agrega con `addNote`, se borra con `deleteNote` y se convierte con `convertNotesToPendings(id, noteIds)`. Al convertir, la nota queda marcada `converted: true` y el pendiente nasce con prioridad `media`.
- `staff` es la plantilla del Encargado de Área: `addStaffMember`, `updateStaffMember` y `removeStaffMember` son las únicas vías. `shift` ∈ `matutino|vespertino|nocturno`, `role` ∈ `Enfermería|Medicina|Apoyo|Administrativo` y `active` indica si la persona está en puesto o falta.
- `supportTickets` guarda los reportes de fallas del panel de Soporte mediante `addSupportTicket(id, { category, message, contact })`.
- `togglePending()` guarda `doneAt` cuando se marca como atendido y lo borra al revertirlo; alimenta el tiempo promedio de cierre.
- `chat` se conserva por sector y se recorta a los últimos 60 mensajes.
- El mensaje de asesor es un mensaje `bot` con `advisor: true` y `chips[]`; cada chip guarda `id` y `label`. Si ya existe un mensaje de asesor, `openAdvisorChat()` solo abre el panel para no duplicarlo.
- `draftClosed` es una bandera transitoria (no forma parte del seed) que evita resucitar el borrador cuando el cierre se dispara desde el asistente y la vista de entrega se desmonta.
- Si `version` cambia, se recrea el estado con seed (migración simple, sin datos reales).

---

## 5. Flujo de pantallas

```
#/  (Selección de sector)
 │
 ├── #/s/<sector>/acceso      Identificación: nombre + área → Entrar al Turno
 │
  ├── #/s/salud/panel      ──┐
  ├── #/s/logistica/panel  ──┤   Dashboard
  ├── #/s/retail/panel     ──┘
  │
  ├── #/s/<sector>/kpis        KPIs y métricas → tasa, críticas, prioridad, tiempo
  │
  ├── #/s/salud/personal       Encargado de área → asignar y mover personal por área
  │
  ├── #/s/salud/horarios       Encargado de área → tablero de turnos y cobertura
  │
  ├── #/s/<sector>/bloc        Bloc Offline → notas sin internet → pendientes
  │
  ├── #/s/<sector>/turno       Entrega → Cerrar turno → Reporte en historial
  │
  ├── #/s/<sector>/historial   Buscador por nombre/ID → Detalle de reporte o caso
  │
  ├── Header (por sector)       Acceso directo a Soporte Técnico (panel)
  │
  └── FAB (flotante)           Chatbot local → acciones sobre datos
```

Reglas de navegación:

- Tocar un sector desde `#/` siempre abre `acceso`; si ya hay perfil, el formulario aparece precargado para confirmar o cambiar.
- Si se intenta abrir `panel`, `kpis`, `bloc`, `turno` o `historial` sin perfil, se redirige a `acceso`.
- `personal` y `horarios` solo existen en Salud (`supportsSupervisor()`); en otro sector redirigen al panel.
- El botón "Volver a Sectores" está siempre en el header del sector y navega a `#/`.
- Cualquier `sectorId` inválido normaliza el hash a `#/` y muestra la selección de sector.
- La nav inferior tiene 5 pestañas: **Panel**, **KPIs**, **Entrega**, **Bloc**, **Historial**. En `acceso` se ocultan nav, FAB y chat.
- El FAB solo aparece dentro de un sector con perfil activo.
- El acceso a Soporte Técnico vive en el header de cada sector y abre un panel, no una ruta.
- Al entrar al panel después de identificarse, se abre automáticamente el modal de la alerta más urgente del sector; al cerrarlo, se puede navegar con normalidad.
- El detalle de un caso se abre como modal desde dashboard o historial. Si no tiene resolución, permite escribir/dictar una nota y usar la acción primaria **Resolver y Cerrar Alerta**; al guardar, la alerta desaparece del panel y el caso queda como `Resuelto`.

---

## 6. Comandos y arranque

```powershell
# Opción 1: script todo-en-uno
.\run.ps1

# Opción 2: manual
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

- URL: `http://127.0.0.1:5000`
- Health check: `http://127.0.0.1:5000/health`
- Para emular móvil: Chrome DevTools → Device Toolbar → iPhone 12/13 (390×844).
- Para ver en el teléfono: `python app.py` y abrir `http://<IP-local>:5000`. `app.py` lee `PORT` (por defecto 5000), `HOST` (por defecto `0.0.0.0`) y `FLASK_DEBUG` (por defecto 0) del entorno.
- Despliegue en Render: `Procfile` (`web: python app.py`) y `render.yaml` (build `pip install -r requirements.txt`, start `python app.py`, health check `/health`).
- Si responde "conexión rechazada", el servidor Flask no está corriendo: relanzarlo con `run.ps1`.
- En móvil el teclado en pantalla reduce el viewport visible; `core/viewport.js` lo refleja en `--vvh` para que el shell y el panel del chat se ajusten. Si el navegador no reporta `visualViewport`, la app cae a `100dvh` y el teclado puede cubrir la parte inferior.
- En táctil, el `click` de un toque llega tarde: el scrim del chat ignora los 500 ms posteriores a abrirse para que el gesto que abre el asistente no lo cierre. El panel de Soporte y el FAB usan `click` nativo (vía `onclick` inline y `addEventListener`), que responde de forma directa en el mismo gesto.

---

## 7. Guía rápida para la demo (jueces)

1. Abrir la app → aparecen los 3 sectores.
2. Tocar **🏥 Salud / Hospitales**.
3. Identificarse: escribir un nombre, elegir **Urgencias** y tocar **Entrar al Turno**.
4. El modal crítico aparece automáticamente con la alerta de UCI, el caso `PAC-1042` y el tiempo transcurrido. Cerrarlo con **Entendido, revisar caso**.
5. Revisar el panel: ocupación de camas 82%, 1 alerta crítica, 2 pendientes; el nombre y el área aparecen en header y panel.
6. Tocar la alerta crítica → se abre el caso `PAC-1042` con su línea de tiempo.
7. Escribir o dictar la resolución → tocar **Resolver y Cerrar Alerta** → la alerta desaparece del panel y el caso queda como `Resuelto`.
8. Ir a **Entrega** → escribir o dictar el resumen → agregar un pendiente → **Cerrar turno**.
9. Abrir la pestaña **KPIs** → revisar tasa de resolución, críticas atendidas, mezcla por prioridad y tiempo de cierre; volver al panel, resolver un pendiente y comprobar que las métricas cambian.
10. Abrir **Bloc** → dictar o escribir una nota offline → volver al panel y confirmar que la nota persistió.
11. Tocar el FAB del asistente → elegir **Bloc Offline** → **Convertir a pendientes** → el pendiente aparece en Entrega.
12. Tocar el botón **?** del header → abrir **Soporte Técnico**, expandir una FAQ y enviar un reporte de falla.
13. En el mismo panel, tocar **💬 Hablar con un asesor** → se abre el asistente con el mensaje de asesor y los 6 chips de soporte; tocar cualquiera y ver la respuesta local.
14. En el panel de **Salud**, abrir **Gestión de Encargado de Área** → *Asignación de personal*: registrar a alguien, moverlo de área con el modal y marcarlo como falta → luego *Tablero de turnos*: ver cobertura Matutino/Vespertino/Nocturno y la distribución por área.
15. Ver el reporte generado en **Historial** → buscar `PAC-1042`, `María` o `Urgencias`.
16. Volver a Sectores → el perfil activo aparece bajo el sector; probar con los otros 2 sectores y confirmar que cada uno muestra su alerta crítica y sus KPIs.

---

## 8. Riesgos y limitaciones conocidas

- **Web Speech API**: solo Chrome/Edge/Safari recientes; requiere micrófono y, en algunos casos, conexión para el reconocimiento. Si no está disponible, la app muestra aviso y permite escribir.
- **localStorage**: los datos se borran si el usuario limpia el sitio; no hay respaldo. Es aceptable para demo.
- **Perfil local**: nombre y área dan contexto, pero no autentican ni restringen acceso; cualquiera con el dispositivo puede cambiarlos.
- **Un solo dispositivo**: no hay sincronización entre turnos reales; en producción se necesitaría backend.
- **Datos simulados**: las cifras no son reales; el seed es solo para demostración.
- **Sin suite de tests en el repo**: la verificación E2E se ejecutó con scripts CDP externos (Edge headless); la lista de comprobación vive en AGENTS.md.

---

## 9. Pendientes / roadmap

- [x] Tests manuales de los flujos de los 3 sectores (verificados con CDP en 320/360/390/430/768/1440 px).
- [x] Identificación obligatoria por sector con nombre y área, persistida en `localStorage`.
- [ ] Revisión con lector de pantalla (contraste y foco base ya ajustados).
- [ ] Posible exportación del reporte (copiar al portapapeles ya disponible; PDF pendiente).
- [ ] Posible modo "nuevo turno" que reactive el ciclo tras el cierre.
- [ ] Posible sincronización ligera por archivo (importar/exportar JSON).
- [ ] Evaluar PWA (service worker) para instalar como app.

---

## 10. Bitácora de cambios

| Fecha | Cambio | Autor |
|---|---|---|
| 2026-11-10 | Creación del proyecto: venv, Flask, AGENTS.md, MEMORY.md, requirements.txt, run.ps1 | Equipo HandOff 360 |
| 2026-11-10 | Diseño del shell mobile-first y sistema de diseño verde/negro/blanco | Equipo HandOff 360 |
| 2026-11-10 | Núcleo JS: store localStorage, router, UI, seed de 3 sectores | Equipo HandOff 360 |
| 2026-11-10 | Vistas: selección, dashboard, entrega, historial | Equipo HandOff 360 |
| 2026-11-10 | Chatbot local con acciones + dictado por voz | Equipo HandOff 360 |
| 2026-11-10 | Fix: listeners de dashboard en el wrapper de vista y bandera `draftClosed` para evitar borradores resucitados tras cierre desde el asistente | Equipo HandOff 360 |
| 2026-11-10 | Fix: burbujas del chat sin whitespace extra y composer de pendientes en dos filas para mejor uso en móvil | Equipo HandOff 360 |
| 2026-11-10 | Verificación E2E: selección, dashboard, caso, entrega, cierre REP-112, historial, chatbot, cierre REP-113, 3 sectores, reset y responsive; 0 errores de consola | Equipo HandOff 360 |
| 2026-11-10 | Accesibilidad: `--muted`/`--muted-2` más oscuros, CTA/FAB/burbujas de usuario en verde-700/800, badges y checks ajustados; contraste verificado >=4.5:1 en textos clave | Equipo HandOff 360 |
| 2026-11-10 | Router: los sectores inválidos ahora normalizan el hash a `#/` (redirección real, no solo render de selección) | Equipo HandOff 360 |
| 2026-11-10 | Verificación final: modal de último cierre + Escape, prioridad/check/borrado de pendientes, fallback de dictado, filtros y deep link de historial, Escape en chat, chat y pendiente offline, reset; 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-11 | Nueva pantalla `acceso`: perfil local obligatorio por sector (nombre + área dinámica), persistencia, guard de rutas y perfil reflejado en header, dashboard, entrega, historial, cierre y chatbot | Equipo HandOff 360 |
| 2026-11-11 | Verificación del flujo de perfil: acceso, validación, persistencia tras recarga, deep link sin perfil, búsqueda por área, reporte con `closedByArea`, chat "mi perfil", responsive 320/430 y 0 eventos de consola; se agregó `mobile-web-app-capable` para eliminar el warning de PWA | Equipo HandOff 360 |
| 2026-11-11 | Modal crítico obligatorio al entrar al panel: alerta más urgente por sector, caso/ID, tiempo, estilo negro/verde/blanco, acuse local que se reinicia con cada identificación y descarte de toasts al abrir modales | Equipo HandOff 360 |
| 2026-11-11 | Verificación E2E de la alerta crítica: modal en los 3 sectores, título/caso/tiempo correctos, acuse persistido, cierre y navegación, no reapertura tras re-render, reapertura tras nueva identificación, responsive 320/430 y 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-11 | Resolución local de alertas: formulario en el detalle del caso con nota obligatoria, dictado por voz, acción primaria “Resolver y Cerrar Alerta”, persistencia de `case.resolution`, timeline/bitácora, eliminación de alertas activas y protección contra apilar modales críticos | Equipo HandOff 360 |
| 2026-11-11 | Verificación E2E de resolución: nota vacía bloqueada, PAC-1042/1088/1103 resueltos con contador en 0, sin modal crítico apilado, persistencia tras recarga, historial con resolución, formulario en 320 px, dictado simulado con Web Speech, smoke en logística/retail, 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-11 | Composer de pendientes con dictado por voz: micrófono junto al campo y al botón `+`, transcripción en tiempo real con límite de 160 caracteres, prioridad preservada, guardado en `localStorage`, exclusión mutua con el dictado del resumen y estilos verde/negro/blanco | Equipo HandOff 360 |
| 2026-11-11 | Verificación E2E del dictado de pendientes: transcripción parcial/final, estado `aria-pressed`/listening, prioridad alta persistida tras recarga, layout 320/430 sin overflow, objetivo táctil de 48 px y 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-12 | Módulo de KPIs: `core/metrics.js` con cálculos puros, pestaña `kpis` en la nav, vista con tasa de resolución, críticas atendidas, barras CSS por prioridad y tiempo de cierre; `resolveCaseAlert` registra `severity`/`responseMs` y `togglePending` registra `doneAt` | Equipo HandOff 360 |
| 2026-11-12 | Módulo de Soporte Técnico: modal `core/support.js` con 5 FAQ operativas, reporte de fallas persistido en `supportTickets` y contacto 24/7 simulado, con acceso directo en el header de cada sector | Equipo HandOff 360 |
| 2026-11-12 | Bloc Offline: pestaña `bloc`, notas persistidas en `notes[]` con escritura y dictado, borrado con confirmación y conversión a pendientes oficiales; el chatbot local lee y convierte notas desde el chat | Equipo HandOff 360 |
| 2026-11-12 | Header adaptativo con container queries: 5 pestañas sin truncar, indicador de turno colapsado a punto, FAB y toasts reposicionados para no tapar acciones; verificación E2E de KPIs/Soporte/Bloc en los 3 sectores con 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-12 | Soporte conectado al asistente: botón “💬 Hablar con un asesor”, correo simulado, `onTalkToAdvisor` por callback, `openAdvisorChat()` con mensaje de asesor y 6 chips de soporte que responden localmente y persisten tras recargar | Equipo HandOff 360 |
| 2026-11-12 | Fix móvil del chat: `core/viewport.js` publica `--vvh`/`--vv-top`/`--kb-inset`, el shell mide el viewport visible, sin autofocus en táctil, `min-height: 0` en la columna flexible del chat y fallback sin `requestAnimationFrame` en los modales; verificado con eventos táctiles reales a 320/390 px | Equipo HandOff 360 |
| 2026-11-12 | Gestión de Encargado de Área (Salud): `core/staff.js` con turnos/roles y cálculos puros, `staff[]` en el store, vistas `personal` y `horarios` accesibles desde el panel, cobertura por turno y distribución por área; verificado que el listener delegado va al `.view` interno para no duplicarse al re-render | Equipo HandOff 360 |
| 2026-11-12 | Fix móvil del soporte: `bindTap()` (pointerup + descarte del click) en el botón de Soporte, el de asesor y las acciones de los modales; el scrim del chat ignora los clics de los primeros 500 ms para que el gesto que abre el asistente no lo cierre; el `reveal()` del overlay respeta el flag `closed`; `--vvh` ignora alturas degeneradas; objetivo táctil de 44 px | Equipo HandOff 360 |
| 2026-11-12 | Soporte estático y chat nativo: el panel de Soporte pasa a HTML fijo en `index.html` con script inline (`window.HandOffSupport`) y `core/support.js` solo enlaza `support:advisor`/`support:report`/`support:opened`; el FAB del asistente usa `click` nativo en lugar de `bindTap`; verificado con toques reales en 320/390/430 px, 0 eventos de consola | Equipo HandOff 360 |
| 2026-11-12 | Compatibilidad con Render: `app.py` lee `PORT` dinámico y `HOST=0.0.0.0` por defecto, `FLASK_DEBUG` opt-in (el reloader de Werkzeug no es apto en producción), `Procfile` y `render.yaml` con health check `/health` | Equipo HandOff 360 |
