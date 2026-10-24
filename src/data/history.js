import { uid } from './schema';
import { readValue, storageWhere, writeValue } from './store';
import { sameContent, stripConfirmation } from './trust';
import { changedSections } from './unitBook';
import { withLock } from '../utils/locks';

export const HISTORY_KEY = 'scrubplaybook_history';
export const HISTORY_LOCK = 'scrubplaybook-history';
export const VERSIONS_PER_CARD = 10;
export const DELETED_KEEP_DAYS = 30;
export const DELETED_MAX = 50;

/**
 * @typedef {'edit' | 'unit-book' | 'restore-backup' | 'import' | 'earlier-version' | 'deleted'} ChangeReason
 * @typedef {object} CardVersion A card as it was before something replaced it.
 * @property {string} id
 * @property {import('./types').Procedure} procedure
 * @property {string} surgeonName
 * @property {string | null} savedAt When this version was saved.
 * @property {string} replacedAt When it stopped being the current card.
 * @property {ChangeReason} reason What replaced it.
 * @property {number} [revision] The unit book revision that replaced it.
 * @property {import('./types').Surgeon} [surgeon] Kept with a deleted card so it can come back with its surgeon.
 * @property {ChangeReason} [removedBy] For a deleted card, what removed it.
 * @typedef {{ v: 1, cards: Record<string, CardVersion[]>, deleted: CardVersion[] }} History
 */

/** @returns {History} */
export function emptyHistory() {
  return { v: 1, cards: {}, deleted: [] };
}

/** @returns {History} */
export function cleanHistory(value) {
  if (!value || typeof value !== 'object' || value.v !== 1) return emptyHistory();
  /** @type {Record<string, CardVersion[]>} */
  const cards = {};
  for (const [id, list] of Object.entries(value.cards || {})) {
    const kept = Array.isArray(list) ? list.filter(item => item?.procedure?.id === id) : [];
    if (kept.length) cards[id] = kept.slice(0, VERSIONS_PER_CARD);
  }
  const deleted = Array.isArray(value.deleted) ? value.deleted.filter(item => item?.procedure?.id) : [];
  return { v: 1, cards, deleted };
}

/**
 * @param {import('./types').Procedure} procedure
 * @param {import('./types').Surgeon | undefined} surgeon
 * @param {{ at: string, reason: ChangeReason, revision?: number }} meta
 */
function versionOf(procedure, surgeon, { at, reason, revision }) {
  /** @type {CardVersion} */
  const version = {
    id: uid(),
    procedure,
    surgeonName: surgeon?.name || '',
    savedAt: procedure.updatedAt || null,
    replacedAt: at,
    reason,
  };
  if (revision) version.revision = revision;
  return version;
}

function pruneDeleted(deleted, at) {
  const oldest = new Date(at).getTime() - DELETED_KEEP_DAYS * 86400000;
  return deleted
    .filter(item => new Date(item.replacedAt).getTime() >= oldest)
    .slice(0, DELETED_MAX);
}

/**
 * Adds the versions that `after` replaced in `before`: every card whose content changed, and every card
 * that is gone. Confirming or flagging a card is not a new version. Sample cards are not kept.
 * @param {History} history
 * @param {import('./types').Book} before
 * @param {import('./types').Book} after
 * @param {{ at?: string, reason?: ChangeReason }} [options]
 * @returns {{ history: History, changed: boolean }}
 */
export function recordChanges(history, before, after, { at = new Date().toISOString(), reason = 'edit' } = {}) {
  const cards = { ...history.cards };
  let deleted = [...history.deleted];
  let changed = false;
  const nowById = new Map((after?.procedures || []).map(procedure => [procedure.id, procedure]));
  const surgeons = new Map((before?.surgeons || []).map(surgeon => [surgeon.id, surgeon]));
  for (const procedure of before?.procedures || []) {
    if (procedure.demo) continue;
    const surgeon = surgeons.get(procedure.surgeonId);
    const now = nowById.get(procedure.id);
    if (!now) {
      deleted = [{ ...versionOf(procedure, surgeon, { at, reason: 'deleted' }), removedBy: reason, ...(surgeon ? { surgeon } : {}) }, ...deleted];
      changed = true;
    } else if (!sameContent(procedure, now)) {
      const revision = now.unitBook?.revision !== procedure.unitBook?.revision ? now.unitBook?.revision : undefined;
      const why = reason === 'edit' && revision ? 'unit-book' : reason;
      cards[procedure.id] = [versionOf(procedure, surgeon, { at, reason: why, revision }), ...(cards[procedure.id] || [])].slice(0, VERSIONS_PER_CARD);
      changed = true;
    }
  }
  const back = deleted.filter(item => nowById.has(item.procedure.id));
  if (back.length) {
    deleted = deleted.filter(item => !nowById.has(item.procedure.id));
    changed = true;
  }
  const pruned = pruneDeleted(deleted, at);
  if (pruned.length !== deleted.length) changed = true;
  const keep = new Set([...nowById.keys(), ...pruned.map(item => item.procedure.id)]);
  for (const id of Object.keys(cards)) {
    if (!keep.has(id)) {
      delete cards[id];
      changed = true;
    }
  }
  return { history: { v: 1, cards, deleted: pruned }, changed };
}

