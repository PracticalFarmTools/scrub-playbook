import { BOOK_VERSION, normalizeBlocks } from './schema';
import { stripConfirmation } from './trust';
import { inPlaceGroup } from './places';

/** Files this phone writes and takes back: full backups, place hand-offs, and their merges. */

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
    const index = surgeonAt.get(surgeon.id);
    if (index === undefined) {
      surgeonAt.set(surgeon.id, surgeons.length);
      surgeons.push(surgeon);
      counts.added += 1;
    } else if (stampOf(surgeon) > stampOf(surgeons[index])) {
      surgeons[index] = surgeon;
      counts.updated += 1;
    } else {
      counts.kept += 1;
    }
  }
  for (const procedure of incoming?.procedures || []) {
    if (procedure.demo || !surgeonAt.has(procedure.surgeonId)) continue;
    const next = { ...procedure, blocks: normalizeBlocks(procedure.blocks) };
    const index = procedureAt.get(procedure.id);
    if (index === undefined) {
      procedureAt.set(procedure.id, procedures.length);
      procedures.push(next);
      counts.added += 1;
    } else if (stampOf(procedure) > stampOf(procedures[index])) {
      procedures[index] = next;
      counts.updated += 1;
    } else {
      counts.kept += 1;
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

/**
 * Merges the extras of a restored backup into what this phone already has.
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
