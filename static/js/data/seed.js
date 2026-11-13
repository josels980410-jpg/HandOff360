export const SECTOR_AREAS = {
  salud: ['Urgencias', 'Hospitalización', 'UCI', 'Quirófano', 'Consulta Externa'],
  logistica: ['Andenes', 'Patio', 'Bodega', 'Despachos', 'Transporte'],
  retail: ['Cajas', 'Inventarios', 'Piso de Ventas', 'Recepción', 'Almacén'],
};

export const SECTORS = [
  {
    id: 'salud',
    name: 'Salud / Hospitales',
    short: 'Salud',
    tagline: 'Censo de pacientes y camas',
    emoji: '🏥',
    accent: '#0e9f5b',
    accentSoft: '#d3f4e3',
    areas: SECTOR_AREAS.salud,
  },
  {
    id: 'logistica',
    name: 'Logística y Carga',
    short: 'Logística',
    tagline: 'Control de embarques y andenes',
    emoji: '📦',
    accent: '#0b7a46',
    accentSoft: '#a9e9c9',
    areas: SECTOR_AREAS.logistica,
  },
  {
    id: 'retail',
    name: 'Retail / Tiendas',
    short: 'Retail',
    tagline: 'Cortes de caja y reabastecimiento',
    emoji: '🛒',
    accent: '#12b76a',
    accentSoft: '#d3f4e3',
    areas: SECTOR_AREAS.retail,
  },
];

