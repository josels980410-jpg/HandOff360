# AGENTS.md — Reglas de arquitectura y diseño · HandOff 360

Este archivo es la **constitución del proyecto**. Cualquier agente humano o de IA que trabaje en el repositorio debe seguirlo antes de escribir, refactorizar o proponer cambios.

---

## 1. Propósito del producto

**HandOff 360** es una aplicación web móvil ultraligera para la continuidad operativa en cambios de turno. El usuario registra lo que hizo, deja pendientes y cierra el turno; la información queda disponible para el siguiente turno y se puede consultar en el historial.

Pilares no negociables:

1. **Mobile-first**: se usa y se prueba pensando en una sola mano sobre una pantalla de celular.
2. **100% local**: los datos viven únicamente en `localStorage` del navegador. No hay APIs externas, no hay backend con base de datos, no hay analítica de terceros, no hay servicios de pago.
3. **Cero dependencias de frontend**: no se usan frameworks ni CDNs. Todo el JavaScript es nativo (ES Modules) y el CSS es propio.
4. **Perfil local de turno, sin autenticación**: el operador se identifica con nombre y área antes de entrar a cada sector. No hay login, contraseña, roles ni servidor de identidad; el perfil vive solo en `localStorage`.

---

## 2. Stack y estructura

```
HandOff360/
├── app.py                  # Servidor local Flask (solo sirve el frontend)
├── requirements.txt        # Única dependencia: Flask
├── run.ps1                 # Arranque: venv + pip + app
├── AGENTS.md               # Este archivo
├── MEMORY.md               # Memoria viva del proyecto
├── .venv/                  # Entorno virtual (ignorado en git)
└── static/                 # Todo el frontend (sin build)
    ├── index.html          # Shell de la app
    ├── css/
    │   └── styles.css      # Design System completo
    └── js/
        ├── app.js          # Bootstrap, shell, router, ciclo de render
        ├── data/
        │   └── seed.js     # Datos simulados de los 3 sectores
        ├── core/
        │   ├── store.js    # Estado + localStorage + acciones (CRUD)
        │   ├── router.js   # Rutas por hash (select/acceso/salud/logistica/retail + tabs)
        │   ├── search.js   # Búsqueda pura de reportes y casos por nombre o ID
        │   ├── metrics.js  # Cálculo puro de KPIs del sector (resolución, críticas, cierre)
        │   ├── viewport.js # Variables CSS del viewport visible y del teclado en pantalla
        │   ├── ui.js       # Toasts, modales, confirmaciones, utilidades DOM
        │   ├── icons.js    # Set de íconos SVG inline (sin librerías)
        │   ├── details.js  # Modales de detalle de reporte y caso
        │   ├── support.js  # Modal de Soporte Técnico: FAQ, reporte de fallas y contacto
        │   ├── critical.js # Alerta crítica obligatoria al entrar al panel
        │   └── utils.js    # Helpers: uid, escape, fechas, debounce
        ├── views/
        │   ├── select.view.js      # Pantalla de inicio / 3 sectores
        │   ├── access.view.js      # Identificación obligatoria de turno
        │   ├── dashboard.view.js   # Panel del turno
        │   ├── kpis.view.js        # KPIs y métricas operativas
        │   ├── handover.view.js    # Entrega de turno / cerrar turno
        │   ├── bloc.view.js        # Bloc Offline: notas rápidas sin internet
        │   └── history.view.js     # Historial y buscador
        └── features/
            ├── chatbot.js  # Asistente local con intenciones y acciones
            └── voice.js    # Dictado por voz (Web Speech API) con fallback
```

### Responsabilidades por capa

