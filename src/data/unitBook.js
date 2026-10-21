import { BOOK_VERSION, PUBLISHED_KEY, normalizeBlocks, uid } from './schema';
import { applySave, stripConfirmation } from './trust';

export function readPublished() {
  try {
    return JSON.parse(localStorage.getItem(PUBLISHED_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function unitRevision(book, unitBookId) {
  const revisions = [...(book?.surgeons || []), ...(book?.procedures || [])]
    .filter(item => item?.unitBook?.id === unitBookId)
    .map(item => Number(item.unitBook.revision) || 0);
  return revisions.length ? Math.max(...revisions) : 0;
}

export function unitPreviewText(file) {
  return `Unit book for ${file?.place}, revision ${file?.revision} from ${file?.publishedBy}.`;
}

export function publishUnitBook(book, place, fromName, { now = new Date().toISOString(), published = readPublished(), persist = true } = {}) {
  const current = published[place] || {};
  const unitBookId = current.unitBookId || uid();
  const revision = (Number(current.revision) || 0) + 1;
  const nextPublished = { ...published, [place]: { unitBookId, revision } };
  if (persist) {
    try { localStorage.setItem(PUBLISHED_KEY, JSON.stringify(nextPublished)); } catch { /* the file is still returned */ }
  }
  const surgeons = (book?.surgeons || [])
    .filter(surgeon => !surgeon.demo && !surgeon.archived && (surgeon.facility || '') === place)
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

function stampedSurgeon(surgeon, stamp) {
  return { ...surgeon, demo: false, archived: false, unitBook: stamp };
}

export function applyUnitBook(current, file) {
  const unitBookId = file?.unitBookId;
  const revision = Number(file?.revision) || 0;
  const had = unitRevision(current, unitBookId);
  if (had && revision <= had) return { status: 'older', revision: had, book: current };

  const stamp = { id: unitBookId, revision };
  const personalSurgeonIds = new Set((current?.surgeons || []).filter(surgeon => !surgeon.unitBook).map(surgeon => surgeon.id));
  const incomingSurgeons = (file?.book?.surgeons || [])
    .filter(surgeon => !surgeon.demo && !personalSurgeonIds.has(surgeon.id))
    .map(surgeon => stampedSurgeon(surgeon, stamp));
  const incomingProcedures = (file?.book?.procedures || [])
    .filter(procedure => !procedure.demo && !personalSurgeonIds.has(procedure.surgeonId))
    .map(procedure => ({
      ...procedure,
      approach: procedure.approach || '',
      blocks: normalizeBlocks(procedure.blocks),
      unitBook: stamp,
      demo: false,
    }));
  const incomingSurgeonIds = new Set(incomingSurgeons.map(surgeon => surgeon.id));
  const incomingProcedureIds = new Set(incomingProcedures.map(procedure => procedure.id));

  const surgeons = (current?.surgeons || []).map(surgeon => {
    const incoming = incomingSurgeons.find(item => item.id === surgeon.id);
    if (!incoming || !surgeon.unitBook || surgeon.unitBook.id !== unitBookId) return surgeon;
    return { ...surgeon, ...incoming, unitBook: stamp };
  });
  incomingSurgeons.forEach(surgeon => {
    if (!surgeons.some(item => item.id === surgeon.id)) surgeons.push(surgeon);
  });

  const procedures = [];
  for (const existing of current?.procedures || []) {
    const sameUnit = existing.unitBook?.id === unitBookId;
    if (sameUnit && !incomingProcedureIds.has(existing.id)) continue;
    const incoming = incomingProcedures.find(item => item.id === existing.id);
    if (incoming && sameUnit) {
      const saved = applySave(
        { ...existing, blocks: normalizeBlocks(existing.blocks) },
        incoming,
      );
      procedures.push({ ...saved, unitBook: stamp });
    } else {
      procedures.push(existing);
    }
  }
  incomingProcedures.forEach(procedure => {
    if (!(current?.procedures || []).some(item => item.id === procedure.id)) {
      procedures.push(stripConfirmation(procedure));
    }
  });

  const keptSurgeonIds = new Set(procedures.map(procedure => procedure.surgeonId));
  const nextSurgeons = surgeons.filter(surgeon => (
    surgeon.unitBook?.id !== unitBookId || incomingSurgeonIds.has(surgeon.id) || keptSurgeonIds.has(surgeon.id)
  ));

  return {
    status: 'updated',
    revision,
    book: { version: BOOK_VERSION, surgeons: nextSurgeons, procedures },
  };
}
