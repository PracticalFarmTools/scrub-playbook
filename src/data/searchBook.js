function blobProcedure(procedure) {
  const b = procedure.blocks || {};
  return [
    procedure.name,
    b.room?.text,
    b.equipment?.text,
    b.endOfCase?.text,
    b.note?.text,
    ...(b.sutures || []).flatMap(s => [s.name, s.size, s.needle, s.layer, s.catalogNumber]),
    ...(b.trays || []).flatMap(t => [t.commonName, t.spdName, t.vendorName]),
    ...(b.implants || []).map(t => t.systemName),
    ...(b.nicknames || []).flatMap(n => [n.nickname, n.actual]),
    ...(b.people || []).flatMap(p => [p.name, p.role, p.gloveModel]),
    b.gloves?.outer?.model,
    b.gloves?.inner?.model,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function filterBook(book, query, facility = null) {
  const surgeons = (book?.surgeons || []).filter(s => !facility || s.facility === facility);
  const allowed = new Set(surgeons.map(s => s.id));
  const procedures = (book?.procedures || []).filter(p => allowed.has(p.surgeonId));
  const q = (query || '').trim().toLowerCase();
  if (!q) return { surgeons, procedures };

  const surgeonHits = new Set(surgeons.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.specialty || '').toLowerCase().includes(q) ||
    (s.facility || '').toLowerCase().includes(q)
  ).map(s => s.id));

  const procedureHits = procedures.filter(p => surgeonHits.has(p.surgeonId) || blobProcedure(p).includes(q));
  const visibleSurgeonIds = new Set(procedureHits.map(p => p.surgeonId));
  return {
    surgeons: surgeons.filter(s => visibleSurgeonIds.has(s.id)),
    procedures: procedureHits,
  };
}

export function facilityLabels(book) {
  return [...new Set((book?.surgeons || []).map(s => s.facility).filter(Boolean))].sort();
}
