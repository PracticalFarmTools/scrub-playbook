import { forbiddenFields } from './validate';

/**
 * Pause, not a silent filter and not a promise of completeness.
 * Setup language such as "patient positioning" is allowed.
 * A patient name or number is not.
 */
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const NUMERIC_DATE = /\b\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})\b/;
const ISO_DATE = /\b(?:19|20)\d{2}-\d{1,2}-\d{1,2}\b/;
const MONTH_DAY_YEAR = new RegExp(`\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+(?:19|20)\\d{2}\\b`, 'i');
const DAY_MONTH_YEAR = new RegExp(`\\b\\d{1,2}\\s+${MONTH}\\s+(?:19|20)\\d{2}\\b`, 'i');
const BORN = /\bborn\b[^.\n]{0,24}?\b(?:19|20)\d{2}\b/i;
const PHONE = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/;
const ACCOUNT = /\b(?:acct|account|fin|csn|encounter|enc|visit|har)\b\.?\s*(?:#|no\.?|num|number)?[:\s#-]*\d{3,}/i;
const TITLED_NAME = /\b(?:Mr|Mrs|Ms|Miss|Mx)\.?\s+[A-Z][a-z'’-]+/;
const LAST_FIRST = /\b(?:[Pp]t|[Pp]atient|[Cc]ase for)\b:?\s+[A-Z][a-z'’-]+,\s*[A-Z][a-z'’-]+/;
const NAMED = /\b(?:[Pp]t|[Pp]atient)\s+(?:[Nn]amed|[Cc]alled)\s+[A-Z]/;
const SETUP_AFTER_AMOUNT = '(?:syringe|syringes|luer|needle|needles|spinal|angio|angiocath|catheter|cath|iv|bulb|cup|cups|basin|basins|bottle|bottles|bag|bags|tube|tubes|asepto|toomey|irrigation|bowl|bowls|gauge|ga)';
const IRRIGATION_BEFORE = '(?<!\\b(?:irrigation|irrigate|saline|water|ns|lr|pulse lavage|lavage)\\s+(?:of\\s+)?)';
const DOSE = new RegExp(`${IRRIGATION_BEFORE}\\b\\d+(?:[.,]\\d+)?(?:\\s?(?:mg|mcg|µg|ug|gm|grams?|ml|cc|units?|iu|meq)|\\s+g)\\b(?!\\s*${SETUP_AFTER_AMOUNT}\\b)`, 'i');
const SMALL_GRAMS = new RegExp(`\\b[1-9](?:\\.\\d+)?g\\b(?!\\s*${SETUP_AFTER_AMOUNT}\\b)`, 'i');

const RULES = [
  { id: 'ssn', label: 'a Social Security number', test: (t) => /\b\d{3}-\d{2}-\d{4}\b/.test(t) },
  { id: 'mrn', label: 'a medical record number', test: (t) => /\bmrn\b[:=\s#-]*\d+/i.test(t) },
  { id: 'dob', label: 'a date of birth', test: (t) => /\b(dob|d\.o\.b\.?|date of birth)(?![a-z])/i.test(t) || BORN.test(t) },
  { id: 'date', label: 'a full date', test: (t) => NUMERIC_DATE.test(t) || ISO_DATE.test(t) || MONTH_DAY_YEAR.test(t) || DAY_MONTH_YEAR.test(t) },
  { id: 'phone', label: 'a phone number', test: (t) => PHONE.test(t) },
  { id: 'account', label: 'an account or visit number', test: (t) => ACCOUNT.test(t) },
  { id: 'long-id', label: 'a long identifying number', test: (t) => /\b\d{7,}\b/.test(t) },
  { id: 'patient-name', label: 'a patient name', test: (t) => /\b(patient|pt)(['’]s)?\s+name\b/i.test(t) || LAST_FIRST.test(t) || NAMED.test(t) },
  { id: 'titled-name', label: 'a name with Mr., Mrs., or Ms.', test: (t) => TITLED_NAME.test(t) },
  { id: 'patient-number', label: 'a patient number', test: (t) => /\b(patient|pt)\s*(#|no\.?|number)\s*\d+/i.test(t) },
  { id: 'lot-serial', label: 'a lot or serial number', test: (t) => /\b(lot|serial)\b\s*(#|no\.?|number)?[:\s#-]*[a-z0-9-]*\d/i.test(t) },
  { id: 'dose', label: 'a medication dose or amount', test: (t) => DOSE.test(t) || SMALL_GRAMS.test(t) },
  { id: 'mrn-word', label: 'the word “MRN”', test: (t) => /\bmrn\b/i.test(t) },
];

/** Catalog numbers and product links often hold digit runs, dates, and sizes that are not about a patient. */
const CODE_SKIP = new Set(['long-id', 'date', 'phone', 'account', 'dose']);

export function findPhiSignals(text, { skip } = {}) {
  const value = text || '';
  if (!value.trim()) return [];
  const hits = [];
  for (const rule of RULES) {
    if (skip?.has(rule.id)) continue;
    if (rule.id === 'mrn-word' && hits.some(h => h.id === 'mrn')) continue;
    if (rule.id === 'date' && hits.some(h => h.id === 'ssn' || h.id === 'phone')) continue;
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
    ...(Array.isArray(procedure?.aliases) ? procedure.aliases : []),
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

/**
 * Every card in a set of surgeons that would pause. Used before a hand-off or a unit book leaves the phone.
 * `[{ surgeon, procedure, signals }]`, where `procedure` is null for a surgeon's own lines.
 */
export function findPhiInBook(book, surgeonIds) {
  const ids = surgeonIds ? new Set(surgeonIds) : null;
  const found = [];
  for (const surgeon of book?.surgeons || []) {
    if (surgeon.demo || (ids && !ids.has(surgeon.id))) continue;
    const own = findPhiInSurgeon(surgeon);
    if (own.length) found.push({ surgeon, procedure: null, signals: own });
    for (const procedure of book.procedures || []) {
      if (procedure.surgeonId !== surgeon.id || procedure.demo) continue;
      const signals = findPhiInProcedure(procedure);
      if (signals.length) found.push({ surgeon, procedure, signals });
    }
  }
  return found;
}

export function phiFoundText(found) {
  const first = found[0];
  if (!first) return '';
  const where = first.procedure ? `${first.surgeon.name} · ${first.procedure.name}` : `${first.surgeon.name} (first-case lines)`;
  const more = found.length > 1 ? ` and ${found.length - 1} more ${found.length === 2 ? 'card' : 'cards'}` : '';
  return `${where}${more} may include ${first.signals.map(signal => signal.label).join(', ')}. Take it out of the card, then try again.`;
}
