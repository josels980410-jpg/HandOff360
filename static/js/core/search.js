import { normalizeText } from './utils.js';

function reportFields(report) {
  return [
    report.id,
    report.shiftLabel,
    report.shiftNumber,
    report.supervisor,
    report.closedBy,
    report.closedByArea,
    report.summary,
    report.area,
    report.hero?.label,
    ...(report.kpis || []).map((kpi) => `${kpi.label} ${kpi.value}`),
    ...(report.pendings || []).map((pending) => pending.text),
  ];
}

function caseFields(item) {
  return [
    item.id,
    item.name,
    item.status,
    item.detail,
    item.location,
    item.owner,
    ...(item.timeline || []).map((entry) => entry.text),
  ];
}

function matchesAny(fields, query) {
  return fields.some((field) => normalizeText(field).includes(query));
}

export function searchSector(sector, query) {
  const normalized = normalizeText(query);
  if (!normalized) {
    return { reports: sector.reports || [], cases: sector.cases || [] };
  }
  return {
    reports: (sector.reports || []).filter((report) =>
      matchesAny(reportFields(report), normalized)
    ),
    cases: (sector.cases || []).filter((item) =>
      matchesAny(caseFields(item), normalized)
    ),
  };
}
