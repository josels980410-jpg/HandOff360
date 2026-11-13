# HandOff 360

**La continuidad operativa no se pierde cuando el turno cambia.**

HandOff 360 es una aplicación web móvil para la **continuidad operativa en cambios de turno**. El operador registra lo que hizo, deja pendientes y cierra su turno; esa información queda disponible para el siguiente turno y se puede consultar en cualquier momento desde el historial.

Diseñada para usarse con **una sola mano sobre una pantalla de celular**, en el punto de la operación: pasillos, andenes, cajas o salas de hospital. Funciona **sin internet** y sin cuentas: todo vive en el propio dispositivo.

---

## Los 3 sectores

| Sector | Enfoque | Ejemplos de casos |
|---|---|---|
| **Salud / Hospitales** | Censo de pacientes y camas | Pacientes en UCI, camas, recetas pendientes |
| **Logística y Carga** | Control de embarques y andenes | Embarques con retraso, guías faltantes, andenes bloqueados |
| **Retail / Tiendas** | Cortes de caja y reabastecimiento | Quiebres de stock, diferencias de caja, vuelto |

Cada sector tiene sus propias **áreas** operativas (Urgencias, Andenes, Cajas…) y su propio perfil de turno, de modo que una misma persona puede trabajar en dos sectores sin mezclar información.

---

## Características clave

### Modo 100% local (localStorage)
Todo el estado vive en el `localStorage` del navegador bajo la clave `handoff360:v1`. **No hay backend, ni base de datos, ni APIs externas, ni analítica de terceros.** No se pide cuenta ni contraseña: el operador se identifica con nombre y área antes de entrar a cada sector, y ese perfil es simplemente contexto para firmar el turno.

Consecuencia práctica: **la app funciona con el teléfono en modo avión** y los datos nunca salen del dispositivo.

### Dictado por voz (Web Speech API)
Los campos de texto aceptan dictado nativo del navegador mediante un botón de micrófono, en tres lugares: el **resumen del turno**, el **pendiente para el siguiente turno** y el **Bloc Offline**. La transcripción se refleja mientras hablas y siempre puedes escribir a mano si el navegador no soporta la API o si no hay permiso de micrófono.

### Alerta crítica obligatoria
Al identificarte en un sector, la app **fuerza** la revisión de la alerta más urgente antes de dejarte operar. Se muestra un modal oscuro con el detalle, el caso relacionado y el tiempo transcurrido. El acuse se guarda localmente y la alerta se vuelve a mostrar en cada nueva identificación.

Desde el detalle de un caso puedes **escribir o dictar la resolución**: al guardarla, la alerta activa se cierra, baja el contador del panel y el caso queda marcado como `Resuelto` con su nota en la línea de tiempo.

### Bloc Offline (modo sin datos)
Un bloc de notas para capturar información al instante —sin conexión, sin formularios y sin distracciones—. Notas de texto o dictadas, guardadas localmente, que puedes **convertir en pendientes oficiales** del turno con un toque, ya sea desde la vista o pidiéndole al asistente que lo haga.

### Módulo de KPIs y métricas operativas
Una pestaña propia con cuatro indicadores calculados en vivo desde el estado local:

1. **Tasa de resolución de turno** — porcentaje de elementos cerrados frente al total.
2. **Alertas críticas atendidas** — incidentes graves resueltos, sobre el total de críticas del turno.
3. **Distribución de pendientes por prioridad** — gráfica de barras CSS (Alta / Media / Baja).
4. **Tiempo promedio de cierre** — tiempo real cuando hay cierres registrados; estimación por antigüedad cuando aún no los hay.

Las métricas se recalculan solas al resolver una alerta, completar un pendiente o cerrar el turno.

### Soporte interactivo con chatbot local
Un modal de **Soporte Técnico** (FAQ operativas, reporte de fallas guardado localmente y contacto 24/7 simulado) conectado directamente con el asistente. El botón **“💬 Hablar con un asesor”** abre el chatbot con un mensaje de bienvenida y **6 opciones rápidas** —cierre de turno, dictado por voz, sincronización y `localStorage`, censo y áreas, cambio de perfil y asesoría— que responden con soluciones orientativas de la propia app, sin ninguna llamada a internet.

