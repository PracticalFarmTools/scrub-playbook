import { BOOK_VERSION, emptyBook, emptyBlocks, normalizeBlocks, gloveChoice, textBlock, uid } from './schema';
import { PRODUCTS, productIdForSuture } from './products';

function productIdForGlove(model) {
  const found = PRODUCTS.find(p => p.kind === 'glove' && p.name.toLowerCase() === String(model || '').toLowerCase());
  return found?.id || null;
}
import { stripConfirmation } from './trust';

function sutureFromV0(suture) {
  return {
    id: uid(),
    layer: 'unspecified',
    name: suture.name || '',
    size: suture.size || '',
    needle: '',
    color: suture.color || '#94a3b8',
    textColor: suture.textColor || 'white',
    open: '',
    hold: '',
    productId: productIdForSuture(suture.name),
    catalogNumber: '',
  };
}

function procedureFromV0(surgeon) {
  const blocks = emptyBlocks();
  blocks.gloves.outer = gloveChoice({
    productId: productIdForGlove(surgeon.gloveModel),
    model: surgeon.gloveModel || '',
    brand: surgeon.gloveBrand || '',
    color: surgeon.gloveColor || '',
    size: surgeon.gloveSize || '',
  });
  blocks.sutures = (surgeon.sutures || []).map(sutureFromV0);
  blocks.nicknames = (surgeon.nicknames || []).map(n => ({
    nickname: n.nickname || '',
    actual: n.actual || '',
  }));
  blocks.people = (surgeon.assists || []).map(a => ({
    name: a.name || '',
    role: a.role || 'PA',
    gloveModel: a.gloveModel || '',
    gloveBrand: a.gloveBrand || '',
    gloveSize: a.gloveSize || '',
  }));
  const companies = (surgeon.vendorLinks || []).map(name => String(name || '').trim()).filter(Boolean);
  const note = [surgeon.tips || '', companies.length ? `Companies: ${companies.join(', ')}.` : '']
    .filter(Boolean)
    .join('\n');
  blocks.note = textBlock(note, surgeon.addedBy || '');

  /** @type {import('./types').Procedure} */
  const procedure = {
    id: uid(),
    surgeonId: surgeon.id,
    name: 'All cases (imported)',
    approach: '',
    demo: Boolean(surgeon.demo) || String(surgeon.id || '').startsWith('demo-'),
    disputed: surgeon.status === 'disputed',
    reported: false,
    reportNote: '',
    lastConfirmedAt: null,
    confirmations: [],
    official: { label: '', reviewedAt: null, note: '' },
    updatedAt: surgeon.createdAt || new Date().toISOString(),
    baseUpdatedAt: surgeon.createdAt || new Date().toISOString(),
    blocks,
  };

  if (surgeon.status === 'disputed') return procedure;

  const confirmedName = surgeon.lastVerifiedBy || surgeon.confirmedBy?.[0] || '';
  const confirmedAt = surgeon.lastVerifiedAt || surgeon.confirmedAt?.[0] || null;
  const hadConfirm = surgeon.status === 'verified' || surgeon.status === 'pending-cosign';
  if (hadConfirm && confirmedName && confirmedAt) {
    procedure.confirmations = [{ name: confirmedName, userId: null, at: confirmedAt }];
    procedure.lastConfirmedAt = confirmedAt;
  }
  return procedure;
}

/** @returns {import('./types').Surgeon} */
export function surgeonFromV0(surgeon) {
  return {
    id: surgeon.id || uid(),
    name: surgeon.name || '',
    specialty: surgeon.specialty || 'Other',
    facility: surgeon.facility || '',
    demo: Boolean(surgeon.demo) || String(surgeon.id || '').startsWith('demo-'),
    firstCase: Array.isArray(surgeon.firstCase) ? surgeon.firstCase : [],
    firstCaseAt: surgeon.firstCaseAt || null,
    firstCaseBy: surgeon.firstCaseBy || '',
    archived: Boolean(surgeon.archived),
    createdAt: surgeon.createdAt || new Date().toISOString(),
    addedBy: surgeon.addedBy || '',
  };
}

export function bookFromSurgeons(list) {
  const book = emptyBook();
  for (const surgeon of list || []) {
    const next = surgeonFromV0(surgeon);
    book.surgeons.push(next);
    book.procedures.push(procedureFromV0({ ...surgeon, id: next.id }));
  }
  return book;
}

export function upgradeV1(book) {
  return {
    version: BOOK_VERSION,
    surgeons: (book.surgeons || []).map(surgeon => ({
      ...surgeon,
      firstCase: Array.isArray(surgeon.firstCase) ? surgeon.firstCase : [],
      firstCaseAt: surgeon.firstCaseAt || null,
      firstCaseBy: surgeon.firstCaseBy || '',
      archived: Boolean(surgeon.archived),
    })),
    procedures: (book.procedures || []).map(procedure => ({
      ...procedure,
      approach: procedure.approach || '',
      blocks: normalizeBlocks(procedure.blocks),
    })),
  };
}

/** Idempotent. Arrays are legacy cards. Versioned books pass through. */
export function migrateBook(raw) {
  if (!raw) return emptyBook();
  if (Array.isArray(raw)) return bookFromSurgeons(raw);
  if (raw.version === BOOK_VERSION && Array.isArray(raw.surgeons) && Array.isArray(raw.procedures)) {
    return raw;
  }
  if (raw.version === 1 && Array.isArray(raw.surgeons) && Array.isArray(raw.procedures)) {
    return upgradeV1(raw);
  }
  if (Array.isArray(raw.surgeons) && !raw.version) return bookFromSurgeons(raw.surgeons);
  return emptyBook();
}

export function withoutConfirmation(book) {
  return {
    ...book,
    procedures: (book.procedures || []).map(stripConfirmation),
  };
}
