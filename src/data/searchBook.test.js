import { describe, expect, it } from 'vitest';
import { filterBook, sortSurgeons } from './searchBook';
import { emptyProcedure } from './schema';

const surgeons = [
  { id: 'a', name: 'Dr. Zoe Adams', demo: false },
  { id: 'b', name: 'Dr. Amy Chen', demo: false },
  { id: 'c', name: 'Baker, Tom', demo: false },
  { id: 's', name: 'Dr. Sample', demo: true },
];
const procedures = [
  { ...emptyProcedure('a', { name: 'Knee' }), updatedAt: '2026-10-01T00:00:00.000Z' },
  { ...emptyProcedure('b', { name: 'Hip' }), updatedAt: '2026-10-20T00:00:00.000Z' },
  { ...emptyProcedure('c', { name: 'Hand', aliases: ['CTR'] }), updatedAt: '2026-10-10T00:00:00.000Z' },
];

describe('home list order', () => {
  it('sorts by last name, recent change, or what needs attention, with samples last', () => {
    const status = { a: 'confirmed', b: 'stale', c: 'disputed', s: 'disputed' };
    expect(sortSurgeons(surgeons, procedures, 'name').map(s => s.id)).toEqual(['a', 'c', 'b', 's']);
    expect(sortSurgeons(surgeons, procedures, 'recent').map(s => s.id)).toEqual(['b', 'c', 'a', 's']);
    expect(sortSurgeons(surgeons, procedures, 'attention', s => status[s.id]).map(s => s.id)).toEqual(['c', 'b', 'a', 's']);
  });

  it('finds a surgeon with no procedures by name, and a card by its board name', () => {
    const book = { surgeons: [...surgeons, { id: 'n', name: 'Dr. New Person', demo: false }], procedures };
    expect(filterBook(book, 'new person').surgeons.map(s => s.id)).toEqual(['n']);
    expect(filterBook(book, 'ctr').procedures.map(p => p.surgeonId)).toEqual(['c']);
  });
});
