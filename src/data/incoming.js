import { BOOK_VERSION, cleanFirstCase, normalizeBlocks, uid } from './schema';
import { migrateBook, withoutConfirmation } from './migrate';
import { stripConfirmation } from './trust';
import { samePersonName, sameProcedureName } from './today';
import { cleanAliases } from './boardMatch';
import { SHARE_FENCE } from './share';
import { mergeBackup } from './backup';

/** Reading what arrives: a shared card, a hand-off, a backup, a unit book, or a hand-over file. */

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
