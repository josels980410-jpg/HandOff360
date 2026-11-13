export const PRIORITIES = ['alta', 'media', 'baja'];

const PRIORITY_LABELS = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveSamples(cases, pendings) {
  const samples = [];

  cases.forEach((item) => {
    if (!item?.resolution) return;
    const responseMs = item.resolution.responseMs;
    if (responseMs != null && Number.isFinite(Number(responseMs)) && Number(responseMs) >= 0) {
      samples.push(Number(responseMs));
    }
  });

  pendings.forEach((pending) => {
    if (!pending?.done) return;
    const start = asTime(pending.createdAt);
    const end = asTime(pending.doneAt);
    if (start != null && end != null && end >= start) {
      samples.push(end - start);
    }
  });

  return samples;
}

export function computeSectorMetrics(sector, { now = Date.now() } = {}) {
  const alerts = asArray(sector?.alerts);
  const pendings = asArray(sector?.pendings);
  const cases = asArray(sector?.cases);

  const resolvedCases = cases.filter(
    (item) => item?.resolution && String(item.resolution.note || '').trim()
  );
  const donePendings = pendings.filter((pending) => pending?.done);
  const activePendings = pendings.filter((pending) => !pending?.done);

  const closed = resolvedCases.length + donePendings.length;
  const total = pendings.length + alerts.length + resolvedCases.length;
  const rate = percentage(closed, total);

  const openCritical = alerts.filter((alert) => alert?.severity === 'critical').length;
  const resolvedCritical = resolvedCases.filter(
    (item) => item.resolution?.severity === 'critical'
  ).length;
  const totalCritical = openCritical + resolvedCritical;

  const mix = PRIORITIES.map((priority) => {
    const count = activePendings.filter((pending) => pending?.priority === priority).length;
    return {
      key: priority,
      label: PRIORITY_LABELS[priority],
      count,
      percent: percentage(count, activePendings.length),
    };
  });

  const samples = resolveSamples(resolvedCases, donePendings);
  const actualAverage = average(samples);
  const pendingAges = [
    ...alerts.map((alert) => now - (asTime(alert.at) ?? now)),
    ...activePendings.map((pending) => now - (asTime(pending.createdAt) ?? now)),
  ].filter((value) => Number.isFinite(value) && value >= 0);
  const waitingAverage = average(pendingAges);
  const estimatedMinutes = Math.max(
    5,
    Math.min(180, Math.round((waitingAverage ?? 5) / 60000))
  );
  const averageMs = actualAverage != null ? actualAverage : estimatedMinutes * 60000;

  return {
    generatedAt: new Date(now).toISOString(),
    resolution: {
      rate,
      closed,
      open: total - closed,
      total,
    },
    critical: {
      resolved: resolvedCritical,
      open: openCritical,
      total: totalCritical,
    },
    pendingMix: {
      total: activePendings.length,
      items: mix,
      done: donePendings.length,
    },
    response: {
      minutes: Math.max(0, Math.round(averageMs / 60000)),
      estimated: actualAverage == null,
      samples: samples.length,
    },
  };
}