/** Earlier versions of one card, newest first, each with what the next version changed. */
export function cardVersions(history, procedure) {
  const list = history.cards[procedure.id] || [];
  return list.map((version, index) => ({
    ...version,
    changes: changedSections(version.procedure, index === 0 ? procedure : list[index - 1].procedure),
  }));
}

export function replacedText(version) {
  switch (version.reason) {
    case 'unit-book': return version.revision ? `unit book revision ${version.revision}` : 'a unit book update';
    case 'restore-backup': return 'a restored backup';
    case 'import': return 'an imported card';
    case 'earlier-version': return 'bringing back an earlier version';
    case 'deleted': return 'deleting the card';
    default: return 'an edit on this phone';
  }
}

/** An earlier version is shown with no confirmations or flag: they were about a case it no longer describes. */
export function asEarlier(procedure) {
  return { ...stripConfirmation(procedure), disputed: false, reportNote: '' };
}

export function removedText(entry) {
  switch (entry.removedBy) {
    case 'unit-book': return 'Removed by a unit book update';
    case 'restore-backup': return 'Removed when a backup was restored';
    default: return 'Deleted on this phone';
  }
}

export function versionTime(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * The current card with an earlier version's content. Confirmations are cleared because the case
 * they vouched for changed. Unit book cards change only when their publisher publishes.
 */
export function withEarlierContent(current, version) {
  if (current.unitBook?.id) return null;
  const old = version.procedure;
  return stripConfirmation({
    ...current,
    name: old.name,
    approach: old.approach || '',
    blocks: old.blocks,
    official: old.official || current.official,
    aliases: old.aliases || [],
  });
}

/**
 * What to put back for a deleted card. A card a unit book removed comes back as the person's own notes,
 * unconfirmed, because the unit no longer stands behind it.
 * @param {import('./types').Book} book
 * @param {CardVersion} entry
 */
export function deletedToRestore(book, entry) {
  const fromUnit = Boolean(entry.procedure.unitBook?.id);
  const hasSurgeon = book.surgeons.some(surgeon => surgeon.id === entry.procedure.surgeonId);
  const { unitBook: _stamp, ...own } = entry.procedure;
  const procedure = fromUnit ? stripConfirmation(own) : entry.procedure;
  let surgeons = [];
  if (!hasSurgeon && entry.surgeon) {
    const { unitBook: _surgeonStamp, ...ownSurgeon } = entry.surgeon;
    surgeons = [fromUnit || entry.surgeon.unitBook ? ownSurgeon : entry.surgeon];
  }
  return { surgeons, procedures: [procedure] };
}

export function forgetCard(history, procedureId) {
  const cards = { ...history.cards };
  delete cards[procedureId];
  return { ...history, cards, deleted: history.deleted.filter(item => item.procedure.id !== procedureId) };
}

const listeners = new Set();
let queue = Promise.resolve();

/** History is kept only in IndexedDB, so it never takes the localStorage room the book falls back to. */
export async function loadHistory() {
  return cleanHistory(await readValue(HISTORY_KEY));
}

/**
 * Applies `change` to the stored history, one change at a time across tabs. Resolves to the saved
 * history, or null when this browser has no IndexedDB or the write failed.
 * @param {(history: History) => History | null} change Returns null to leave history as it is.
 */
export function updateHistory(change) {
  const run = queue.then(() => withLock(HISTORY_LOCK, async () => {
    if ((await storageWhere()) !== 'indexeddb') return null;
    const next = change(await loadHistory());
    if (!next) return null;
    const result = await writeValue(HISTORY_KEY, next);
    if (!result.ok) return null;
    listeners.forEach(listener => listener(next));
    return next;
  }));
  queue = run.catch(() => null);
  return run;
}

export function onHistoryChange(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Records what one change to the book replaced. Never throws; history is a convenience, not the book. */
export function recordBookChange(before, after, options) {
  return updateHistory(history => {
    const { history: next, changed } = recordChanges(history, before, after, options);
    return changed ? next : null;
  }).catch(() => null);
}
