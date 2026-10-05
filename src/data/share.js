import { QR_MAX_CHARS, emptyBlocks, uid } from './schema';
import { migrateBook, withoutConfirmation } from './migrate';
import { stripConfirmation } from './trust';
import { samePersonName, sameProcedureName } from './today';

export const SHARE_FENCE = '--- scrubplaybook ---';
const UNCONFIRMED_LINE = 'Arrives unconfirmed. Confirm after you are in the room.';

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

function sampleError(surgeon, procedure) {
  if (surgeon?.demo || procedure?.demo) return { error: 'Sample cards stay on this device.' };
  return null;
}

function pushSection(lines, title, bodyLines) {
  const kept = (bodyLines || []).map(line => (line || '').trim()).filter(Boolean);
  if (!kept.length) return;
  lines.push('', title, ...kept);
}

export function toGlanceText(surgeon, procedure) {
  const blocked = sampleError(surgeon, procedure);
  if (blocked) return blocked;
  const blocks = normalizeBlocks(procedure?.blocks);
  const lines = [];
  const who = [surgeon?.name, surgeon?.specialty].filter(Boolean).join(' · ');
  if (who) lines.push(who);
  if (surgeon?.facility?.trim()) lines.push(`Place: ${surgeon.facility.trim()}`);
  lines.push(`Procedure: ${procedure?.name || 'Untitled case'}`);
  if (procedure?.official?.label?.trim()) lines.push(`Official card: ${procedure.official.label.trim()}`);
  lines.push('', UNCONFIRMED_LINE);

  if (blocks.room.text?.trim()) pushSection(lines, 'Room start', [blocks.room.text]);
  if (blocks.equipment.text?.trim()) pushSection(lines, 'Equipment', [blocks.equipment.text]);

  const gloves = [];
  if (blocks.gloves.outer?.model) {
    gloves.push(`Outer: ${[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}`);
  }
  if (blocks.gloves.inner?.model) {
    gloves.push(`Inner: ${[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}`);
  }
  pushSection(lines, 'Gloves', gloves);

  pushSection(lines, 'Sutures', (blocks.sutures || []).map(suture => {
    const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
    const head = [layer, [suture.name, suture.size, suture.needle].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const tail = [];
    if (suture.open) tail.push(`open ${suture.open}`);
    if (suture.hold) tail.push(`hold ${suture.hold}`);
    if (suture.catalogNumber) tail.push(suture.catalogNumber);
    return [head, ...tail].filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Trays', (blocks.trays || []).map(tray => {
    const parts = [tray.commonName];
    if (tray.spdName) parts.push(`SPD: ${tray.spdName}`);
    if (tray.vendorName) parts.push(tray.vendorName);
    parts.push(tray.openOrHold === 'hold' ? 'Hold' : 'Open');
    return parts.filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Implants', (blocks.implants || []).map(implant => {
    const name = implant.systemName || 'Unnamed system';
    return implant.repExpected ? `${name} · Rep expected` : name;
  }));

  pushSection(lines, 'Nicknames', (blocks.nicknames || []).map(nick => `“${nick.nickname}” → ${nick.actual || ''}`));
  pushSection(lines, 'People', (blocks.people || []).map(person => [person.name, person.role].filter(Boolean).join(' · ')));

  if (blocks.endOfCase.text?.trim()) pushSection(lines, 'End of the case', [blocks.endOfCase.text]);
  if (blocks.note.text?.trim()) pushSection(lines, 'Note', [blocks.note.text]);

  return { text: lines.join('\n').trim() };
}

export function toShareableCard(surgeon, procedure) {
  const blocked = sampleError(surgeon, procedure);
  if (blocked) return blocked;
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

export function shareMessage(surgeon, procedure) {
  const card = toShareableCard(surgeon, procedure);
  if (card.error) return card;
  const glance = toGlanceText(surgeon, procedure);
  if (glance.error) return glance;
  return {
    glance: glance.text,
    payload: card.payload,
    payloadText: card.text,
    message: `${glance.text}\n\n${SHARE_FENCE}\n${card.text}`,
    showQr: card.showQr,
  };
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function extractPayload(raw) {
  const text = String(raw ?? '').trim();
  if (text.includes(SHARE_FENCE)) {
    let from = text.length;
    while (from > 0) {
      const idx = text.lastIndexOf(SHARE_FENCE, from - 1);
      if (idx < 0) break;
      const json = text.slice(idx + SHARE_FENCE.length).trim();
      try {
        return JSON.parse(json);
      } catch {
        from = idx;
      }
    }
    throw fail('bad-json');
  }
  if (text.startsWith('{')) {
    try {
      return JSON.parse(text);
    } catch {
      throw fail('bad-json');
    }
  }
  throw fail('no-card');
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
  const data = typeof raw === 'string' ? extractPayload(raw) : raw;
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

function blankOrEqual(a, b) {
  const left = (a || '').trim().toLowerCase();
  const right = (b || '').trim().toLowerCase();
  if (!left || !right) return true;
  return left === right;
}

export function classifyIncomingCard(book, surgeon, procedure) {
  const matches = (book?.surgeons || []).filter(existing => (
    !existing.demo
    && samePersonName(existing.name, surgeon?.name)
    && blankOrEqual(existing.specialty, surgeon?.specialty)
    && blankOrEqual(existing.facility, surgeon?.facility)
  ));
  if (matches.length === 0) return { kind: 'new' };
  if (matches.length > 1) return { kind: 'ambiguous', surgeons: matches };
  const found = matches[0];
  const existing = (book.procedures || []).find(item => (
    item.surgeonId === found.id
    && !item.demo
    && sameProcedureName(item.name, procedure?.name)
  ));
  if (existing) return { kind: 'duplicate', surgeon: found, procedure: existing };
  return { kind: 'attach', surgeon: found };
}

export function placeIncomingCard(book, incomingBook, { surgeonId } = {}) {
  if (!surgeonId) return { kind: 'new', ...mergeBackup(book, incomingBook) };
  const procedure = incomingBook?.procedures?.[0];
  if (!procedure || !book.surgeons.some(surgeon => surgeon.id === surgeonId)) {
    return { kind: 'new', ...mergeBackup(book, incomingBook) };
  }
  const now = new Date().toISOString();
  const placed = stripConfirmation({
    ...procedure,
    id: uid(),
    surgeonId,
    demo: false,
    updatedAt: now,
    baseUpdatedAt: now,
    blocks: normalizeBlocks(procedure.blocks),
  });
  return {
    kind: 'attach',
    book: { version: 1, surgeons: book.surgeons, procedures: [...book.procedures, placed] },
    imported: 1,
    skipped: 0,
  };
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
