/**
 * Pause, not a silent filter and not a promise of completeness.
 * Strong patterns must be removed. The word "patient" also pauses
 * so a case story is not saved as a setup note.
 */
const RULES = [
  { id: 'ssn', label: 'a Social Security number', test: (t) => /\b\d{3}-\d{2}-\d{4}\b/.test(t) },
  { id: 'mrn', label: 'a medical record number', test: (t) => /\bmrn\b[:\s#-]*\d+/i.test(t) },
  { id: 'dob', label: 'a date of birth', test: (t) => /\b(dob|date of birth)\b/i.test(t) },
  { id: 'long-id', label: 'a long identifying number', test: (t) => /\b\d{7,}\b/.test(t) },
  { id: 'patient', label: 'the word “patient”', test: (t) => /\bpatients?\b/i.test(t) },
  { id: 'mrn-word', label: 'the word “MRN”', test: (t) => /\bmrn\b/i.test(t) },
];

export function findPhiSignals(text) {
  const value = text || '';
  if (!value.trim()) return [];
  const hits = [];
  for (const rule of RULES) {
    if (rule.id === 'mrn-word' && hits.some(h => h.id === 'mrn')) continue;
    if (rule.test(value)) hits.push({ id: rule.id, label: rule.label });
  }
  return hits;
}

export function findPhiInProcedure(procedure) {
  const blocks = procedure?.blocks || {};
  const chunks = [
    procedure?.name,
    procedure?.reportNote,
    procedure?.official?.note,
    procedure?.official?.label,
    blocks.room?.text,
    blocks.equipment?.text,
    blocks.endOfCase?.text,
    blocks.note?.text,
    ...(blocks.trays || []).map(t => `${t.commonName || ''} ${t.spdName || ''} ${t.vendorName || ''}`),
    ...(blocks.implants || []).map(t => t.systemName || ''),
    ...(blocks.people || []).map(p => p.name || ''),
    ...(blocks.nicknames || []).map(n => `${n.nickname || ''} ${n.actual || ''}`),
  ];
  return findPhiSignals(chunks.filter(Boolean).join('\n'));
}
