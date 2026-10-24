function blobProcedure(procedure) {
  const b = procedure.blocks || {};
  return [
    procedure.name,
    procedure.approach,
    ...(Array.isArray(procedure.aliases) ? procedure.aliases : []),
    b.position?.text,
    b.prep?.text,
    b.drapes?.text,
    ...(b.steps || []).flatMap(step => [step.title, step.ready, step.habit]),
    ...(b.instruments || []).flatMap(item => [item.name, item.from]),
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
  const surgeons = (book?.surgeons || []).filter(s => !s.archived && (!facility || s.facility === facility));
  const allowed = new Set(surgeons.map(s => s.id));
  const procedures = (book?.procedures || []).filter(p => allowed.has(p.surgeonId));
  const q = (query || '').trim().toLowerCase();
  if (!q) return { surgeons, procedures };

  const surgeonHits = new Set(surgeons.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.specialty || '').toLowerCase().includes(q) ||
    (s.facility || '').toLowerCase().includes(q) ||
    (s.firstCase || []).join(' ').toLowerCase().includes(q)
  ).map(s => s.id));

  const procedureHits = procedures.filter(p => surgeonHits.has(p.surgeonId) || blobProcedure(p).includes(q));
  const visibleSurgeonIds = new Set([...surgeonHits, ...procedureHits.map(p => p.surgeonId)]);
  return {
    surgeons: surgeons.filter(s => visibleSurgeonIds.has(s.id)),
    procedures: procedureHits,
  };
}

export const SORT_CHOICES = [
  ['attention', 'Needs attention first'],
  ['name', 'Name A to Z'],
  ['recent', 'Recently changed'],
];

const ATTENTION = { disputed: 0, unconfirmed: 1, noted: 1, stale: 2, confirmed: 3 };

function lastName(name) {
  const words = String(name || '').toLowerCase().replace(/^dr\.?\s+/, '').split(/[\s,]+/).filter(Boolean);
  const comma = String(name || '').includes(',');
  return (comma ? words[0] : words.at(-1)) || '';
}

/**
 * Surgeons in the chosen order. `rowStatus(surgeon)` gives the row's trust status for
 * 'attention'; samples always go last.
 */
/**
 * @param {Array<object>} surgeons
 * @param {Array<object>} procedures
 * @param {string} [mode]
 * @param {(surgeon: object) => string | null | undefined} [rowStatus]
 */
export function sortSurgeons(surgeons, procedures, mode = 'attention', rowStatus = () => null) {
  const latest = new Map();
  for (const procedure of procedures || []) {
    const at = procedure.updatedAt || '';
    if (at > (latest.get(procedure.surgeonId) || '')) latest.set(procedure.surgeonId, at);
  }
  const byName = (a, b) => lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name);
  const ranked = (surgeons || []).map(surgeon => ({
    surgeon,
    demo: surgeon.demo ? 1 : 0,
    attention: ATTENTION[rowStatus(surgeon)] ?? 4,
    at: latest.get(surgeon.id) || surgeon.firstCaseAt || surgeon.createdAt || '',
  }));
  ranked.sort((a, b) => {
    if (a.demo !== b.demo) return a.demo - b.demo;
    if (mode === 'attention' && a.attention !== b.attention) return a.attention - b.attention;
    if (mode === 'recent' && a.at !== b.at) return a.at < b.at ? 1 : -1;
    return byName(a.surgeon, b.surgeon);
  });
  return ranked.map(entry => entry.surgeon);
}

export function facilityLabels(book) {
  return [...new Set((book?.surgeons || []).filter(s => !s.archived).map(s => s.facility).filter(Boolean))].sort();
}
