import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { emptyBlocks, emptyProcedure } from './schema';
import {
  DELETED_KEEP_DAYS, VERSIONS_PER_CARD, cardVersions, cleanHistory, deletedToRestore, emptyHistory, forgetCard,
  loadHistory, recordBookChange, recordChanges, replacedText, withEarlierContent,
} from './history';

const surgeon = { id: 's', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
const card = (overrides = {}) => emptyProcedure('s', { id: 'p', name: 'Right TKA', blocks: emptyBlocks(), updatedAt: '2026-10-01T12:00:00.000Z', ...overrides });
const withPosition = (procedure, text) => ({ ...procedure, blocks: { ...procedure.blocks, position: { ...procedure.blocks.position, text } } });
const book = (...procedures) => ({ version: 2, surgeons: [surgeon], procedures });

describe('recordChanges', () => {
  it('keeps the version an edit replaced, and nothing for a confirmation', () => {
    const before = card();
    const edited = withPosition(before, 'Supine, bump under the hip');
    let { history, changed } = recordChanges(emptyHistory(), book(before), book(edited), { at: '2026-10-02T00:00:00.000Z' });
    expect(changed).toBe(true);
    expect(history.cards.p).toHaveLength(1);
    expect(history.cards.p[0]).toMatchObject({ reason: 'edit', surgeonName: 'Dr. Amy Chen', savedAt: '2026-10-01T12:00:00.000Z', replacedAt: '2026-10-02T00:00:00.000Z' });
    expect(history.cards.p[0].procedure.blocks.position.text).toBe('');

    const confirmed = { ...edited, confirmations: [{ name: 'Alex', at: '2026-10-03T00:00:00.000Z' }], lastConfirmedAt: '2026-10-03T00:00:00.000Z' };
    ({ history, changed } = recordChanges(history, book(edited), book(confirmed)));
    expect(changed).toBe(false);
    expect(history.cards.p).toHaveLength(1);
  });

  it(`keeps only the last ${VERSIONS_PER_CARD} versions of a card`, () => {
    let history = emptyHistory();
    let current = card();
    for (let i = 1; i <= VERSIONS_PER_CARD + 3; i += 1) {
      const next = withPosition(current, `Version ${i}`);
      ({ history } = recordChanges(history, book(current), book(next)));
      current = next;
    }
    expect(history.cards.p).toHaveLength(VERSIONS_PER_CARD);
    expect(history.cards.p[0].procedure.blocks.position.text).toBe(`Version ${VERSIONS_PER_CARD + 2}`);
    expect(history.cards.p.at(-1).procedure.blocks.position.text).toBe('Version 3');
  });

  it('names the unit book revision that replaced a unit card', () => {
    const before = card({ unitBook: { id: 'u', revision: 3 } });
    const after = withPosition({ ...before, unitBook: { id: 'u', revision: 4 } }, 'Lateral');
    const { history } = recordChanges(emptyHistory(), book(before), book(after), { reason: 'unit-book' });
    expect(history.cards.p[0]).toMatchObject({ reason: 'unit-book', revision: 4 });
    expect(replacedText(history.cards.p[0])).toBe('unit book revision 4');
  });

  it('keeps a deleted card with its surgeon, drops it when it comes back, and forgets it after the keep window', () => {
    const before = card();
    let { history } = recordChanges(emptyHistory(), book(before), { version: 2, surgeons: [], procedures: [] }, { at: '2026-10-02T00:00:00.000Z' });
    expect(history.deleted).toHaveLength(1);
    expect(history.deleted[0]).toMatchObject({ reason: 'deleted', removedBy: 'edit', surgeon: { id: 's' } });

    ({ history } = recordChanges(history, { version: 2, surgeons: [], procedures: [] }, book(before)));
    expect(history.deleted).toHaveLength(0);

    ({ history } = recordChanges(emptyHistory(), book(before), book(), { at: '2026-10-02T00:00:00.000Z' }));
    const later = new Date(Date.parse('2026-10-02T00:00:00.000Z') + (DELETED_KEEP_DAYS + 1) * 86400000).toISOString();
    ({ history } = recordChanges(history, book(), book(), { at: later }));
    expect(history.deleted).toHaveLength(0);
  });

  it('keeps nothing of a deleted place, including cards deleted from it before', () => {
    const other = { ...surgeon, id: 't', name: 'Dr. Bo Park', facility: 'North' };
    const a = card();
    const b = card({ id: 'q', name: 'Left TKA' });
    const c = card({ id: 'r', surgeonId: 't', name: 'Hip' });
    const full = { version: 2, surgeons: [surgeon, other], procedures: [a, b, c] };
    let { history } = recordChanges(emptyHistory(), full, { ...full, procedures: [withPosition(a, 'x'), c] });
    expect(history.deleted).toHaveLength(1);
    expect(history.cards.p).toHaveLength(1);
    ({ history } = recordChanges(history, { ...full, procedures: [withPosition(a, 'x'), c] }, { version: 2, surgeons: [other], procedures: [c] }, { reason: 'delete-place' }));
    expect(history).toEqual(emptyHistory());
  });

  it('keeps no sample cards', () => {
    const sample = card({ demo: true });
    const { changed } = recordChanges(emptyHistory(), book(sample), book(withPosition(sample, 'x')));
    expect(changed).toBe(false);
  });
});

describe('reading and using versions', () => {
  it('lists versions newest first with what the next version changed', () => {
    const v1 = card();
    const v2 = withPosition(v1, 'Supine');
    const v3 = { ...v2, name: 'Right TKA, robotic' };
    let { history } = recordChanges(emptyHistory(), book(v1), book(v2));
    ({ history } = recordChanges(history, book(v2), book(v3)));
    const versions = cardVersions(history, v3);
    expect(versions.map(version => version.changes)).toEqual([['Name'], ['Position']]);
  });

  it('brings back earlier content unconfirmed, and never on a unit book card', () => {
    const old = card({ name: 'Old name' });
    const current = { ...withPosition(card(), 'New'), confirmations: [{ name: 'Alex', at: '2026-10-03T00:00:00.000Z' }], lastConfirmedAt: '2026-10-03T00:00:00.000Z' };
    const back = withEarlierContent(current, { procedure: old });
    expect(back.name).toBe('Old name');
    expect(back.blocks.position.text).toBe('');
    expect(back.confirmations).toEqual([]);
    expect(withEarlierContent({ ...current, unitBook: { id: 'u', revision: 2 } }, { procedure: old })).toBeNull();
  });

  it('brings a card a unit book removed back as the person’s own unconfirmed notes, with its surgeon', () => {
    const unitSurgeon = { ...surgeon, unitBook: { id: 'u', revision: 2 } };
    const removed = { ...card({ unitBook: { id: 'u', revision: 2 } }), confirmations: [{ name: 'Alex', at: '2026-10-03T00:00:00.000Z' }] };
    const restore = deletedToRestore({ version: 2, surgeons: [], procedures: [] }, { procedure: removed, surgeon: unitSurgeon });
    expect(restore.procedures[0].unitBook).toBeUndefined();
    expect(restore.procedures[0].confirmations).toEqual([]);
    expect(restore.surgeons[0].unitBook).toBeUndefined();
    expect(deletedToRestore(book(), { procedure: card(), surgeon }).surgeons).toEqual([]);
  });

  it('forgets one card’s history and ignores a damaged store', () => {
    const { history } = recordChanges(emptyHistory(), book(card()), book(withPosition(card(), 'x')));
    expect(forgetCard(history, 'p').cards.p).toBeUndefined();
    expect(cleanHistory('nonsense')).toEqual(emptyHistory());
    expect(cleanHistory({ v: 1, cards: { p: [{ procedure: { id: 'other' } }] }, deleted: [null] })).toEqual(emptyHistory());
  });
});

describe('stored history', () => {
  it('saves each change in order in IndexedDB', async () => {
    const v1 = card();
    const v2 = withPosition(v1, 'One');
    const v3 = withPosition(v2, 'Two');
    await Promise.all([recordBookChange(book(v1), book(v2)), recordBookChange(book(v2), book(v3))]);
    const stored = await loadHistory();
    expect(stored.cards.p.map(version => version.procedure.blocks.position.text)).toEqual(['One', '']);
  });
});