export const SECTOR_MAP = Object.fromEntries(SECTORS.map((sector) => [sector.id, sector]));
export const SECTOR_IDS = SECTORS.map((sector) => sector.id);

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function healthSeed() {
  return {
    meta: {
      short: 'Salud',
      area: 'Hospital San Rafael · Piso 4',
      emoji: '🏥',
      shiftLabel: 'Turno Mañana',
      shiftNumber: 12,
      supervisor: 'Dra. Elena Ríos',
      handoffLead: 'Dr. Marco Salas',
      areas: SECTOR_AREAS.salud,
      startedAt: hoursAgo(6),
      endsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    },
    profile: null,
    hero: {
      label: 'Ocupación de camas',
      value: 82,
      suffix: '%',
      sub: '41 de 50 camas ocupadas',
      goal: 75,
      icon: 'bed',
      footLeft: { label: 'Camas totales', value: '50' },
      footRight: { label: 'Meta de ocupación', value: '75%' },
    },
    kpis: [
      { id: 'camas', label: 'Camas disponibles', value: '9', hint: 'de 50 camas totales', icon: 'bed', tone: 'normal' },
      { id: 'espera', label: 'Pacientes en espera', value: '7', hint: '+2 vs. turno anterior', icon: 'clock', tone: 'warn' },
      { id: 'altas', label: 'Altas pendientes', value: '4', hint: '2 con receta lista', icon: 'checkCircle', tone: 'normal' },
      { id: 'uci', label: 'Camas UCI libres', value: '2', hint: 'de 8 camas UCI', icon: 'heart', tone: 'critical' },
    ],
    alerts: [
      {
        id: 'AL-01',
        severity: 'critical',
        title: 'Paciente en UCI requiere traslado',
        detail: 'PAC-1042 · María González · Saturación 88%',
        at: minutesAgo(18),
        caseId: 'PAC-1042',
      },
      {
        id: 'AL-02',
        severity: 'warn',
        title: 'Cama 212 sin aseo terminal',
        detail: 'Ingreso programado a las 13:30',
        at: minutesAgo(42),
        caseId: 'PAC-1088',
      },
      {
        id: 'AL-03',
        severity: 'info',
        title: 'Receta pendiente de firma',
        detail: 'PAC-1103 · Alta prevista a las 14:00',
        at: minutesAgo(64),
        caseId: 'PAC-1103',
      },
    ],
    pendings: [
      {
        id: 'pd-h1',
        text: 'Confirmar disponibilidad de cama para el ingreso de PAC-1088',
        priority: 'alta',
        done: false,
        createdAt: minutesAgo(30),
      },
      {
        id: 'pd-h2',
        text: 'Enviar censo actualizado a jefatura de enfermería',
        priority: 'media',
        done: false,
        createdAt: minutesAgo(55),
      },
    ],
    log: [
      { id: 'log-h1', type: 'alerta', text: 'Alerta crítica registrada en UCI', at: minutesAgo(18) },
      { id: 'log-h2', type: 'pendiente', text: 'Pendiente registrado: confirmar cama para PAC-1088', at: minutesAgo(30) },
      { id: 'log-h3', type: 'inicio', text: 'Turno Mañana iniciado · Dra. Elena Ríos', at: hoursAgo(6) },
    ],
    cases: [
      {
        id: 'PAC-1042',
        name: 'María González',
        age: 68,
        status: 'Observación UCI',
        statusTone: 'critical',
        location: 'Cama 214 · UCI',
        owner: 'Enf. Lucía Paz',
        detail:
          'Ingresó por dificultad respiratoria. Saturación 88% y requiere traslado a UCI central antes de las 14:00.',
        updatedAt: minutesAgo(18),
        timeline: [
          { time: '06:12', text: 'Ingreso a urgencias con dificultad respiratoria.' },
          { time: '07:40', text: 'Saturación 92% con oxígeno suplementario.' },
          { time: '09:15', text: 'Medicación ajustada por el médico de guardia.' },
          { time: '10:05', text: 'Saturación 88% · se solicita traslado a UCI central.' },
        ],
      },
      {
        id: 'PAC-1088',
        name: 'Carlos Ruiz',
        age: 54,
        status: 'Ingreso programado',
        statusTone: 'warn',
        location: 'Cama 212 · Piso 4',
        owner: 'Enf. Marco Salas',
        detail:
          'Programado para las 13:30. La cama 212 está en aseo terminal y se debe confirmar su liberación.',
        updatedAt: minutesAgo(42),
        timeline: [
          { time: '08:30', text: 'Ingreso aprobado por admisión.' },
          { time: '09:10', text: 'Cama 212 asignada.' },
          { time: '10:20', text: 'Aseo terminal en proceso.' },
        ],
      },
      {
        id: 'PAC-1103',
        name: 'Lucía Fernández',
        age: 37,
        status: 'Alta pendiente',
        statusTone: 'normal',
        location: 'Cama 208 · Piso 4',
        owner: 'Dra. Elena Ríos',
        detail: 'Evolución favorable. Falta firma de receta para alta a las 14:00.',
        updatedAt: minutesAgo(64),
        timeline: [
          { time: '07:20', text: 'Evolución favorable registrada.' },
          { time: '09:40', text: 'Alta médica programada para las 14:00.' },
          { time: '10:10', text: 'Receta pendiente de firma.' },
        ],
      },
      {
        id: 'PAC-1120',
        name: 'Jorge Medina',
        age: 71,
        status: 'Postoperatorio',
        statusTone: 'normal',
        location: 'Cama 219 · Piso 4',
        owner: 'Enf. Ana Torres',
        detail: 'Cirugía de rodilla sin complicaciones. Dolor controlado. Movilización programada.',
        updatedAt: hoursAgo(2),
        timeline: [
          { time: '05:50', text: 'Cirugía de rodilla culminada sin complicaciones.' },
          { time: '07:30', text: 'Traslado a piso con dolor controlado.' },
        ],
      },
      {
        id: 'PAC-1095',
        name: 'Ana Torres',
        age: 45,
        status: 'Alta completada',
        statusTone: 'done',
        location: 'Cama 205 · Piso 4',
        owner: 'Dra. Elena Ríos',
        detail: 'Alta médica entregada y cama liberada a las 11:20.',
        updatedAt: hoursAgo(3),
        timeline: [
          { time: '10:00', text: 'Alta médica firmada.' },
          { time: '11:20', text: 'Cama 205 liberada.' },
        ],
      },
      {
        id: 'PAC-1076',
        name: 'Pedro Salas',
        age: 63,
        status: 'En observación',
        statusTone: 'warn',
        location: 'Cama 210 · Piso 4',
        owner: 'Enf. Lucía Paz',
        detail: 'Control de signos cada 2 horas por presión inestable.',
        updatedAt: hoursAgo(4),
        timeline: [
          { time: '06:00', text: 'Presión inestable detectada en ronda.' },
          { time: '08:00', text: 'Control de signos cada 2 horas.' },
        ],
      },
    ],
    reports: [
      {
        id: 'REP-111',
        sectorId: 'salud',
        sectorName: 'Salud / Hospitales',
        shiftLabel: 'Turno Noche',
        shiftNumber: 11,
        supervisor: 'Dr. Marco Salas',
        area: 'Hospital San Rafael · Piso 4',
        summary:
          'Cierre de turno nocturno sin incidentes mayores. Se atendieron 3 ingresos y 2 altas. Quedaron 2 pendientes: traslado de PAC-1042 a UCI central y censo de camas para jefatura.',
        pendings: [
          { text: 'Traslado de PAC-1042 a UCI central', priority: 'alta', done: false },
          { text: 'Censo de camas para jefatura', priority: 'media', done: false },
        ],
        criticalAlerts: 1,
        totalAlerts: 3,
        kpis: [
          { label: 'Camas disponibles', value: '11' },
          { label: 'Pacientes en espera', value: '6' },
          { label: 'Altas pendientes', value: '3' },
          { label: 'Camas UCI libres', value: '2' },
        ],
        hero: { label: 'Ocupación de camas', value: 78, suffix: '%' },
        createdAt: hoursAgo(22),
        closedBy: 'Dr. Marco Salas',
      },
      {
        id: 'REP-110',
        sectorId: 'salud',
        sectorName: 'Salud / Hospitales',
        shiftLabel: 'Turno Tarde',
        shiftNumber: 10,
        supervisor: 'Dra. Elena Ríos',
        area: 'Hospital San Rafael · Piso 4',
        summary:
          'Turno tarde con alta demanda en urgencias. Se liberaron 6 camas y se programaron 4 cirugías para mañana. Pendiente: ajustar inventario de medicamento en UCI.',
        pendings: [{ text: 'Ajustar inventario de medicamento en UCI', priority: 'media', done: false }],
        criticalAlerts: 0,
        totalAlerts: 2,
        kpis: [
          { label: 'Camas disponibles', value: '10' },
          { label: 'Pacientes en espera', value: '5' },
          { label: 'Altas pendientes', value: '4' },
          { label: 'Camas UCI libres', value: '3' },
        ],
        hero: { label: 'Ocupación de camas', value: 80, suffix: '%' },
        createdAt: daysAgo(2),
        closedBy: 'Dra. Elena Ríos',
      },
    ],
    reportSeq: 112,
    draft: '',
    lastClose: { reportId: 'REP-111', createdAt: hoursAgo(22) },
    criticalAck: null,
    chat: [],
  };
}