| Capa | Regla |
|---|---|
| `app.py` | Solo sirve archivos estáticos y `/health`. No contiene lógica de negocio. Debe respetar `PORT`/`HOST` de Render. |
| `data/seed.js` | Datos simulados de demostración. No puede importar nada del núcleo. |
| `core/store.js` | Único punto de acceso a `localStorage`. Toda mutación pasa por aquí, incluido el perfil local de turno. |
| `core/router.js` | Rutas por hash. Nunca recargar la página. |
| `core/search.js` | Funciones puras de búsqueda. No conoce el DOM ni el store. |
| `core/metrics.js` | Cálculo puro de los KPIs del sector a partir del estado. No muta nada ni conoce el DOM. |
| `core/viewport.js` | Publica `--vvh`, `--vv-top` y `--kb-inset` desde `visualViewport` para que el shell y el chat se ajusten al área realmente visible con el teclado abierto. |
| `core/ui.js` | Componentes transversales. No importa vistas ni store. |
| `core/details.js` | Abre modales de detalle de caso y reporte. El caso permite registrar una resolución local y eliminar la alerta activa asociada. |
| `core/support.js` | Modal de Soporte Técnico: FAQ operativas, reporte de fallas, contacto 24/7 simulado y botón de asesor. Recibe `onTalkToAdvisor` por callback; no importa vistas ni el chatbot. |
| `core/critical.js` | Selecciona la alerta más urgente y abre el modal crítico; registra el acuse local. No renderiza la vista ni apila modales. |
| `views/*` | Renderizan y manejan sus eventos. Pueden llamar al store y al router. |
| `views/access.view.js` | Captura nombre y área del operador; valida y llama a `setProfile`. No es autenticación. |
| `views/kpis.view.js` | Presenta los 4 KPIs calculados por `core/metrics.js`. No calcula métricas ni escribe en el store. |
| `views/bloc.view.js` | Bloc Offline: captura notas (texto o voz), las lista y permite convertirlas o borrarlas. |
| `features/chatbot.js` | Lógica de lenguaje natural local. Puede mutar el store y navegar. Expone `openAdvisorChat()` para la entrada de Soporte Técnico. |
| `features/voice.js` | Solo Web Speech API. No conoce el negocio. |

---

## 3. Reglas de arquitectura

### 3.1 Estado y persistencia

- La clave única de almacenamiento es **`handoff360:v1`**.
- El estado raíz es:

```json
{
  "version": 1,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "sectors": {
    "salud": {
      "meta": { "areas": ["Urgencias", "Hospitalización"] },
      "profile": { "name": "Elena Ríos", "area": "Urgencias", "startedAt": "...", "updatedAt": "..." },
      "hero": {},
      "kpis": [],
      "alerts": [],
      "pendings": [],
      "notes": [],
      "supportTickets": [],
      "log": [],
      "cases": [],
      "reports": [],
      "reportSeq": 112,
      "draft": "",
      "lastClose": null,
      "criticalAck": { "alertId": "AL-01", "at": "..." },
      "chat": []
    },
    "logistica": { "...": "..." },
    "retail": { "...": "..." }
  }
}
```

- **`store.js` es el único módulo que escribe en `localStorage`.** Si una vista necesita guardar, llama a una acción del store, nunca a `localStorage.setItem`.
- Toda mutación relevante debe llamar a `persist()` y emitir a los suscriptores para re-renderizar.
- Los campos `draft` y `chat` se guardan **sin emitir** (silent) para no perder foco ni re-renderizar en cada tecla.
- Cada sector tiene un `profile` independiente (`name`, `area`, `startedAt`, `updatedAt`) o `null` si aún no se identificó. Las áreas válidas viven en `meta.areas`.
- `setProfile(id, { name, area })` es la única vía para crear o cambiar el perfil; valida contra `meta.areas`, persiste, emite y reinicia `criticalAck` para que la alerta vuelva a mostrarse al entrar al panel.
- `ackCriticalAlert(id, alertId)` guarda `criticalAck` sin emitir para que el modal no se duplique durante un re-render.
- `resolveCaseAlert(id, caseId, note)` es la única vía para resolver un caso desde la alerta: valida la nota, guarda `case.resolution = { note, at, by, area, severity, responseMs }`, marca el caso como `Resuelto`, agrega la entrada a `timeline`, elimina de `sector.alerts` todas las alertas con ese `caseId`, registra la bitácora, persiste y emite. `severity` y `responseMs` alimentan los KPIs.
- `notes` es el Bloc Offline: `addNote(id, text)`, `deleteNote(id, noteId)` y `convertNotesToPendings(id, noteIds)` son las únicas vías. Una nota convertida queda marcada con `converted: true` y `convertedAt` para no duplicar pendientes.
- `convertNotesToPendings()` crea pendientes de prioridad `media` y registra una sola entrada de bitácora por conversión.
- `supportTickets` guarda los reportes de fallas enviados desde el modal de Soporte: `addSupportTicket(id, { category, message, contact })` es la única vía.
- La resolución es local: no modifica reportes históricos ni sincroniza con otros dispositivos.
- Al cargar datos antiguos, `initStore()` normaliza `meta.areas` y descarta perfiles con área inválida; no se cambia la versión de almacenamiento.
- Nunca se sincronizan datos entre navegadores ni dispositivos. Es una limitación consciente (demo local).

