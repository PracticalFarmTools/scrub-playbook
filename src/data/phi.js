import { forbiddenFields } from './validate';

/**
 * Pause, not a silent filter and not a promise of completeness.
 * Setup language such as "patient positioning" is allowed.
 * A patient name or number is not.
 */
const RULES = [
  { id: 'ssn', label: 'a Social Security number', test: (t) => /\b\d{3}-\d{2}-\d{4}\b/.test(t) },
  { id: 'mrn', label: 'a medical record number', test: (t) => /\bmrn\b[:=\s#-]*\d+/i.test(t) },
  { id: 'dob', label: 'a date of birth', test: (t) => /\b(dob|date of birth)\b/i.test(t) },
  { id: 'long-id', label: 'a long identifying number', test: (t) => /\b\d{7,}\b/.test(t) },
  { id: 'patient-name', label: 'a patient name', test: (t) => /\b(patient|pt)(['’]s)?\s+name\b/i.test(t) },
  { id: 'patient-number', label: 'a patient number', test: (t) => /\b(patient|pt)\s*(#|no\.?|number)\s*\d+/i.test(t) },
  { id: 'lot-serial', label: 'a lot or serial number', test: (t) => /\b(lot|serial)\b\s*(#|no\.?|number)?[:\s#-]*[a-z0-9-]*\d/i.test(t) },
  { id: 'mrn-word', label: 'the word “MRN”', test: (t) => /\bmrn\b/i.test(t) },
];

/** Catalog numbers and product links often hold long digit runs that are not about a patient. */
const CODE_SKIP = new Set(['long-id']);

export function findPhiSignals(text, { skip } = {}) {
  const value = text || '';
  if (!value.trim()) return [];
  const hits = [];
  for (const rule of RULES) {
    if (skip?.has(rule.id)) continue;
    if (rule.id === 'mrn-word' && hits.some(h => h.id === 'mrn')) continue;
    if (rule.test(value)) hits.push({ id: rule.id, label: rule.label });
  }
  return hits;
}

function merge(...lists) {
  const seen = new Set();
  return lists.flat().filter(hit => {
    if (seen.has(hit.id)) return false;
    seen.add(hit.id);
    return true;
  });
}

function fieldSignals(record) {
  const fields = forbiddenFields(record);
  if (!fields.length) return [];
  return [{ id: 'field', label: `a field named ${fields.map(field => `“${field}”`).join(', ')}` }];
}

export function findPhiInProcedure(procedure) {
  const blocks = procedure?.blocks || {};
  const chunks = [
    procedure?.name,
    procedure?.approach,
    procedure?.reportNote,
    procedure?.official?.note,
    procedure?.official?.label,
    blocks.position?.text,
    blocks.prep?.text,
    blocks.drapes?.text,
    blocks.room?.text,
    blocks.equipment?.text,
    blocks.endOfCase?.text,
    blocks.note?.text,
    blocks.gloves?.outer?.model,
    blocks.gloves?.inner?.model,
    ...(blocks.steps || []).map(step => `${step.title || ''} ${step.ready || ''} ${step.habit || ''}`),
    ...(blocks.instruments || []).map(item => `${item.name || ''} ${item.from || ''}`),
    ...(blocks.trays || []).map(t => `${t.commonName || ''} ${t.spdName || ''} ${t.vendorName || ''}`),
    ...(blocks.sutures || []).map(s => [s.layer, s.name, s.size, s.needle, s.open, s.hold].filter(Boolean).join(' ')),
    ...(blocks.implants || []).map(t => t.systemName || ''),
    ...(blocks.people || []).map(p => `${p.name || ''} ${p.role || ''} ${p.gloveModel || ''}`),
    ...(blocks.nicknames || []).map(n => `${n.nickname || ''} ${n.actual || ''}`),
  ];
  const codes = [
    ...(blocks.sutures || []).flatMap(s => [s.catalogNumber, s.overrideUrl]),
    ...(blocks.implants || []).flatMap(t => [t.catalogNumber, t.overrideUrl]),
  ];
  return merge(
    findPhiSignals(chunks.filter(Boolean).join('\n')),
    findPhiSignals(codes.filter(Boolean).join('\n'), { skip: CODE_SKIP }),
    fieldSignals(procedure),
  );
}

export function findPhiInSurgeon(surgeon) {
  const chunks = [
    surgeon?.name,
    surgeon?.facility,
    ...(surgeon?.firstCase || []),
  ];
  return merge(findPhiSignals(chunks.filter(Boolean).join('\n')), fieldSignals(surgeon));
}
