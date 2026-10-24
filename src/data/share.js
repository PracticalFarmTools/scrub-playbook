import { BOOK_VERSION, QR_MAX_CHARS, cleanFirstCase, normalizeBlocks, uid } from './schema';

export { normalizeBlocks };
import { migrateBook, withoutConfirmation } from './migrate';
import { stripConfirmation } from './trust';
import { samePersonName, sameProcedureName } from './today';
import { inPlaceGroup } from './places';
import { cleanAliases } from './boardMatch';

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

function slimProcedure(procedure) {
  const stripped = stripConfirmation(procedure);
  return prune({
    name: stripped.name,
    approach: stripped.approach,
    aliases: cleanAliases(stripped.aliases),
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

export function instrumentLines(blocks) {
  const items = (blocks?.instruments || []).filter(item => item?.name?.trim());
  const nickOf = (name) => (blocks.nicknames || []).find(nick => (nick.actual || '').trim().toLowerCase() === name.trim().toLowerCase());
  const withNick = (item) => {
    const nick = nickOf(item.name);
    return nick ? `${item.name.trim()} “${nick.nickname}”` : item.name.trim();
  };
  return {
    mayo: items.filter(item => item.mayo).map(withNick),
    rest: items.filter(item => !item.mayo).map(item => (
      item.from?.trim() ? `${withNick(item)} (from ${item.from.trim()})` : withNick(item)
    )),
  };
}

function pushSection(lines, title, bodyLines) {
  const kept = (bodyLines || []).map(line => (line || '').trim()).filter(Boolean);
  if (!kept.length) return;
  lines.push('', title, ...kept);
}

function surgeonTitle(name) {
  return (name || '').trim() || 'this surgeon';
}

export function toGlanceText(surgeon, procedure) {
  const blocked = sampleError(surgeon, procedure);
  if (blocked) return blocked;
  const blocks = normalizeBlocks(procedure?.blocks);
  const lines = [];
  const who = [surgeon?.name, surgeon?.specialty].filter(Boolean).join(' · ');
  if (who) lines.push(who);
  if (surgeon?.facility?.trim()) lines.push(`Place: ${surgeon.facility.trim()}`);
  const procedureTitle = [procedure?.name || 'Untitled case', procedure?.approach].filter(part => part && String(part).trim()).join(' · ');
  lines.push(`Procedure: ${procedureTitle}`);
  if (procedure?.official?.label?.trim()) lines.push(`Official card: ${procedure.official.label.trim()}`);
  lines.push('', UNCONFIRMED_LINE);

  const firstCase = (surgeon?.firstCase || []).map(line => String(line || '').trim()).filter(Boolean).slice(0, 3);
  if (firstCase.length) pushSection(lines, `New to ${surgeonTitle(surgeon?.name)}`, firstCase);

  if (blocks.position.text?.trim()) pushSection(lines, 'Position', [blocks.position.text]);
  if (blocks.prep.text?.trim()) pushSection(lines, 'Prep', [blocks.prep.text]);
  if (blocks.drapes.text?.trim()) pushSection(lines, 'Drapes', [blocks.drapes.text]);
  if (blocks.room.text?.trim()) pushSection(lines, 'Room start', [blocks.room.text]);
  if (blocks.equipment.text?.trim()) pushSection(lines, 'Equipment and settings', [blocks.equipment.text]);

  const gloves = [];
  if (blocks.gloves.outer?.model) {
    gloves.push(`Outer: ${[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}`);
  }
  if (blocks.gloves.inner?.model) {
    gloves.push(`Inner: ${[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}`);
  }
  pushSection(lines, 'Gloves', gloves);

  pushSection(lines, 'Case flow', (blocks.steps || []).filter(step => step.title?.trim()).map((step, index) => {
    const parts = [`${index + 1}. ${step.title.trim()}`];
    if (step.ready?.trim()) parts.push(`Have ready: ${step.ready.trim()}`);
    if (step.habit?.trim()) parts.push(step.habit.trim());
    return parts.join(' · ');
  }));

  const gear = instrumentLines(blocks);
  if (gear.mayo.length) lines.push('', `Mayo: ${gear.mayo.join(', ')}`);
  if (gear.rest.length) lines.push('', 'Also ready:', ...gear.rest);

  pushSection(lines, 'Trays', (blocks.trays || []).map(tray => {
    const parts = [tray.commonName];
    if (tray.spdName) parts.push(`SPD: ${tray.spdName}`);
    if (tray.vendorName) parts.push(tray.vendorName);
    parts.push(tray.openOrHold === 'hold' ? 'Hold' : 'Open');
    return parts.filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Sutures', (blocks.sutures || []).map(suture => {
    const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
    const head = [layer, [suture.name, suture.size, suture.needle].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const tail = [];
    if (suture.open) tail.push(`open ${suture.open}`);
    if (suture.hold) tail.push(`hold ${suture.hold}`);
    if (suture.catalogNumber) tail.push(suture.catalogNumber);
    return [head, ...tail].filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Implants', (blocks.implants || []).map(implant => {
    const name = implant.systemName || 'Unnamed system';
    return implant.repExpected ? `${name} · Rep expected` : name;
  }));

  pushSection(lines, 'Nicknames', (blocks.nicknames || []).map(nick => `“${nick.nickname}” → ${nick.actual || ''}`));
  pushSection(lines, 'People', (blocks.people || []).map(person => [person.name, person.role].filter(Boolean).join(' · ')));

  if (blocks.endOfCase.text?.trim()) pushSection(lines, 'Dressing and end of case', [blocks.endOfCase.text]);
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
      ...((surgeon.firstCase || []).some(line => String(line || '').trim())
        ? { firstCase: (surgeon.firstCase || []).map(line => String(line).trim()).filter(Boolean).slice(0, 3) }
        : {}),
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
  return Object.assign(new Error(code), { code });
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

export function suggestionText({ surgeon, procedure, cardSays = '', seen = '', change = '', from = '', date = '' }) {
  const title = [surgeon?.name, procedure?.name, procedure?.approach].filter(part => part && String(part).trim()).join(' · ');
  return [
    'Preference card suggestion',
    title,
    `Official card: ${(procedure?.official?.label || '').trim()}`,
    `The card says: ${cardSays}`,
    `Seen in the room: ${seen}`,
    `Suggested change: ${change}`,
    `From: ${from} · ${date}`,
    'Staff note. The surgeon and the card owner decide.',
  ].join('\n');
}

export function toPlacePack(book, place, fromName, exportedAt = new Date().toISOString(), { archived = false } = {}) {
  const surgeons = (book?.surgeons || [])
    .filter(surgeon => inPlaceGroup(surgeon, place, archived))
    .map(surgeon => ({ ...surgeon, archived: false }));
  const ids = new Set(surgeons.map(surgeon => surgeon.id));
  const procedures = (book?.procedures || [])
    .filter(procedure => !procedure.demo && ids.has(procedure.surgeonId))
    .map(procedure => stripConfirmation(procedure));
  return {
    kind: 'scrubplaybook-backup',
    v: 2,
    exportedAt,
    scope: { place },
    from: fromName || '',
    book: { version: BOOK_VERSION, surgeons, procedures },
  };
}

export function importPreviewText(parsed) {
  const surgeons = (parsed?.book?.surgeons || []).filter(surgeon => !surgeon.demo);
  const ids = new Set(surgeons.map(surgeon => surgeon.id));
  const procedures = (parsed?.book?.procedures || []).filter(procedure => !procedure.demo && ids.has(procedure.surgeonId));
  const surgeonWord = surgeons.length === 1 ? 'surgeon' : 'surgeons';
  const procedureWord = procedures.length === 1 ? 'procedure' : 'procedures';
  if (parsed?.scope?.place) {
    return `Hand-off for ${parsed.scope.place} from ${parsed.from || 'a tech'}: ${surgeons.length} ${surgeonWord}, ${procedures.length} ${procedureWord}. They arrive unconfirmed.`;
  }
  const samples = (parsed?.book?.surgeons || []).some(surgeon => surgeon.demo) || (parsed?.book?.procedures || []).some(procedure => procedure.demo);
  const when = parsed?.exportedAt ? ` from ${new Date(parsed.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
  if (parsed?.restorable) {
    return `Backup${when}: ${surgeons.length} ${surgeonWord}, ${procedures.length} ${procedureWord}.${samples ? ' Samples are skipped.' : ''}`;
  }
  return `Backup${when}: ${surgeons.length} ${surgeonWord}, ${procedures.length} ${procedureWord}. They arrive unconfirmed.${samples ? ' Samples are skipped.' : ''}`;
}

/**
 * A full backup of this phone. `extras` carries the board, the activity log,
 * the unit books this phone publishes, and suggestion follow-ups.
 * @param {import('./types').Book} book
 * @param {{ today?: object, log?: Array<object>, published?: import('./types').Published, suggestions?: Array<object> }} [extras]
 * @param {{ appVersion?: string }} [about]
 */
export function toBackup(book, extras = {}, { appVersion } = {}) {
  const surgeons = book.surgeons.filter(s => !s.demo);
  const ids = new Set(surgeons.map(s => s.id));
  const kept = {};
  if (extras.today?.items?.length) kept.today = extras.today;
  if (Array.isArray(extras.log) && extras.log.length) kept.log = extras.log;
  if (extras.published && Object.keys(extras.published).length) kept.published = extras.published;
  if (Array.isArray(extras.suggestions) && extras.suggestions.length) kept.suggestions = extras.suggestions;
  return {
    kind: 'scrubplaybook-backup',
    v: 2,
    exportedAt: new Date().toISOString(),
    ...(appVersion ? { appVersion } : {}),
    book: {
      version: BOOK_VERSION,
      surgeons,
      procedures: book.procedures.filter(p => ids.has(p.surgeonId) && !p.demo),
    },
    ...(Object.keys(kept).length ? { extras: kept } : {}),
  };
}

function stampOf(item) {
  return item?.updatedAt || item?.firstCaseAt || item?.createdAt || '';
}

/**
 * Restores this phone's own backup. Confirmations are kept. Missing items are added.
 * An item already here is replaced only when the backup's copy is newer.
 */
export function restoreBackup(current, incoming) {
  const surgeons = [...(current?.surgeons || [])];
  const procedures = [...(current?.procedures || [])];
  const surgeonAt = new Map(surgeons.map((s, index) => [s.id, index]));
  const procedureAt = new Map(procedures.map((p, index) => [p.id, index]));
  const counts = { added: 0, updated: 0, kept: 0 };
  for (const surgeon of incoming?.surgeons || []) {
    if (surgeon.demo) continue;
    if (!surgeonAt.has(surgeon.id)) {
      surgeonAt.set(surgeon.id, surgeons.length);
      surgeons.push(surgeon);
      counts.added += 1;
    } else {
      const index = surgeonAt.get(surgeon.id);
      if (stampOf(surgeon) > stampOf(surgeons[index])) {
        surgeons[index] = surgeon;
        counts.updated += 1;
      } else {
        counts.kept += 1;
      }
    }
  }
  for (const procedure of incoming?.procedures || []) {
    if (procedure.demo || !surgeonAt.has(procedure.surgeonId)) continue;
    const next = { ...procedure, blocks: normalizeBlocks(procedure.blocks) };
    if (!procedureAt.has(procedure.id)) {
      procedureAt.set(procedure.id, procedures.length);
      procedures.push(next);
      counts.added += 1;
    } else {
      const index = procedureAt.get(procedure.id);
      if (stampOf(procedure) > stampOf(procedures[index])) {
        procedures[index] = next;
        counts.updated += 1;
      } else {
        counts.kept += 1;
      }
    }
  }
  return { book: { version: BOOK_VERSION, surgeons, procedures }, ...counts };
}

function mergeById(current, incoming, order) {
  const byId = new Map();
  for (const item of [...(incoming || []), ...(current || [])]) {
    if (item?.id) byId.set(item.id, item);
  }
  const list = [...byId.values()];
  return order ? list.sort(order) : list;
}

/** Merges the extras of a restored backup into what this phone already has. */
/**
 * `handedOver` lists the places this phone handed to the next publisher; a backup from before
 * the hand-over does not make this phone a publisher again. A place whose key is still locked is skipped.
 * @param {{ published?: import('./types').Published, today?: object, log?: Array<object>, suggestions?: Array<object> }} [current]
 * @param {{ published?: import('./types').Published, today?: object, log?: Array<object>, suggestions?: Array<object> }} [incoming]
 * @param {{ today?: string, maxLog?: number, handedOver?: Record<string, import('./types').HandOverRecord> }} [options]
 */
export function restoreExtras(current = {}, incoming = {}, { today: day, maxLog = 100, handedOver = {} } = {}) {
  const published = { ...(current.published || {}) };
  for (const [place, entry] of Object.entries(incoming.published || {})) {
    if (entry?.lockedKey && !entry.privateKey) continue;
    const gone = handedOver[place];
    if (gone && gone.unitBookId === entry?.unitBookId && (Number(entry?.revision) || 0) <= (Number(gone.revision) || 0)) continue;
    const here = published[place];
    const retired = [...new Set([...(here?.retired || []), ...(entry?.retired || [])])];
    if (entry?.unitBookId && retired.includes(entry.unitBookId)) continue;
    const replacedHere = here?.unitBookId && retired.includes(here.unitBookId);
    if (!replacedHere && here?.unitBookId && entry?.unitBookId && here.unitBookId !== entry.unitBookId) continue;
    if (!here || replacedHere || (Number(entry?.revision) || 0) > (Number(here?.revision) || 0)) {
      published[place] = retired.length ? { ...entry, retired } : entry;
    }
  }
  const todayItems = mergeById(current.today?.items, incoming.today?.items)
    .filter(item => !day || (item.day && item.day >= day));
  const log = mergeById(current.log, incoming.log, (a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, maxLog);
  const suggestions = mergeById(current.suggestions, incoming.suggestions);
  return { published, today: { v: 2, items: todayItems }, log, suggestions };
}

function cardToBook(data) {
  if (data.v === 2 && data.surgeon && data.procedure) {
    const surgeonId = uid();
    const procedure = stripConfirmation({
      ...data.procedure,
      id: uid(),
      surgeonId,
      approach: data.procedure.approach || '',
      aliases: cleanAliases(data.procedure.aliases),
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
      version: BOOK_VERSION,
      surgeons: [{
        id: surgeonId,
        name: data.surgeon.name,
        specialty: data.surgeon.specialty || 'Other',
        facility: data.surgeon.facility || '',
        demo: false,
        createdAt: new Date().toISOString(),
        addedBy: 'Imported',
        firstCase: cleanFirstCase(data.surgeon.firstCase),
        firstCaseAt: null,
        firstCaseBy: cleanFirstCase(data.surgeon.firstCase).length ? 'Imported' : '',
        archived: false,
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
  if (data.kind === 'scrubplaybook-unitbook') {
    if (data.unitBookId && data.book) return { type: 'unitbook', file: data, book: data.book };
    throw new Error('unitbook');
  }
  if (data.kind === 'scrubplaybook-publisher') {
    if (data.unitFile?.unitBookId && data.privateKey) return { type: 'publisher', handover: data, book: data.unitFile.book };
    throw new Error('publisher');
  }
  if (data.kind === 'scrubplaybook-backup') {
    if (data.v === 2 && data.book) {
      const full = migrateBook(data.book);
      const restorable = !data.scope;
      return {
        type: 'backup',
        book: withoutConfirmation(full),
        scope: data.scope || null,
        from: data.from || '',
        exportedAt: data.exportedAt || null,
        restorable,
        ...(restorable ? { full, extras: data.extras || {} } : {}),
      };
    }
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
    && !existing.archived
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
    && (item.approach || '').trim().toLowerCase() === (procedure?.approach || '').trim().toLowerCase()
  ));
  if (existing) return { kind: 'duplicate', surgeon: found, procedure: existing };
  return { kind: 'attach', surgeon: found };
}

/**
 * @param {import('./types').Book} book
 * @param {import('./types').Book} incomingBook
 * @param {{ surgeonId?: string }} [options]
 */
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
    book: { version: BOOK_VERSION, surgeons: book.surgeons, procedures: [...book.procedures, placed] },
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
  return { book: { version: BOOK_VERSION, surgeons, procedures }, imported, skipped };
}