### 3.2 Flujo de datos (unidireccional)

```
Vista/evento → store.action() → state en memoria → localStorage → emit → app.render()
```

- No existe estado local por vista que no viva en `store.js`.
- Las vistas no se comunican entre sí: navegan o mutan el store.
- El chatbot es un "actor" más: escribe en el store y navega con el router.

### 3.3 Enrutamiento

- Rutas soportadas:
  - `#/` → selección de sector.
  - `#/s/<sectorId>/acceso` → identificación obligatoria de turno.
  - `#/s/<sectorId>/panel` → dashboard.
  - `#/s/<sectorId>/kpis` → KPIs y métricas operativas.
  - `#/s/<sectorId>/bloc` → Bloc Offline (notas rápidas sin internet).
  - `#/s/<sectorId>/turno` → entrega de turno.
  - `#/s/<sectorId>/historial` → historial (acepta `?q=<texto>&f=<todo|reportes|casos>`).
- `<sectorId>` ∈ `salud`, `logistica`, `retail`. Cualquier valor distinto redirige a `#/`.
- Al tocar un sector se navega siempre a `acceso`, incluso si ya existe un perfil (permite confirmarlo o cambiarlo).
- Si se intenta entrar a `panel`, `kpis`, `bloc`, `turno` o `historial` sin perfil activo, `app.js` redirige a `acceso`.
- El botón "Volver a Sectores" siempre navega a `#/`.
- El router nunca recarga la página.

### 3.4 Vistas y ciclo de render

- `app.js` monta el shell (header + nav + FAB) y la vista activa.
- En `acceso` se ocultan la nav inferior, el FAB y el chat; el header muestra el contexto del sector o el perfil activo.
- Cada vista expone `mount(root, ctx)` y puede devolver una función `cleanup`.
- `app.js` ejecuta el `cleanup` anterior antes de montar una vista nueva (para detener dictado, timers, etc.).
- Al mutar el store, `app.render({ preserveScroll })` vuelve a montar la vista actual.
- Al montar `panel` con perfil activo, `dashboard.view.js` llama a `maybeShowCriticalAlert()`: si la alerta urgente no coincide con `criticalAck`, registra el acuse y abre el modal oscuro. Se muestra una vez por identificación, no en cada re-render, y no se apila si ya hay un modal abierto.
- Las vistas deben ser resilientes: si falta un dato, muestran un estado vacío limpio, nunca rompen.
- En `handover`, el composer de pendientes incluye un micrófono junto al campo y al botón `+`: la transcripción se refleja mientras se dicta, se limita a 160 caracteres y al enviar se guarda con la prioridad elegida. Solo puede haber un dictado activo a la vez entre resumen y pendiente.
- La nav inferior tiene 5 pestañas: **Panel, KPIs, Entrega, Bloc, Historial**. El header de cada sector expone un acceso directo a **Soporte Técnico** y el indicador de turno se colapsa a punto cuando el ancho aprieta.
- `kpis.view.js` solo presenta: los valores salen de `computeSectorMetrics(sector)` y la vista no escribe en el store.
- `bloc.view.js` captura notas con texto o voz, las guarda vía `addNote` y permite convertirlas en pendientes o borrarlas con confirmación.
- El chatbot expone el Bloc Offline: la sugerencia “Bloc Offline” lista las notas y la acción “Convertir a pendientes” crea los pendientes oficiales.
- En pantallas táctiles el chat **no hace autofocus** al abrirse: el teclado en pantalla taparía el panel y dejaría los chips de soporte fuera de alcance. El foco se da solo cuando el operador toca el campo.
- El panel del chat y el shell se dimensionan con `--vvh` (viewport visible), no con `100dvh`, para que el teclado en pantalla no los empuje fuera de la pantalla.

