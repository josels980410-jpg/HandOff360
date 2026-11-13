export const SHIFTS = [
  { id: 'matutino', label: 'Matutino', window: '07:00 – 15:00' },
  { id: 'vespertino', label: 'Vespertino', window: '15:00 – 23:00' },
  { id: 'nocturno', label: 'Nocturno', window: '23:00 – 07:00' },
];

export const SHIFT_IDS = SHIFTS.map((shift) => shift.id);

export const STAFF_ROLES = ['Enfermería', 'Medicina', 'Apoyo', 'Administrativo'];

export const SUPERVISOR_SECTORS = ['salud'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function supportsSupervisor(sectorId) {
  return SUPERVISOR_SECTORS.includes(sectorId);
}

export function getShift(id) {
  return SHIFTS.find((shift) => shift.id === id) || SHIFTS[0];
}

export function shiftLabel(id) {
  return getShift(id).label;
}

export function computeShiftSummary(staff, shiftId) {
  const roster = asArray(staff).filter((member) => member.shift === shiftId);
  const activeMembers = roster.filter((member) => member.active);
  const missingMembers = roster.filter((member) => !member.active);
  return {
    shiftId,
    total: roster.length,
    active: activeMembers.length,
    missing: missingMembers.length,
    coverage: roster.length ? Math.round((activeMembers.length / roster.length) * 100) : 0,
    roster,
    activeMembers,
    missingMembers,
  };
}

export function computeAreaDistribution(staff, shiftId = null) {
  const source = shiftId
    ? asArray(staff).filter((member) => member.shift === shiftId)
    : asArray(staff);
  const counts = new Map();
  source.forEach((member) => {
    const area = member.area || 'Sin área';
    counts.set(area, (counts.get(area) || 0) + 1);
  });
  const total = source.length;
  return [...counts.entries()]
    .map(([area, count]) => ({
      area,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'es'));
}

export function groupStaffByArea(staff, areas = []) {
  const source = asArray(staff);
  const groups = areas.map((area) => ({
    area,
    members: source.filter((member) => member.area === area),
  }));
  source.forEach((member) => {
    let group = groups.find((item) => item.area === member.area);
    if (!group) {
      group = { area: member.area || 'Sin área', members: [] };
      groups.push(group);
    }
    if (!group.members.includes(member)) group.members.push(member);
  });
  return groups;
}
