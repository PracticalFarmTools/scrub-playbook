// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { PUBLISHED_KEY } from '../data/schema';
import { readPublished, savePublished } from '../data/unitBook';
import { useStoredState } from './useStoredState';
import { useBackup } from './useBackup';

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  localStorage.clear();
});

const entry = { unitBookId: 'u1', revision: 3, publicKey: { kty: 'EC' }, privateKey: { kty: 'EC', d: 'secret' }, fingerprint: 'AB12' };

function phone() {
  const setNotice = vi.fn();
  const view = renderHook(() => {
    const [published, updatePublished] = useStoredState(PUBLISHED_KEY, readPublished, savePublished);
    const backup = useBackup({
      book: { surgeons: [], procedures: [] },
      bookApi: { restoreOwnBackup: () => ({ added: 0, updated: 0, kept: 0 }) },
      auditLog: [],
      addAudit: vi.fn(),
      mergeLog: vi.fn(),
      suggestions: [],
      updateSuggestions: vi.fn(() => true),
      updatePublished,
      setNotice,
      onBoardRestored: vi.fn(),
    });
    return { published, backup };
  });
  return { view, setNotice };
}

const backupFile = { full: { surgeons: [], procedures: [] }, extras: { published: { Main: entry } } };

describe('useBackup restore', () => {
  it('says this phone publishes again once the key is saved', () => {
    const { view, setNotice } = phone();
    act(() => { view.result.current.backup.restore(backupFile); });
    expect(readPublished().Main).toEqual(entry);
    expect(setNotice.mock.calls[0][0]).toContain('This phone publishes Main again.');
  });

  it('says publishing did not come back when the phone cannot save the key', () => {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === PUBLISHED_KEY) throw new DOMException('full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    });
    const { view, setNotice } = phone();
    act(() => { view.result.current.backup.restore(backupFile); });
    expect(readPublished()).toEqual({});
    expect(view.result.current.published).toEqual({});
    const notice = setNotice.mock.calls[0][0];
    expect(notice).toContain('Publishing for Main did not come back');
    expect(notice).not.toContain('publishes Main again');
  });
});
