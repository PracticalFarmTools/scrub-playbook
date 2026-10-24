// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openChannel, readValue, resetStoreForTests, storageWhere, writeValue } from './store';
import { isQuotaError, safeGet, safeJson, safeSet } from './storage';
import { BOOK_KEY, LEGACY_STORAGE_KEY } from './schema';
import { UNREADABLE_KEY, loadStoredBook } from '../hooks/useBook';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('book store', () => {
  it('writes to IndexedDB and reads the value back', async () => {
    const result = await writeValue('k', { a: 1 });
    expect(result).toEqual({ ok: true, where: 'indexeddb' });
    expect(await readValue('k')).toEqual({ a: 1 });
    expect(await storageWhere()).toBe('indexeddb');
  });

  it('reads a book saved before IndexedDB and frees the old copy after the next write', async () => {
    localStorage.setItem('k', JSON.stringify({ old: true }));
    expect(await readValue('k')).toEqual({ old: true });
    await writeValue('k', { old: false });
    expect(localStorage.getItem('k')).toBeNull();
    expect(await readValue('k')).toEqual({ old: false });
  });

  it('falls back to localStorage when IndexedDB is missing', async () => {
    globalThis.indexedDB = undefined;
    resetStoreForTests();
    const result = await writeValue('k', [1, 2]);
    expect(result).toEqual({ ok: true, where: 'local' });
    expect(await readValue('k')).toEqual([1, 2]);
    expect(await storageWhere()).toBe('local');
  });

  it('reports a full phone instead of throwing', async () => {
    globalThis.indexedDB = undefined;
    resetStoreForTests();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(await writeValue('k', { big: true })).toEqual({ ok: false, reason: 'full' });
    expect(safeSet('x', '1')).toBe(false);
  });

  it('reports a blocked store when the browser refuses for another reason', async () => {
    globalThis.indexedDB = undefined;
    resetStoreForTests();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError');
    });
    expect(await writeValue('k', 1)).toEqual({ ok: false, reason: 'blocked' });
  });

  it('safe helpers never throw on unreadable values', () => {
    localStorage.setItem('bad', '{not json');
    expect(safeJson('bad', 'fallback')).toBe('fallback');
    expect(safeGet('missing', 'x')).toBe('x');
    expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError(new Error('other'))).toBe(false);
  });

  it('tells another tab when the book changed', async () => {
    const seen = [];
    const a = openChannel(() => {});
    const b = openChannel(key => seen.push(key));
    a.post(BOOK_KEY);
    await new Promise(resolve => setTimeout(resolve, 20));
    a.close();
    b.close();
    expect(seen).toEqual([BOOK_KEY]);
  });

  it('does not hear its own messages', async () => {
    const seen = [];
    const a = openChannel(key => seen.push(key));
    a.post(BOOK_KEY);
    await new Promise(resolve => setTimeout(resolve, 20));
    a.close();
    expect(seen).toEqual([]);
  });
});

describe('loading the saved book', () => {
  it('opens an empty book on a new phone', async () => {
    const result = await loadStoredBook();
    expect(result.unreadable).toBe(false);
    expect(result.book.surgeons).toEqual([]);
  });

  it('opens a book saved in IndexedDB', async () => {
    await writeValue(BOOK_KEY, { version: 2, surgeons: [{ id: 's1', name: 'Dr. A' }], procedures: [] });
    const result = await loadStoredBook();
    expect(result.book.surgeons.map(s => s.id)).toEqual(['s1']);
  });

  it('upgrades the oldest card list', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'old', name: 'Dr. Old', sutures: [] }]));
    const result = await loadStoredBook();
    expect(result.legacy).toBe(true);
    expect(result.book.surgeons[0].name).toBe('Dr. Old');
  });

  it('keeps an unreadable book instead of replacing it with an empty one', async () => {
    localStorage.setItem(BOOK_KEY, '{"version":2,"surgeons":[');
    const result = await loadStoredBook();
    expect(result.unreadable).toBe(true);
    expect(localStorage.getItem(UNREADABLE_KEY)).toBe('{"version":2,"surgeons":[');
  });
});