function logisticsSeed() {
  return {
    meta: {
      short: 'Logística',
      area: 'Centro de Distribución Norte · Andén A',
      emoji: '📦',
      shiftLabel: 'Turno Tarde',
      shiftNumber: 7,
      supervisor: 'Luis Cárdenas',
      handoffLead: 'Sofía Ramírez',
      areas: SECTOR_AREAS.logistica,
      startedAt: hoursAgo(4),
      endsAt: new Date(Date.now() + 4 * 3600000).toISOString(),
    },
    profile: null,
    hero: {
      label: 'Ocupación de andenes',
      value: 62,
      suffix: '%',
      sub: '5 de 8 andenes en uso',
      goal: 80,
      icon: 'truck',
      footLeft: { label: 'Andenes totales', value: '8' },
      footRight: { label: 'Meta de ocupación', value: '80%' },
    },
    kpis: [
      { id: 'embarques', label: 'Embarques activos', value: '12', hint: '+3 vs. turno anterior', icon: 'box', tone: 'normal' },
      { id: 'ruta', label: 'Unidades en ruta', value: '9', hint: '3 con entrega hoy', icon: 'truck', tone: 'normal' },
      { id: 'retrasos', label: 'Embarques con retraso', value: '3', hint: '1 crítico en Ruta Sur', icon: 'clock', tone: 'critical' },
      { id: 'espera', label: 'Camiones en espera', value: '2', hint: 'asignación pendiente', icon: 'alert', tone: 'warn' },
    ],
    alerts: [
      {
        id: 'AL-01',
        severity: 'critical',
        title: 'EMB-2041 con retraso de 40 min',
        detail: 'Ruta Sur · Llegada estimada 16:10',
        at: minutesAgo(25),
        caseId: 'EMB-2041',
      },
      {
        id: 'AL-02',
        severity: 'warn',
        title: 'Andén 4 bloqueado por estiba',
        detail: 'Liberación estimada 15:45',
        at: minutesAgo(50),
        caseId: 'EMB-2050',
      },
      {
        id: 'AL-03',
        severity: 'info',
        title: 'Guía faltante para EMB-2063',
        detail: 'Transportista no ha confirmado documentación',
        at: minutesAgo(75),
        caseId: 'EMB-2063',
      },
    ],
    pendings: [
      {
        id: 'pd-l1',
        text: 'Reasignar andén 4 una vez que se libere',
        priority: 'alta',
        done: false,
        createdAt: minutesAgo(20),
      },
      {
        id: 'pd-l2',
        text: 'Confirmar guía de EMB-2063 con el transportista',
        priority: 'media',
        done: false,
        createdAt: minutesAgo(60),
      },
    ],
    log: [
      { id: 'log-l1', type: 'alerta', text: 'Retraso crítico registrado en EMB-2041', at: minutesAgo(25) },
      { id: 'log-l2', type: 'pendiente', text: 'Pendiente registrado: reasignar andén 4', at: minutesAgo(20) },
      { id: 'log-l3', type: 'inicio', text: 'Turno Tarde iniciado · Luis Cárdenas', at: hoursAgo(4) },
    ],
    cases: [
      {
        id: 'EMB-2041',
        name: 'Lote Café 250 kg',
        status: 'Retrasado',
        statusTone: 'critical',
        location: 'Ruta Sur · Km 42',
        owner: 'Transportista H. Molina',
        detail: 'Embarque con retraso de 40 min por tráfico. Entrega estimada 16:10.',
        updatedAt: minutesAgo(25),
        timeline: [
          { time: '12:10', text: 'Embarque salió del centro de distribución.' },
          { time: '14:30', text: 'Retraso detectado por tráfico en Ruta Sur.' },
          { time: '15:00', text: 'Cliente notificado de nueva hora estimada.' },
        ],
      },
      {
        id: 'EMB-2063',
        name: 'Insumos médicos',
        status: 'Guía faltante',
        statusTone: 'warn',
        location: 'Andén 2',
        owner: 'Almacén central',
        detail: 'Falta guía de remisión firmada. El transportista espera documentación.',
        updatedAt: minutesAgo(75),
        timeline: [
          { time: '11:00', text: 'Carga lista en andén 2.' },
          { time: '13:30', text: 'Transportista sin guía de remisión.' },
        ],
      },
      {
        id: 'EMB-2077',
        name: 'Electrónica 1.2 ton',
        status: 'En ruta',
        statusTone: 'normal',
        location: 'Carretera 57',
        owner: 'Fletes del Norte',
        detail: 'Embarque en camino, sin incidencias reportadas.',
        updatedAt: hoursAgo(1),
        timeline: [
          { time: '12:40', text: 'Embarque en ruta con documentación completa.' },
          { time: '14:15', text: 'Último punto de control sin novedades.' },
        ],
      },
      {
        id: 'EMB-2050',
        name: 'Palets de bebidas',
        status: 'Andén bloqueado',
        statusTone: 'warn',
        location: 'Andén 4',
        owner: 'Estiba Logística',
        detail: 'Estiba incompleta por falta de personal. Andén ocupado 2 h.',
        updatedAt: minutesAgo(50),
        timeline: [
          { time: '11:20', text: 'Descarga iniciada en andén 4.' },
          { time: '13:20', text: 'Estiba detenida por falta de personal.' },
        ],
      },
      {
        id: 'EMB-2019',
        name: 'Repuestos automotrices',
        status: 'Entregado',
        statusTone: 'done',
        location: 'Cliente final',
        owner: 'Ruta Express',
        detail: 'Entrega completada y firma de recepción obtenida.',
        updatedAt: hoursAgo(5),
        timeline: [
          { time: '09:00', text: 'Embarque entregado.' },
          { time: '09:25', text: 'Recepción firmada por el cliente.' },
        ],
      },
    ],
    reports: [
      {
        id: 'REP-042',
        sectorId: 'logistica',
        sectorName: 'Logística y Carga',
        shiftLabel: 'Turno Mañana',
        shiftNumber: 6,
        supervisor: 'Luis Cárdenas',
        area: 'Centro de Distribución Norte · Andén A',
        summary:
          'Turno mañana con 18 embarques despachados y 2 andenes liberados. Se mantuvo comunicación con 3 transportistas. Pendiente: revisar guía de EMB-2063.',
        pendings: [{ text: 'Revisar guía de EMB-2063 con almacén', priority: 'media', done: false }],
        criticalAlerts: 0,
        totalAlerts: 2,
        kpis: [
          { label: 'Embarques activos', value: '14' },
          { label: 'Unidades en ruta', value: '8' },
          { label: 'Embarques con retraso', value: '1' },
          { label: 'Camiones en espera', value: '3' },
        ],
        hero: { label: 'Ocupación de andenes', value: 70, suffix: '%' },
        createdAt: hoursAgo(8),
        closedBy: 'Luis Cárdenas',
      },
      {
        id: 'REP-041',
        sectorId: 'logistica',
        sectorName: 'Logística y Carga',
        shiftLabel: 'Turno Noche',
        shiftNumber: 5,
        supervisor: 'Sofía Ramírez',
        area: 'Centro de Distribución Norte · Andén A',
        summary:
          'Cierre nocturno sin incidencias. Se despacharon 15 embarques y se dejó el andén 1 disponible para la carga de las 06:00.',
        pendings: [],
        criticalAlerts: 0,
        totalAlerts: 1,
        kpis: [
          { label: 'Embarques activos', value: '10' },
          { label: 'Unidades en ruta', value: '6' },
          { label: 'Embarques con retraso', value: '0' },
          { label: 'Camiones en espera', value: '1' },
        ],
        hero: { label: 'Ocupación de andenes', value: 50, suffix: '%' },
        createdAt: daysAgo(1),
        closedBy: 'Sofía Ramírez',
      },
    ],
    reportSeq: 43,
    draft: '',
    lastClose: { reportId: 'REP-042', createdAt: hoursAgo(8) },
    criticalAck: null,
    chat: [],
  };
}

