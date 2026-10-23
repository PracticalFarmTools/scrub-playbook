import { BOOK_VERSION, PUBLISHED_KEY, STALE_AFTER_DAYS, normalizeBlocks, uid } from './schema';
import { inPlaceGroup } from './places';
import { generateSigningKey, keyFingerprint, keysMatch, signFile, verifyFile } from './sign';
import { safeJson, safeSet } from './storage';
import { applySave, sameContent, stripConfirmation } from './trust';

export const UNIT_FILE_VERSION = 2;
export const UNIT_AGE_WARNING_DAYS = 90;
export const DEFAULT_UNIT_SETTINGS = Object.freeze({ staleDays: STALE_AFTER_DAYS, dictation: true, twoPerson: false });
export const STALE_DAY_CHOICES = [30, 60, 90, 180];

export function cleanSettings(settings) {
  const staleDays = Number(settings?.staleDays);
  return {
    staleDays: STALE_DAY_CHOICES.includes(staleDays) ? staleDays : DEFAULT_UNIT_SETTINGS.staleDays,
    dictation: settings?.dictation !== false,
    twoPerson: settings?.twoPerson === true,
  };
}

export function readPublished() {
  const value = safeJson(PUBLISHED_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function savePublished(published) {
  return safeSet(PUBLISHED_KEY, JSON.stringify(published || {}));
}

export function unitRevision(book, unitBookId) {
  const revisions = [...(book?.surgeons || []), ...(book?.procedures || [])]
    .filter(item => item?.unitBook?.id === unitBookId)
    .map(item => Number(item.unitBook.revision) || 0);
  return revisions.length ? Math.max(...revisions) : 0;
}

function shortDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function sourceLabel(procedure) {
  if (procedure?.unitBook?.id) {
    const when = procedure.unitBook.publishedAt ? shortDate(procedure.unitBook.publishedAt) : '';
    return `Unit book · revision ${procedure.unitBook.revision}${when ? ` · ${when}` : ''}`;
  }
  if (procedure?.copiedFrom) return 'My notes';
  return '';
}

export function unitPreviewText(file) {
  const when = file?.publishedAt ? shortDate(file.publishedAt) : '';
  return `Unit book for ${file?.place}, revision ${file?.revision} from ${file?.publishedBy || 'a tech'}${when ? `, published ${when}` : ''}.`;
}

export function unitAgeDays(file, now = Date.now()) {
  const at = new Date(file?.publishedAt || '').getTime();
  return Number.isNaN(at) ? 0 : Math.floor((now - at) / 86400000);
}

/** The publisher key this phone already trusts for a unit book, from its stamps. */
export function pinnedKey(book, unitBookId) {
  const stamped = [...(book?.surgeons || []), ...(book?.procedures || [])].find(item => item?.unitBook?.id === unitBookId && item.unitBook.key);
  return stamped?.unitBook.key || null;
}

const SECTION_LABELS = [
  ['position', 'Position'], ['prep', 'Prep'], ['drapes', 'Drapes'], ['room', 'Room start'],
  ['equipment', 'Equipment and settings'], ['gloves', 'Gloves'], ['steps', 'Case flow'], ['instruments', 'Instruments'],
  ['trays', 'Trays'], ['sutures', 'Sutures'], ['implants', 'Implants'], ['nicknames', 'Nicknames'], ['people', 'People'],
  ['endOfCase', 'Dressing and end of case'], ['note', 'Note'],
];
const TEXT_SECTIONS = new Set(['position', 'prep', 'drapes', 'room', 'equipment', 'endOfCase', 'note']);

/** Section names that differ between two copies of a card, in card order. */
export function changedSections(before, after) {
  const left = normalizeBlocks(before?.blocks);
  const right = normalizeBlocks(after?.blocks);
  const changes = [];
  if ((before?.name || '') !== (after?.name || '') || (before?.approach || '') !== (after?.approach || '')) changes.push('Name');
  if ((before?.official?.label || '') !== (after?.official?.label || '') || (before?.official?.note || '') !== (after?.official?.note || '')) changes.push('Official card');
  for (const [key, label] of SECTION_LABELS) {
    const a = TEXT_SECTIONS.has(key) ? (left[key]?.text || '') : JSON.stringify(left[key] ?? null);
    const b = TEXT_SECTIONS.has(key) ? (right[key]?.text || '') : JSON.stringify(right[key] ?? null);
    if (a !== b) changes.push(label);
  }
  if (JSON.stringify(before?.aliases || []) !== JSON.stringify(after?.aliases || [])) changes.push('Board names');
  return changes;
}

export function isOwnUnitBook(file, published = readPublished()) {
  return Object.values(published || {}).some(entry => entry?.unitBookId && entry.unitBookId === file?.unitBookId);
}

/** Surgeons already on this phone under the same id that this unit book does not own yet, such as a hand-off copy. */
export function unitConflicts(current, file) {
  const ids = new Set((file?.book?.surgeons || []).filter(surgeon => !surgeon.demo).map(surgeon => surgeon.id));
  return (current?.surgeons || []).filter(surgeon => (
    !surgeon.demo && ids.has(surgeon.id) && surgeon.unitBook?.id !== file?.unitBookId
  ));
}

export function namesList(surgeons) {
  return (surgeons || []).map(surgeon => surgeon.name).filter(Boolean).join(', ');
}

function publishableBook(book, place) {
  const surgeons = (book?.surgeons || [])
    .filter(surgeon => inPlaceGroup(surgeon, place, false))
    .map(surgeon => {
      const copy = { ...surgeon, archived: false };
      delete copy.unitBook;
      return copy;
    });
  const ids = new Set(surgeons.map(surgeon => surgeon.id));
  const procedures = (book?.procedures || [])
    .filter(procedure => !procedure.demo && ids.has(procedure.surgeonId))
    .map(procedure => {
      const copy = stripConfirmation({ ...procedure, blocks: normalizeBlocks(procedure.blocks) });
      delete copy.unitBook;
      delete copy.copiedFrom;
      return copy;
    });
  return { version: BOOK_VERSION, surgeons, procedures };
}

/**
 * Builds the next signed revision. Returns the next published map; save it with savePublished
 * once the file has gone out. The first publish of a place makes its signing key.
 */
export async function publishUnitBook(book, place, fromName, { now = new Date().toISOString(), published = readPublished(), keys } = {}) {
  const current = published[place] || {};
  if (current.publicKey && !current.privateKey) throw new Error('no-key');
  const unitBookId = current.unitBookId || uid();
  const revision = (Number(current.revision) || 0) + 1;
  const pair = current.privateKey && current.publicKey
    ? { publicKey: current.publicKey, privateKey: current.privateKey }
    : (keys || await generateSigningKey());
  const settings = cleanSettings(current.settings);
  const fingerprint = await keyFingerprint(pair.publicKey);
  const file = await signFile({
    kind: 'scrubplaybook-unitbook',
    v: UNIT_FILE_VERSION,
    unitBookId,
    place,
    revision,
    publishedBy: fromName || '',
    publishedAt: now,
    settings,
    book: publishableBook(book, place),
    publicKey: pair.publicKey,
  }, pair.privateKey);
  const nextPublished = {
    ...published,
    [place]: { ...current, unitBookId, revision, publishedAt: now, settings, publicKey: pair.publicKey, privateKey: pair.privateKey, fingerprint },
  };
  return { published: nextPublished, file, fingerprint };
}

/** Unit settings saved before the first publish, or changed between revisions. */
export function withUnitSettings(published, place, settings) {
  return { ...published, [place]: { ...(published[place] || {}), settings: cleanSettings(settings) } };
}

/** One editable copy per unit card, kept under the same surgeon so a board line still finds one person. */
export function copyUnitProcedure(book, procedureId, { now = new Date().toISOString() } = {}) {
  const procedure = (book?.procedures || []).find(item => item.id === procedureId);
  if (!procedure?.unitBook) return { status: 'missing', book };
  const existing = book.procedures.find(item => (
    item.copiedFrom === procedure.id && !item.unitBook && item.surgeonId === procedure.surgeonId
  ));
  if (existing) return { status: 'already', book, procedureId: existing.id };
  const copy = stripConfirmation({
    ...procedure,
    id: uid(),
    copiedFrom: procedure.id,
    demo: false,
    updatedAt: now,
    baseUpdatedAt: now,
  });
  delete copy.unitBook;
  return {
    status: 'copied',
    procedureId: copy.id,
    book: { ...book, procedures: [copy, ...book.procedures] },
  };
}

function stampedSurgeon(surgeon, stamp) {
  return { ...surgeon, demo: false, archived: false, unitBook: stamp };
}

/**
 * Checks a unit book file before anything is read from it.
 * `{ ok, fingerprint }`, or `{ ok: false, reason: 'old-format' | 'unsigned' | 'changed' }`.
 */
export async function checkUnitFile(file) {
  if (file?.kind !== 'scrubplaybook-unitbook') return { ok: false, reason: 'changed' };
  if (Number(file.v) !== UNIT_FILE_VERSION) return { ok: false, reason: 'old-format' };
  return verifyFile(file);
}

export function unitCheckText(check) {
  if (check?.reason === 'old-format') return 'This unit book file is from an earlier version and is not signed. Ask the publisher to publish it again.';
  if (check?.reason === 'unsigned') return 'This unit book file has no signature. Ask the publisher to publish it again.';
  return 'This unit book file was changed after it was published, so it was not used. Ask the publisher to send it again.';
}

function noCounts() {
  return { added: 0, changed: 0, removed: 0, kept: [] };
}

/**
 * A surgeon this phone already keeps under the same id is left alone unless `adopt` is set.
 * With `adopt`, that surgeon and its matching procedures follow the unit book from now on.
 */
export function applyUnitBook(current, file, { adopt = false, published = readPublished(), fingerprint = null } = {}) {
  const unitBookId = file?.unitBookId;
  const revision = Number(file?.revision) || 0;
  if (!fingerprint) return { status: 'unsigned', revision, book: current, counts: noCounts() };
  if (isOwnUnitBook(file, published)) return { status: 'own', revision, book: current, counts: noCounts() };
  const pinned = pinnedKey(current, unitBookId);
  if (pinned && pinned !== fingerprint) return { status: 'other-publisher', revision, book: current, counts: noCounts() };
  const had = unitRevision(current, unitBookId);
  if (had && revision <= had) return { status: 'older', revision: had, book: current, counts: noCounts() };

  const stamp = {
    id: unitBookId,
    revision,
    publishedAt: file.publishedAt || null,
    key: fingerprint,
    settings: cleanSettings(file.settings),
  };
  const conflicts = unitConflicts(current, file);
  const conflictIds = new Set(conflicts.map(surgeon => surgeon.id));
  const blockedIds = adopt ? new Set() : conflictIds;
  const adoptedIds = adopt ? conflictIds : new Set();
  const counts = { ...noCounts(), kept: adopt ? [] : conflicts };

  const incomingSurgeons = (file?.book?.surgeons || [])
    .filter(surgeon => !surgeon.demo && !blockedIds.has(surgeon.id))
    .map(surgeon => stampedSurgeon(surgeon, stamp));
  const incomingSurgeonIds = new Set(incomingSurgeons.map(surgeon => surgeon.id));
  const incomingProcedures = (file?.book?.procedures || [])
    .filter(procedure => !procedure.demo && incomingSurgeonIds.has(procedure.surgeonId))
    .map(procedure => ({
      ...procedure,
      approach: procedure.approach || '',
      blocks: normalizeBlocks(procedure.blocks),
      unitBook: stamp,
      demo: false,
    }));

  if (!incomingSurgeons.length) return { status: 'skipped', revision, book: current, counts };

  const ownedBy = (surgeonId) => adoptedIds.has(surgeonId);
  const surgeons = (current?.surgeons || []).map(surgeon => {
    const incoming = incomingSurgeons.find(item => item.id === surgeon.id);
    if (!incoming) return surgeon;
    if (surgeon.unitBook?.id !== unitBookId && !ownedBy(surgeon.id)) return surgeon;
    return { ...surgeon, ...incoming, unitBook: stamp };
  });
  incomingSurgeons.forEach(surgeon => {
    if (!surgeons.some(item => item.id === surgeon.id)) surgeons.push(surgeon);
  });

  const procedures = [];
  const existingIds = new Set((current?.procedures || []).map(procedure => procedure.id));
  for (const existing of current?.procedures || []) {
    const owned = existing.unitBook?.id === unitBookId;
    const incoming = incomingProcedures.find(item => item.id === existing.id);
    if (owned && !incoming) {
      counts.removed += 1;
      continue;
    }
    if (incoming && (owned || ownedBy(existing.surgeonId))) {
      const before = { ...existing, blocks: normalizeBlocks(existing.blocks) };
      const same = sameContent(before, incoming);
      const changes = changedSections(before, incoming);
      if (changes.length) counts.changed += 1;
      const saved = applySave(before, incoming);
      const kept = same ? { ...saved, updatedAt: existing.updatedAt } : saved;
      procedures.push({ ...kept, unitBook: { ...stamp, changes } });
    } else {
      procedures.push(existing);
    }
  }
  incomingProcedures.forEach(procedure => {
    if (!existingIds.has(procedure.id)) {
      procedures.push({ ...stripConfirmation(procedure), unitBook: { ...stamp, changes: ['New card'] } });
      counts.added += 1;
    }
  });

  const keptSurgeonIds = new Set(procedures.map(procedure => procedure.surgeonId));
  const nextSurgeons = surgeons.filter(surgeon => (
    surgeon.unitBook?.id !== unitBookId || incomingSurgeonIds.has(surgeon.id) || keptSurgeonIds.has(surgeon.id)
  ));

  return {
    status: 'updated',
    revision,
    counts,
    book: { version: BOOK_VERSION, surgeons: nextSurgeons, procedures },
  };
}

export function unitResultText(place, result) {
  if (result.status === 'unsigned') return 'This unit book file is not signed, so it was not used.';
  if (result.status === 'other-publisher') return `This file for ${place} was signed by a different publisher than the unit book on this phone, so it was not used. Ask your unit who publishes it now.`;
  if (result.status === 'own') return 'This is the unit book you published from this phone. Your notes already have it.';
  if (result.status === 'older') return `You already have revision ${result.revision}.`;
  const kept = result.counts?.kept?.length
    ? ` Your own notes for ${namesList(result.counts.kept)} stay as they are.`
    : '';
  if (result.status === 'skipped') return `Nothing was added from the unit book for ${place}.${kept}`;
  const { added = 0, changed = 0, removed = 0 } = result.counts || {};
  const word = (n) => (n === 1 ? 'procedure' : 'procedures');
  const parts = [`${added} ${word(added)} added`, `${changed} changed`, `${removed} removed`];
  return `Unit book for ${place} is now revision ${result.revision}: ${parts.join(', ')}. New and changed cards are unconfirmed.${kept}`;
}

/** What a revision would change on this phone, card by card, without saving anything. */
export function unitChangeList(current, file, options) {
  const result = applyUnitBook(current, file, options);
  if (result.status !== 'updated') return { status: result.status, cards: [], removed: 0 };
  const names = new Map(result.book.surgeons.map(surgeon => [surgeon.id, surgeon.name]));
  const cards = result.book.procedures
    .filter(procedure => procedure.unitBook?.id === file.unitBookId && procedure.unitBook.revision === result.revision && procedure.unitBook.changes?.length)
    .map(procedure => ({ id: procedure.id, title: `${names.get(procedure.surgeonId) || ''} · ${procedure.name}`, changes: procedure.unitBook.changes }));
  return { status: 'updated', cards, removed: result.counts.removed };
}

/** True when any unit book on this phone, or a unit this phone publishes, turns dictation off. */
export function dictationOff(book, published = readPublished()) {
  const stamped = [...(book?.surgeons || []), ...(book?.procedures || [])].some(item => item?.unitBook?.settings?.dictation === false);
  return stamped || Object.values(published || {}).some(entry => entry?.settings?.dictation === false);
}

/** Unit rules for one card: its unit book stamp, or the settings of a place this phone publishes. */
export function unitSettingsFor(procedure, surgeon, published = readPublished()) {
  if (procedure?.unitBook?.settings) return cleanSettings(procedure.unitBook.settings);
  const place = (surgeon?.facility || '').trim();
  if (place && published?.[place]?.settings && !surgeon?.unitBook) return cleanSettings(published[place].settings);
  return null;
}

export function trustOptionsFor(procedure, surgeon, published) {
  const settings = unitSettingsFor(procedure, surgeon, published);
  return settings
    ? { staleDays: settings.staleDays, mode: settings.twoPerson ? 'facility' : 'personal' }
    : { staleDays: STALE_AFTER_DAYS, mode: 'personal' };
}

export const HANDOVER_KIND = 'scrubplaybook-publisher';

/**
 * A final signed revision plus the signing key, for the next publisher only.
 * Whoever holds this file can publish revisions that every phone accepts.
 */
export async function handOverPublishing(book, place, fromName, options = {}) {
  const published = options.published || readPublished();
  const current = published[place];
  if (!current?.privateKey) return { error: 'not-publisher' };
  const { file, published: nextPublished } = await publishUnitBook(book, place, fromName, { ...options, published });
  const entry = nextPublished[place];
  const remaining = { ...published };
  delete remaining[place];
  return {
    file: {
      kind: HANDOVER_KIND,
      v: 1,
      place,
      from: fromName || '',
      at: options.now || new Date().toISOString(),
      unitFile: file,
      privateKey: entry.privateKey,
    },
    published: remaining,
    revision: file.revision,
  };
}

export async function checkHandover(handover) {
  if (handover?.kind !== HANDOVER_KIND || !handover.unitFile || !handover.privateKey) return { ok: false, reason: 'changed' };
  const check = await checkUnitFile(handover.unitFile);
  if (!check.ok) return check;
  if (!(await keysMatch(handover.unitFile.publicKey, handover.privateKey))) return { ok: false, reason: 'changed' };
  return check;
}

function unstamp(item, unitBookId) {
  if (item?.unitBook?.id !== unitBookId) return item;
  const copy = { ...item };
  delete copy.unitBook;
  return copy;
}

/**
 * The next publisher takes the unit book as their own notes and keeps the key.
 * Cards this phone already kept as its own stay as they are.
 */
export function takeOverPublishing(current, handover, { fingerprint } = {}) {
  const file = handover.unitFile;
  const unitBookId = file.unitBookId;
  const applied = applyUnitBook(current, file, { published: {}, fingerprint });
  if (applied.status === 'other-publisher' || applied.status === 'unsigned') return { status: applied.status, book: current, place: file.place };
  const base = applied.status === 'updated' ? applied.book : current;
  const book = {
    version: BOOK_VERSION,
    surgeons: (base.surgeons || []).map(surgeon => unstamp(surgeon, unitBookId)),
    procedures: (base.procedures || []).map(procedure => unstamp(procedure, unitBookId)),
  };
  const entry = {
    unitBookId,
    revision: Number(file.revision) || 0,
    publishedAt: file.publishedAt || null,
    settings: cleanSettings(file.settings),
    publicKey: file.publicKey,
    privateKey: handover.privateKey,
    fingerprint,
  };
  return { book, place: file.place, entry, status: applied.status };
}