### 3.5 Modales y toasts

- Toda acción destructiva o irreversible pasa por un `modal` de confirmación.
- Los mensajes de éxito/error usan `toast`.
- Los modales se cierran con: botón X, tap en el fondo, tecla `Escape` o botón de acción.
- Al abrir un modal se descartan los toasts pendientes para evitar que se superpongan.
- El modal crítico usa `variant="critical"`: fondo negro, texto blanco y detalles verde claro/brillante. Muestra título, detalle, `caseId`, tiempo transcurrido y un botón primario “Entendido, revisar caso”.
- La alerta mostrada es la más urgente de `sector.alerts` (crítica más reciente; fallback a la de mayor severidad disponible). Al cerrar, el dashboard y las pestañas quedan navegables.
- El detalle de caso (`core/details.js`) muestra una resolución interactiva si el caso no tiene `resolution`: textarea, dictado por voz y acción primaria “Resolver y Cerrar Alerta”. La nota es obligatoria; al guardar se cierra el modal y el dashboard se re-renderiza sin la alerta. Si el caso ya fue resuelto, muestra la nota y los metadatos de resolución.
- `modal()` acepta `onMount(overlay, close)` para conectar controles dentro del modal recién creado y `onClose` para liberar recursos transversales (por ejemplo, detener el dictado al cerrar con X, fondo o Escape).
- `modal()` revela el overlay con `requestAnimationFrame` **y** un `setTimeout` de respaldo: si el navegador throttlea la animación (pestaña en segundo plano, modo de bajo consumo), el modal debe quedar visible e interactible de todos modos.
- El modal de Soporte (`core/support.js`) muestra FAQ operativas en `<details>`, un formulario de reporte de fallas, el contacto 24/7 simulado (teléfono + correo) y un botón “💬 Hablar con un asesor”. El reporte se guarda con `addSupportTicket` y el modal se cierra al enviar.
- El botón de asesor cierra el modal e invoca `onTalkToAdvisor` (callback que `app.js` conecta con `openAdvisorChat`). `core/` nunca importa `features/`: la costura se hace por callback.
- `openAdvisorChat()` (en `features/chatbot.js`) abre el panel del asistente e inyecta un mensaje con `advisor: true` y los 6 `chips` de soporte. Si ya existe un mensaje de asesor, solo abre el panel sin duplicarlo.
- Los chips de soporte se renderizan como `.msg-chip` dentro del mensaje y responden con `handleSupportChip(id)`, que devuelve una solución orientativa local y, en el chip de asesor, reitera la asistencia en línea.

---

## 4. Diseño Mobile-First

### 4.1 Reglas de layout

- Ancho máximo del contenedor: **460 px** centrado. En desktop se ve como una "app" flotando sobre fondo oscuro.
- La app ocupa **100dvh**; el scroll ocurre dentro de `#view`.
- Header fijo arriba, bottom nav fijo abajo, FAB flotante sobre la nav.
- Respetar `env(safe-area-inset-bottom)` para iPhone.
- Nada puede hacer scroll horizontal.

### 4.2 Identidad visual (estricta)

| Rol | Token | Valor |
|---|---|---|
| Verde principal | `--green-500` | `#12B76A` |
| Verde oscuro / acento | `--green-700` | `#0B7A46` |
| Negro / fondo | `--black` | `#050807` |
| Tinta / fondos oscuros | `--ink` | `#08120D` |
| Blanco | `--white` | `#FFFFFF` |
| Fondo claro | `--paper` | `#F3F8F5` |
| Línea | `--line` | `#DCE8E1` |
| Texto secundario | `--muted` | `#56685F` |
| Texto terciario | `--muted-2` | `#5E7067` |

