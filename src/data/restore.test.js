import { describe, expect, it } from 'vitest';
import { emptyBlocks, emptyProcedure } from './schema';
import { importPreviewText, mergeBackup, parseImport, restoreBackup, restoreExtras, toBackup, toPlacePack } from './share';

const surgeon = (id, extra = {}) => ({ id, name: `Dr. ${id}`, specialty: 'Orthopedics', facility: 'Main', demo: false, createdAt: '2026-09-01T00:00:00.000Z', ...extra });
const procedure = (id, surgeonId, extra = {}) => emptyProcedure(surgeonId, {
  id,
  name: `Case ${id}`,
  blocks: emptyBlocks(),
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});
const confirmed = { confirmations: [{ name: 'Alex', userId: null, at: '2026-10-01T00:00:00.000Z' }], lastConfirmedAt: '2026-10-01T00:00:00.000Z' };

describe('full backup', () => {
  it('carries the board, activity, published unit books, and suggestions, and leaves empty extras out', () => {
    const book = { version: 2, surgeons: [surgeon('a')], procedures: [procedure('p', 'a')] };
    const extras = {
      today: { v: 2, items: [{ id: 't1', day: '2026-10-23', surgeonName: 'Dr. a' }] },
      log: [{ id: 'l1', action: 'Procedure saved', timestamp: '2026-10-01T00:00:00.000Z' }],
      published: { Main: { unitBookId: 'u1', revision: 3 } },
      suggestions: [{ id: 'g1', procedureId: 'p' }],
    };
    const backup = toBackup(book, extras);
    expect(backup.extras).toEqual(extras);
    expect(toBackup(book).extras).toBeUndefined();
    expect(toBackup(book, { today: { v: 2, items: [] }, log: [] }).extras).toBeUndefined();
  });

  it('reads a full backup as restorable and keeps the confirmed copy for restore only', () => {
    const book = { version: 2, surgeons: [surgeon('a')], procedures: [procedure('p', 'a', confirmed)] };
    const parsed = parseImport(JSON.stringify(toBackup(book, { log: [{ id: 'l1' }] })));
    expect(parsed.restorable).toBe(true);
    expect(parsed.full.procedures[0].confirmations).toHaveLength(1);
    expect(parsed.book.procedures[0].confirmations).toEqual([]);
    expect(parsed.extras.log).toEqual([{ id: 'l1' }]);
    expect(importPreviewText(parsed)).toMatch(/^Backup from .*: 1 surgeon, 1 procedure\.$/);
  });

  it('never treats a place hand-off as restorable', () => {
    const book = { version: 2, surgeons: [surgeon('a')], procedures: [procedure('p', 'a', confirmed)] };
    const parsed = parseImport(JSON.stringify(toPlacePack(book, 'Main', 'Alex')));
    expect(parsed.restorable).toBe(false);
    expect(parsed.full).toBeUndefined();
    expect(importPreviewText(parsed)).toMatch(/They arrive unconfirmed/);
  });
});

describe('restoreBackup', () => {
  it('restores confirmations onto an empty phone', () => {
    const result = restoreBackup({ surgeons: [], procedures: [] }, { surgeons: [surgeon('a')], procedures: [procedure('p', 'a', confirmed)] });
    expect(result.added).toBe(2);
    expect(result.book.procedures[0].confirmations).toHaveLength(1);
    expect(result.book.procedures[0].lastConfirmedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('replaces a card only when the backup copy is newer', () => {
    const current = {
      surgeons: [surgeon('a')],
      procedures: [
        procedure('old', 'a', { name: 'Phone copy', updatedAt: '2026-09-01T00:00:00.000Z' }),
        procedure('new', 'a', { name: 'Phone copy', updatedAt: '2026-10-20T00:00:00.000Z' }),
      ],
    };
    const incoming = {
      surgeons: [surgeon('a')],
      procedures: [
        procedure('old', 'a', { name: 'Backup copy', updatedAt: '2026-10-10T00:00:00.000Z' }),
        procedure('new', 'a', { name: 'Backup copy', updatedAt: '2026-10-10T00:00:00.000Z' }),
      ],
    };
    const result = restoreBackup(current, incoming);
    expect(result.book.procedures.find(p => p.id === 'old').name).toBe('Backup copy');
    expect(result.book.procedures.find(p => p.id === 'new').name).toBe('Phone copy');
    expect(result.updated).toBe(1);
    expect(result.kept).toBe(2);
  });

  it('updates a surgeon renamed after the phone copy', () => {
    const current = { surgeons: [surgeon('a', { name: 'Dr. Old' })], procedures: [] };
    const incoming = { surgeons: [surgeon('a', { name: 'Dr. New', updatedAt: '2026-10-01T00:00:00.000Z' })], procedures: [] };
    expect(restoreBackup(current, incoming).book.surgeons[0].name).toBe('Dr. New');
  });

  it('skips samples and cards whose surgeon is missing', () => {
    const result = restoreBackup({ surgeons: [], procedures: [] }, {
      surgeons: [surgeon('demo-1', { demo: true })],
      procedures: [procedure('p', 'ghost')],
    });
    expect(result.book.surgeons).toEqual([]);
    expect(result.book.procedures).toEqual([]);
  });

  it('differs from adding someone else’s notes, which never updates and never confirms', () => {
    const current = { surgeons: [surgeon('a')], procedures: [procedure('p', 'a')] };
    const incoming = { surgeons: [surgeon('a')], procedures: [procedure('p', 'a', { ...confirmed, updatedAt: '2026-10-10T00:00:00.000Z' }), procedure('q', 'a', confirmed)] };
    const merged = mergeBackup(current, incoming);
    expect(merged.book.procedures.find(p => p.id === 'p').updatedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(merged.book.procedures.find(p => p.id === 'q').confirmations).toEqual([]);
  });
});

describe('restoreExtras', () => {
  it('keeps the higher published revision, joins the board and log by id, and drops past days', () => {
    const merged = restoreExtras(
      {
        published: { Main: { revision: 4, unitBookId: 'u1' }, East: { revision: 1 } },
        today: { v: 2, items: [{ id: 't1', day: '2026-10-23' }] },
        log: [{ id: 'l2', timestamp: '2026-10-02T00:00:00.000Z' }],
        suggestions: [{ id: 'g1' }],
      },
      {
        published: { Main: { revision: 3, unitBookId: 'u1' }, East: { revision: 2 }, West: { revision: 1 } },
        today: { v: 2, items: [{ id: 't1', day: '2026-10-23' }, { id: 't2', day: '2026-10-24' }, { id: 't0', day: '2026-10-01' }] },
        log: [{ id: 'l1', timestamp: '2026-10-01T00:00:00.000Z' }, { id: 'l3', timestamp: '2026-10-03T00:00:00.000Z' }],
        suggestions: [{ id: 'g1' }, { id: 'g2' }],
      },
      { today: '2026-10-23', maxLog: 2 },
    );
    expect(merged.published.Main.revision).toBe(4);
    expect(merged.published.East.revision).toBe(2);
    expect(merged.published.West.revision).toBe(1);
    expect(merged.today.items.map(item => item.id).sort()).toEqual(['t1', 't2']);
    expect(merged.log.map(entry => entry.id)).toEqual(['l3', 'l2']);
    expect(merged.suggestions.map(item => item.id).sort()).toEqual(['g1', 'g2']);
  });
});
