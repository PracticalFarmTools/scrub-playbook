import { BOOK_VERSION, PUBLISHED_KEY, normalizeBlocks, uid } from './schema';
import { inPlaceGroup } from './places';
import { safeSet } from './storage';
import { applySave, sameContent, stripConfirmation } from './trust';

export function readPublished() {
  try {
    return JSON.parse(localStorage.getItem(PUBLISHED_KEY) || '{}') || {};
  } catch {
    return {};
  }
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

export function sourceLabel(procedure) {
  if (procedure?.unitBook?.id) return `Unit book · revision ${procedure.unitBook.revision}`;
  if (procedure?.copiedFrom) return 'My notes';
  return '';
}

export function unitPreviewText(file) {
  return `Unit book for ${file?.place}, revision ${file?.revision} from ${file?.publishedBy || 'a tech'}.`;
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

/** Returns the next published map. Save it with savePublished once the file has gone out. */
export function publishUnitBook(book, place, fromName, { now = new Date().toISOString(), published = readPublished() } = {}) {
  const current = published[place] || {};
  const unitBookId = current.unitBookId || uid();
  const revision = (Number(current.revision) || 0) + 1;
  const nextPublished = { ...published, [place]: { unitBookId, revision } };
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
  return {
    published: nextPublished,
    file: {
      kind: 'scrubplaybook-unitbook',
      v: 1,
      unitBookId,
      place,
      revision,
      publishedBy: fromName || '',
      publishedAt: now,
      book: { version: BOOK_VERSION, surgeons, procedures },
    },
  };
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

function noCounts() {
  return { added: 0, changed: 0, removed: 0, kept: [] };
}

/**
 * A surgeon this phone already keeps under the same id is left alone unless `adopt` is set.
 * With `adopt`, that surgeon and its matching procedures follow the unit book from now on.
 */
export function applyUnitBook(current, file, { adopt = false, published = readPublished() } = {}) {
  const unitBookId = file?.unitBookId;
  const revision = Number(file?.revision) || 0;
  if (isOwnUnitBook(file, published)) return { status: 'own', revision, book: current, counts: noCounts() };
  const had = unitRevision(current, unitBookId);
  if (had && revision <= had) return { status: 'older', revision: had, book: current, counts: noCounts() };

  const stamp = { id: unitBookId, revision };
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
      if (!sameContent(before, incoming)) counts.changed += 1;
      procedures.push({ ...applySave(before, incoming), unitBook: stamp });
    } else {
      procedures.push(existing);
    }
  }
  incomingProcedures.forEach(procedure => {
    if (!existingIds.has(procedure.id)) {
      procedures.push(stripConfirmation(procedure));
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
