import { QR_MAX_CHARS, emptyBlocks, uid } from './schema';
import { migrateBook, withoutConfirmation } from './migrate';
import { stripConfirmation } from './trust';

export function qrFits(text) {
  return typeof text === 'string' && text.length > 0 && text.length <= QR_MAX_CHARS;
}

function prune(value) {
  if (Array.isArray(value)) {
    const next = value.map(prune).filter(item => item !== undefined);
    return next.length ? next : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      if (raw === '' || raw === null || raw === undefined || raw === false) continue;
      if (key === 'source' && raw === 'observed') continue;
      const next = prune(raw);
      if (next !== undefined) out[key] = next;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

export function normalizeBlocks(blocks = {}) {
  const base = emptyBlocks();
  return {
    ...base,
    ...blocks,
    room: { ...base.room, ...(blocks.room || {}) },
    equipment: { ...base.equipment, ...(blocks.equipment || {}) },
    endOfCase: { ...base.endOfCase, ...(blocks.endOfCase || {}) },
    note: { ...base.note, ...(blocks.note || {}) },
    gloves: { outer: null, inner: null, ...(blocks.gloves || {}) },
    trays: blocks.trays || [],
    implants: blocks.implants || [],
    sutures: blocks.sutures || [],
    nicknames: blocks.nicknames || [],
    people: blocks.people || [],
  };
}

function slimProcedure(procedure) {
  const stripped = stripConfirmation(procedure);
  return prune({
    name: stripped.name,
    blocks: stripped.blocks,
    official: stripped.official?.label
      ? { label: stripped.official.label, note: stripped.official.note || '' }
      : undefined,
  }) || { name: stripped.name || 'Untitled case' };
}

export function toShareableCard(surgeon, procedure) {
  if (surgeon?.demo || procedure?.demo) {
    return { error: 'Sample cards stay on this device.' };
  }
  const payload = {
    kind: 'scrubplaybook-card',
    v: 2,
    surgeon: {
      name: surgeon.name,
      specialty: surgeon.specialty,
      facility: surgeon.facility || '',
    },
    procedure: slimProcedure(procedure),
  };
  const text = JSON.stringify(payload);
  return { payload, text, showQr: qrFits(text) };
}

export function toBackup(book) {
  const surgeons = book.surgeons.filter(s => !s.demo);
  const ids = new Set(surgeons.map(s => s.id));
  return {
    kind: 'scrubplaybook-backup',
    v: 2,
    exportedAt: new Date().toISOString(),
    book: {
      version: 1,
      surgeons,
      procedures: book.procedures.filter(p => ids.has(p.surgeonId) && !p.demo),
    },
  };
}

function cardToBook(data) {
  if (data.v === 2 && data.surgeon && data.procedure) {
    const surgeonId = uid();
    const procedure = stripConfirmation({
      ...data.procedure,
      id: uid(),
      surgeonId,
      demo: false,
      confirmations: [],
      lastConfirmedAt: null,
      updatedAt: new Date().toISOString(),
      baseUpdatedAt: new Date().toISOString(),
      official: {
        label: data.procedure.official?.label || '',
        reviewedAt: null,
        note: data.procedure.official?.note || '',
      },
      blocks: normalizeBlocks(data.procedure.blocks),
    });
    return {
      version: 1,
      surgeons: [{
        id: surgeonId,
        name: data.surgeon.name,
        specialty: data.surgeon.specialty || 'Other',
        facility: data.surgeon.facility || '',
        demo: false,
        createdAt: new Date().toISOString(),
        addedBy: 'Imported',
      }],
      procedures: [procedure],
    };
  }
  const legacy = { ...data };
  delete legacy.kind;
  delete legacy.v;
  delete legacy.status;
  delete legacy.confirmedBy;
  delete legacy.confirmedAt;
  delete legacy.lastVerifiedBy;
  delete legacy.lastVerifiedAt;
  legacy.id = uid();
  legacy.addedBy = 'Imported';
  return withoutConfirmation(migrateBook([legacy]));
}

export function parseImport(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') throw new Error('empty');
  if (data.kind === 'scrubplaybook-backup') {
    if (data.v === 2 && data.book) return { type: 'backup', book: withoutConfirmation(migrateBook(data.book)) };
    if (Array.isArray(data.surgeons)) return { type: 'backup', book: withoutConfirmation(migrateBook(data.surgeons)) };
    throw new Error('backup');
  }
  if (data.kind === 'scrubplaybook-card' && (data.name || data.surgeon)) {
    return { type: 'card', book: cardToBook(data) };
  }
  throw new Error('unrecognized');
}

export function mergeBackup(current, incoming) {
  const surgeons = [...current.surgeons];
  const procedures = [...current.procedures];
  const surgeonIds = new Set(surgeons.map(s => s.id));
  const procedureIds = new Set(procedures.map(p => p.id));
  let imported = 0;
  let skipped = 0;
  for (const surgeon of incoming.surgeons || []) {
    if (surgeon.demo) { skipped += 1; continue; }
    if (surgeonIds.has(surgeon.id)) { skipped += 1; continue; }
    surgeons.push(surgeon);
    surgeonIds.add(surgeon.id);
  }
  for (const procedure of incoming.procedures || []) {
    if (procedure.demo) { skipped += 1; continue; }
    if (procedureIds.has(procedure.id)) { skipped += 1; continue; }
    if (!surgeonIds.has(procedure.surgeonId)) { skipped += 1; continue; }
    procedures.push(stripConfirmation(procedure));
    procedureIds.add(procedure.id);
  }
  return { book: { version: 1, surgeons, procedures }, imported, skipped };
}