- **La paleta es verde + negro + blanco.** No se permiten rojos, azules, amarillos ni degradados con otros tonos.
- Las alertas críticas se distinguen con **fondo negro + texto verde claro**; las de advertencia con **fondo verde muy claro + borde verde**.
- El modal crítico de entrada usa fondo negro, texto blanco, borde/íconos/chips en verde y contraste mínimo 4.5:1.
- Un solo color de acento por sector (siempre dentro de la familia verde): `--accent` vía CSS variable.
- Las gráficas de datos usan solo la escala verde: `--green-700` para prioridad alta, `--green-500` para media y `--green-300` para baja.
- La tarjeta de KPIs usa fondo `--ink` con acentos verdes para el KPI principal y tarjetas blancas para los secundarios.

### 4.3 Tipografía y jerarquía

- Fuente del sistema (sin fuentes externas): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Escala: h1 30–34 px, h2 22 px, h3 17 px, cuerpo 15 px, pequeño 12.5 px.
- Títulos en 700/800, cuerpo en 400/500.
- `letter-spacing: -0.01em` en títulos grandes.

### 4.4 Componentes y objetivos táctiles

- Botones principales: **altura mínima 52 px**, radio 16 px, peso 700.
- Elementos interactivos: **mínimo 44×44 px**.
- Espaciado entre acciones: mínimo 8 px.
- Íconos: trazo 1.8, esquinas redondeadas, 24 px.
- Estados: `:hover`, `:active` (escala 0.98), `:focus-visible` con anillo verde.
- Las tarjetas tienen radio 20–28 px, borde de 1 px y sombra suave.

### 4.5 Accesibilidad

- Todo control tiene `aria-label` o texto visible.
- `aria-current="page"` en la pestaña activa de la nav.
- Modales con `role="dialog"`, `aria-modal="true"` y nombre accesible.
- Contraste mínimo 4.5:1 en texto.
- No usar solo color para transmitir estado: siempre hay texto/ícono.
- El shell usa `container-type: inline-size` para adaptar el header y la nav al ancho real de la app, no al del viewport.

---

## 5. Reglas de código

### 5.1 JavaScript

- ES Modules nativos (`type="module"`). Sin bundler, sin transpiler.
- Nombres en español para el dominio del negocio, en inglés para infraestructura (`store`, `router`, `mount`, `render`).
- Funciones puras para transformar datos (formateo, búsqueda, auto-resumen).
- No usar `innerHTML` con datos no validados: escapar con `escapeHtml` antes de insertar texto del usuario o del seed.
- No agregar comentarios excepto para lógica no obvia (el código debe autodocumentarse).
- No usar `any`, `var`, o APIs obsoletas.

### 5.2 CSS

- Mobile-first: estilos base para móvil, media queries solo para mejorar desktop.
- Usar variables de tema. No hardcodear colores.
- Nombres de clases BEM-lite: `.sector-btn`, `.sector-btn__icon`, `.sector-btn--active`.
- Sin `!important` salvo casos excepcionales documentados.

### 5.3 Backend

- `app.py` solo sirve estáticos. Si algún día se necesita lógica de backend, se agrega en módulos aparte (`server/`) y jamás dentro del HTML.
- `Cache-Control: no-store` para que el desarrollo y la demo nunca sirvan assets viejos.

---

## 6. Comandos

```powershell
# Primera vez / cada cambio de dependencias
.\run.ps1

# O manualmente
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py

# Para abrirla desde el teléfono en la misma red
$env:HOST = "0.0.0.0"
.\.venv\Scripts\python.exe app.py
```