El asistente (chatbot local, sin API externa) también entiende lenguaje natural para dar resúmenes, listar pendientes y alertas, buscar casos, preparar y cerrar el turno, y convertir notas offline en pendientes.

---

## Cómo arrancarlo

### Opción 1 — Script de arranque (Windows)

```powershell
.\run.ps1
```

Crea el entorno virtual, instala dependencias y abre el navegador en `http://127.0.0.1:5000`.

### Opción 2 — Manual

**Requisito:** Python 3.9 o superior (probado con Python 3.14).

```bash
# 1. Crear el entorno virtual
python -m venv .venv

# 2. Activarlo
#    Windows PowerShell:
.\.venv\Scripts\Activate.ps1
#    macOS / Linux:
source .venv/bin/activate

# 3. Instalar dependencias (Flask es la única)
pip install -r requirements.txt

# 4. Arrancar
python app.py
```

La app queda en **http://127.0.0.1:5000**.

Comprobación de estado: `http://127.0.0.1:5000/health` → `{"status":"ok", ...}`

### Usarlo desde el celular

El servidor escucha solo en loopback por defecto. Para abrirlo desde un teléfono en la misma red WiFi:

```powershell
$env:HOST = "0.0.0.0"
python app.py
```

Luego abre en el navegador del teléfono `http://<IP-local-de-tu-PC>:5000`.

> Si la URL responde **“conexión rechazada”**, el servidor no está corriendo: relánzalo con `run.ps1` o con el comando manual.

---

## Cómo se usa

1. Elige sector → **Salud**, **Logística** o **Retail**.
2. Identifícate con tu nombre y tu área (obligatorio; se guarda por sector).
3. Revisa la **alerta crítica** que aparece automáticamente.
4. Registra pendientes, dicta el resumen y **cierra tu turno**.
5. Consulta el **historial** por ID, nombre o área.
6. Abre el **Bloc Offline** para capturar notas sin conexión, o el **soporte** cuando necesites ayuda.

---

## Estructura del proyecto

```
HandOff360/
├── app.py                  # Servidor local Flask (solo sirve el frontend)
├── requirements.txt        # Única dependencia: Flask
├── run.ps1                 # Arranque: venv + pip + app
├── AGENTS.md               # Constitución del proyecto (reglas y arquitectura)
├── MEMORY.md               # Memoria viva: decisiones, esquema y bitácora
├── .venv/                  # Entorno virtual (ignorado en git)
└── static/                 # Todo el frontend (sin build)
    ├── index.html          # Shell de la app
    ├── css/
    │   └── styles.css      # Design System completo
    └── js/
        ├── app.js          # Bootstrap, shell, router, ciclo de render
        ├── data/seed.js    # Datos simulados de los 3 sectores
        ├── core/           # store, router, metrics, ui, icons, details, support…
        ├── views/          # select, access, dashboard, kpis, handover, bloc, history
        └── features/       # chatbot (IA local) y voice (dictado)
```

**Tecnologías:** JavaScript con **ES Modules nativos** (sin frameworks, sin bundler, sin CDN) y CSS propio. Flask sirve los archivos estáticos y no contiene lógica de negocio. La única dependencia de Python es Flask.

**Diseño mobile-first:** contenedor de 460 px, navegación inferior de 5 pestañas, objetivos táctiles de al menos 44 px y paleta institucional estricta **verde / negro / blanco**.

---

## Documentación

- **[AGENTS.md](AGENTS.md)** — la constitución del proyecto: reglas de arquitectura, rutas, capas, paleta y checklist de verificación obligatoria.
- **[MEMORY.md](MEMORY.md)** — decisiones de diseño (D1–D20), esquema de `localStorage`, rutas de navegación, guía de demo y bitácora de cambios.

---

## Alcance y limitaciones

- El **perfil local** da contexto al turno, pero **no autentica**: no hay contraseñas, roles ni permisos. Cualquiera con el dispositivo puede cambiarlo.
- **No hay sincronización entre dispositivos.** Es una decisión consciente: la app es local y el traspaso entre turnos es físico y explícito.
- Los datos **se borran** si el usuario limpia los datos del sitio o usa otro navegador. No hay respaldo.
- El **dictado por voz** depende del navegador (Chrome, Edge y Safari recientes) y en algunos casos requiere conexión para transcribir.
- Los datos de los tres sectores son **simulados** y sirven solo para demostración.