function retailSeed() {
  return {
    meta: {
      short: 'Retail',
      area: 'Sucursal Centro · Cajas 1-5',
      emoji: '🛒',
      shiftLabel: 'Turno Tarde',
      shiftNumber: 21,
      supervisor: 'Valeria Soto',
      handoffLead: 'Andrés Paredes',
      areas: SECTOR_AREAS.retail,
      startedAt: hoursAgo(3),
      endsAt: new Date(Date.now() + 5 * 3600000).toISOString(),
    },
    profile: null,
    hero: {
      label: 'Avance de meta de ventas',
      value: 78,
      suffix: '%',
      sub: '$48,250 de $62,000',
      goal: 100,
      icon: 'chart',
      footLeft: { label: 'Venta del turno', value: '$48,250' },
      footRight: { label: 'Meta del turno', value: '$62,000' },
    },
    kpis: [
      { id: 'ventas', label: 'Ventas del turno', value: '$48,250', hint: '+8% vs. turno anterior', icon: 'cart', tone: 'normal' },
      { id: 'ticket', label: 'Ticket promedio', value: '$312', hint: '155 transacciones', icon: 'note', tone: 'normal' },
      { id: 'cajas', label: 'Cajas abiertas', value: '3/5', hint: '2 cajas disponibles', icon: 'checkCircle', tone: 'normal' },
      { id: 'quiebres', label: 'Quiebres de stock', value: '6', hint: '2 urgentes en pasillo 3', icon: 'alert', tone: 'critical' },
    ],
    alerts: [
      {
        id: 'AL-01',
        severity: 'critical',
        title: 'Quiebre de stock: leche entera 1 L',
        detail: 'SKU-7781 · Reposición urgente antes de las 18:00',
        at: minutesAgo(30),
        caseId: 'SKU-7781',
      },
      {
        id: 'AL-02',
        severity: 'warn',
        title: 'Caja 4 sin vuelto suficiente',
        detail: 'Faltan $350 en denominaciones chicas',
        at: minutesAgo(55),
        caseId: 'CAJ-04',
      },
      {
        id: 'AL-03',
        severity: 'info',
        title: 'Corte de caja 3 con diferencia de $120',
        detail: 'TCK-8842 · Revisar comprobantes',
        at: minutesAgo(80),
        caseId: 'TCK-8842',
      },
    ],
    pendings: [
      {
        id: 'pd-r1',
        text: 'Solicitar reabastecimiento de lácteos',
        priority: 'alta',
        done: false,
        createdAt: minutesAgo(15),
      },
      {
        id: 'pd-r2',
        text: 'Cuadrar diferencia de caja 3 con supervisor',
        priority: 'media',
        done: false,
        createdAt: minutesAgo(45),
      },
      {
        id: 'pd-r3',
        text: 'Reabastecer bolsas en cajas 1 a 3',
        priority: 'baja',
        done: false,
        createdAt: minutesAgo(70),
      },
    ],
    log: [
      { id: 'log-r1', type: 'alerta', text: 'Quiebre de stock crítico en SKU-7781', at: minutesAgo(30) },
      { id: 'log-r2', type: 'pendiente', text: 'Pendiente registrado: reabastecimiento de lácteos', at: minutesAgo(15) },
      { id: 'log-r3', type: 'inicio', text: 'Turno Tarde iniciado · Valeria Soto', at: hoursAgo(3) },
    ],
    cases: [
      {
        id: 'SKU-7781',
        name: 'Leche entera 1 L',
        status: 'Quiebre de stock',
        statusTone: 'critical',
        location: 'Pasillo 3 · Góndola B',
        owner: 'Valeria Soto',
        detail: 'Sin existencias desde las 14:20. Reposición urgente antes de las 18:00.',
        updatedAt: minutesAgo(30),
        timeline: [
          { time: '13:00', text: 'Últimas 12 piezas en estantería.' },
          { time: '14:20', text: 'Quiebre de stock registrado.' },
          { time: '15:00', text: 'Solicitud de reabastecimiento enviada.' },
        ],
      },
      {
        id: 'SKU-7790',
        name: 'Pan integral 400 g',
        status: 'Reabastecido',
        statusTone: 'normal',
        location: 'Pasillo 2 · Góndola A',
        owner: 'Andrés Paredes',
        detail: 'Reabastecimiento completado. 40 piezas disponibles.',
        updatedAt: hoursAgo(1),
        timeline: [
          { time: '12:30', text: 'Reabastecimiento completado.' },
          { time: '12:35', text: '40 piezas disponibles.' },
        ],
      },
      {
        id: 'TCK-8842',
        name: 'Corte Caja 3',
        status: 'Con diferencia',
        statusTone: 'warn',
        location: 'Caja 3',
        owner: 'Cajera Paola Ruiz',
        detail: 'Diferencia de $120 en el corte. Se revisan comprobantes y tickets.',
        updatedAt: minutesAgo(80),
        timeline: [
          { time: '14:00', text: 'Corte de caja 3 realizado.' },
          { time: '14:05', text: 'Diferencia de $120 detectada.' },
        ],
      },
      {
        id: 'TCK-8839',
        name: 'Corte Caja 1',
        status: 'Cuadrado',
        statusTone: 'done',
        location: 'Caja 1',
        owner: 'Cajero Diego León',
        detail: 'Corte cuadrado sin observaciones.',
        updatedAt: hoursAgo(2),
        timeline: [
          { time: '12:00', text: 'Corte de caja 1 cuadrado.' },
        ],
      },
      {
        id: 'CAJ-04',
        name: 'Caja 4 · Vuelto',
        status: 'Vuelto bajo',
        statusTone: 'warn',
        location: 'Caja 4',
        owner: 'Cajera Mariana Cruz',
        detail: 'Faltan $350 en denominaciones chicas para el vuelto.',
        updatedAt: minutesAgo(55),
        timeline: [
          { time: '13:40', text: 'Vuelto bajo detectado en caja 4.' },
          { time: '14:10', text: 'Solicitud de denominaciones chicas.' },
        ],
      },
      {
        id: 'PRM-2207',
        name: 'Promoción 2x1 lácteos',
        status: 'Activa',
        statusTone: 'normal',
        location: 'Pasillo 3',
        owner: 'Mercadeo',
        detail: 'Promoción activa hasta el domingo. Afecta inventario de lácteos.',
        updatedAt: hoursAgo(6),
        timeline: [
          { time: '09:00', text: 'Promoción activada en cajas y pasillo.' },
        ],
      },
    ],
    reports: [
      {
        id: 'REP-023',
        sectorId: 'retail',
        sectorName: 'Retail / Tiendas',
        shiftLabel: 'Turno Mañana',
        shiftNumber: 20,
        supervisor: 'Valeria Soto',
        area: 'Sucursal Centro · Cajas 1-5',
        summary:
          'Turno mañana con ventas de $39,400 y 128 transacciones. Se reabastecieron 3 pasillos. Pendiente: revisar quiebre de SKU-7781 en el turno tarde.',
        pendings: [{ text: 'Revisar quiebre de SKU-7781', priority: 'alta', done: false }],
        criticalAlerts: 1,
        totalAlerts: 2,
        kpis: [
          { label: 'Ventas del turno', value: '$39,400' },
          { label: 'Ticket promedio', value: '$308' },
          { label: 'Cajas abiertas', value: '4/5' },
          { label: 'Quiebres de stock', value: '3' },
        ],
        hero: { label: 'Avance de meta de ventas', value: 64, suffix: '%' },
        createdAt: hoursAgo(9),
        closedBy: 'Valeria Soto',
      },
      {
        id: 'REP-022',
        sectorId: 'retail',
        sectorName: 'Retail / Tiendas',
        shiftLabel: 'Turno Tarde',
        shiftNumber: 19,
        supervisor: 'Andrés Paredes',
        area: 'Sucursal Centro · Cajas 1-5',
        summary:
          'Cierre de turno con $51,100 en ventas y 160 transacciones. Todas las cajas cuadradas. Pendiente: ajustar señalización de promoción 2x1.',
        pendings: [{ text: 'Ajustar señalización de promoción 2x1', priority: 'baja', done: false }],
        criticalAlerts: 0,
        totalAlerts: 1,
        kpis: [
          { label: 'Ventas del turno', value: '$51,100' },
          { label: 'Ticket promedio', value: '$319' },
          { label: 'Cajas abiertas', value: '5/5' },
          { label: 'Quiebres de stock', value: '2' },
        ],
        hero: { label: 'Avance de meta de ventas', value: 82, suffix: '%' },
        createdAt: daysAgo(1),
        closedBy: 'Andrés Paredes',
      },
    ],
    reportSeq: 24,
    draft: '',
    lastClose: { reportId: 'REP-023', createdAt: hoursAgo(9) },
    criticalAck: null,
    chat: [],
  };
}

export function createSectorSeed(id) {
  switch (id) {
    case 'salud':
      return healthSeed();
    case 'logistica':
      return logisticsSeed();
    case 'retail':
      return retailSeed();
    default:
      throw new Error(`Sector desconocido: ${id}`);
  }
}