- La app queda en `http://127.0.0.1:5000`.
- `app.py` lee `PORT` (por defecto `5000`), `HOST` (por defecto `0.0.0.0`) y `FLASK_DEBUG` (por defecto `0`) del entorno. Con `HOST=0.0.0.0` —el valor por defecto— escucha en todas las interfaces, requisito de Render.
- Para usarla como celular: abrir la URL desde el teléfono en la misma red cambiando `127.0.0.1` por la IP local (`http://<IP-local>:5000`), o usar las herramientas de dispositivo de Chrome/Firefox.
- Si la URL responde "conexión rechazada", el servidor no está corriendo: relanzarlo con `run.ps1` o con el comando manual de arriba.

### Verificación obligatoria antes de entregar

1. `python app.py` arranca sin errores.
2. `GET /health` responde `{"status":"ok"}`.
3. La consola del navegador no tiene errores ni advertencias de JavaScript.
4. Elegir un sector lleva a `acceso`; el nombre y el área son obligatorios y se guardan por sector.
5. Los 3 sectores cargan con sus KPIs, alertas y pendientes después de identificarse.
6. El nombre y el área aparecen en dashboard, entrega, historial, header y chatbot.
7. En Entrega, el micrófono del pendiente dicta y completa el campo; al agregar con `+` se guarda con la prioridad elegida y persiste tras recargar.
8. Cerrar turno genera un reporte con `closedBy`/`closedByArea` y vacía los pendientes.
9. El buscador encuentra por ID, nombre o área.
10. El chatbot responde y puede cerrar el turno.
11. Al identificarse y entrar al panel, aparece automáticamente el modal de alerta crítica del sector con caso/ID y tiempo; al cerrarlo se puede navegar y no reaparece hasta una nueva identificación.
12. Abrir una alerta con caso permite escribir o dictar una resolución; al guardarla, la alerta desaparece del dashboard, baja el contador, la nota persiste tras recargar y el caso queda como `Resuelto`.
13. La pestaña KPIs muestra los 4 indicadores y se recalcula al resolver una alerta o completar un pendiente (tasa, críticas atendidas, mezcla por prioridad y tiempo de cierre).
14. El botón de Soporte abre el modal con FAQ, reporte de fallas y contacto 24/7; el reporte enviado queda guardado en `localStorage`.
15. El botón “💬 Hablar con un asesor” abre el asistente con el mensaje de asesor y los 6 chips de soporte; cada chip responde con una solución local y el estado persiste tras recargar.
16. En móvil (puntero táctil) el chat se abre **sin teclado en pantalla**, los 6 chips quedan visibles y alcanzables con el dedo, y siguen siendo tocables con el teclado abierto tras hacer scroll.
17. El Bloc Offline permite escribir y dictar notas, listarlas y convertirlas en pendientes oficiales tanto desde la vista como desde el chatbot; las notas persisten tras recargar.
18. La app funciona sin conexión (todo está en `localStorage`).

---

## 7. Reglas para agregar un sector nuevo

1. Agregar el id en `SECTORS` (`data/seed.js`) con `emoji`, `name`, `tagline`, `accent` y `areas`.
2. Crear `createSectorSeed(id)` con `meta` (incluyendo `areas`), `profile: null`, `hero`, `kpis`, `alerts` con al menos una `severity: "critical"`, `pendings`, `cases`, `reports`, `reportSeq`, `log` y `criticalAck: null`.
3. No hace falta tocar las vistas: leen el sector activo y sus áreas desde el store.
4. Si el sector necesita lógica distinta, extender `details.js` o `chatbot.js` con rama por sector. No duplicar vistas.

## 8. Criterio de "terminado"

- Cumple los requisitos funcionales sin depender de servicios externos.
- Se ve y se siente como una app móvil real.
- Un juez puede: elegir sector → identificarse con nombre y área → ver el modal de alerta crítica → cerrar y navegar → ver panel → abrir una alerta → escribir/dictar la resolución y cerrarla → registrar pendiente → revisar KPIs → abrir Soporte → guardar una nota offline y convertirla en pendiente → cerrar turno → buscar un caso → chatear con el asistente, todo sin leer documentación.
- Código limpio, modular, sin dependencias innecesarias y sin assets pesados.
