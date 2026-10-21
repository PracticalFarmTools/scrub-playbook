/** Versioned personal book. Procedures live under surgeons. */

export const BOOK_VERSION = 2;
export const BOOK_KEY = 'scrubplaybook_book';
export const LEGACY_STORAGE_KEY = 'scrubplaybook_surgeons';
export const TECH_NAME_KEY = 'scrubplaybook_tech_name';
export const TODAY_KEY = 'scrubplaybook_today';

export const STALE_AFTER_DAYS = 90;
export const LINK_FRESH_DAYS = 180;
export const QR_MAX_CHARS = 1000;

export const CARD_STATUS = {
  UNCONFIRMED: 'unconfirmed',
  NOTED: 'noted',
  CONFIRMED: 'confirmed',
  STALE: 'stale',
  DISPUTED: 'disputed',
};

export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function emptyText() {
  return { text: '', source: 'observed', updatedBy: '', updatedAt: null };
}

export function textBlock(text, user) {
  return {
    text: text || '',
    source: 'observed',
    updatedBy: user || '',
    updatedAt: text ? new Date().toISOString() : null,
  };
}

export function emptyBlocks() {
  return {
    position: emptyText(),
    prep: emptyText(),
    drapes: emptyText(),
    room: emptyText(),
    equipment: emptyText(),
    steps: [],
    instruments: [],
    trays: [],
    implants: [],
    sutures: [],
    gloves: { outer: null, inner: null },
    nicknames: [],
    endOfCase: emptyText(),
    people: [],
    note: emptyText(),
  };
}

export function normalizeBlocks(blocks = {}) {
  const base = emptyBlocks();
  return {
    ...base,
    ...blocks,
    position: { ...base.position, ...(blocks.position || {}) },
    prep: { ...base.prep, ...(blocks.prep || {}) },
    drapes: { ...base.drapes, ...(blocks.drapes || {}) },
    room: { ...base.room, ...(blocks.room || {}) },
    equipment: { ...base.equipment, ...(blocks.equipment || {}) },
    endOfCase: { ...base.endOfCase, ...(blocks.endOfCase || {}) },
    note: { ...base.note, ...(blocks.note || {}) },
    gloves: { outer: null, inner: null, ...(blocks.gloves || {}) },
    steps: blocks.steps || [],
    instruments: blocks.instruments || [],
    trays: blocks.trays || [],
    implants: blocks.implants || [],
    sutures: blocks.sutures || [],
    nicknames: blocks.nicknames || [],
    people: blocks.people || [],
  };
}

export function emptyBook() {
  return { version: BOOK_VERSION, surgeons: [], procedures: [] };
}

export function emptySurgeon(partial = {}) {
  return {
    id: uid(),
    name: '',
    specialty: 'General Surgery',
    facility: '',
    demo: false,
    createdAt: new Date().toISOString(),
    addedBy: '',
    firstCase: [],
    firstCaseAt: null,
    firstCaseBy: '',
    archived: false,
    ...partial,
  };
}

export function emptyProcedure(surgeonId, partial = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    surgeonId,
    name: 'All cases (imported)',
    approach: '',
    demo: false,
    disputed: false,
    reported: false,
    reportNote: '',
    lastConfirmedAt: null,
    confirmations: [],
    official: { label: '', reviewedAt: null, note: '' },
    updatedAt: now,
    baseUpdatedAt: now,
    blocks: emptyBlocks(),
    ...partial,
  };
}

export function cleanSteps(steps = []) {
  return steps
    .filter(step => step?.title?.trim())
    .slice(0, 30)
    .map(step => ({
      id: step.id,
      title: step.title.trim().slice(0, 80),
      ready: (step.ready || '').trim().slice(0, 200),
      habit: (step.habit || '').trim().slice(0, 200),
    }));
}

export function cleanInstruments(items = []) {
  return items
    .filter(item => item?.name?.trim())
    .slice(0, 60)
    .map(item => ({
      id: item.id,
      name: item.name.trim().slice(0, 80),
      from: (item.from || '').trim().slice(0, 80),
      mayo: Boolean(item.mayo),
    }));
}

export function gloveChoice({ productId = null, model = '', brand = '', color = '', size = '7.0' } = {}) {
  if (!model && !productId) return null;
  return { productId, model, brand, color, size };
}
