// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { HANDED_OVER_KEY, PUBLISHED_KEY, emptyProcedure } from '../data/schema';
import { HANDOVER_KIND, readHandedOver, readPublished } from '../data/unitBook';
import { CANNOT_SAVE, usePublishing } from './usePublishing';

const shared = vi.hoisted(() => ({ files: [], outcome: 'saved' }));

vi.mock('../utils/download', async (importOriginal) => ({
  ...(await importOriginal()),
  shareFile: async (filename, data) => {
    shared.files.push({ filename, data });
    return shared.outcome;
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  localStorage.clear();
  shared.files = [];
  shared.outcome = 'saved';
});

const surgeon = { id: 'a', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
const book = { surgeons: [surgeon], procedures: [emptyProcedure('a', { id: 'p', name: 'Right TKA' })] };

function tab() {
  return renderHook(() => usePublishing({ book, addAudit: vi.fn(), setNotice: vi.fn() }));
}

/** The phone refuses writes to these keys, as a full or private-browsing store does. */
function refuseWrites(...keys) {
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (keys.includes(key)) throw new DOMException('full', 'QuotaExceededError');
    return setItem.call(this, key, value);
  });
}

describe('usePublishing in two tabs', () => {
  it('continues one unit book under one key when the second tab publishes', async () => {
    const one = tab();
    const two = tab();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    const first = readPublished().Main;
    expect(two.result.current.published.Main).toBeUndefined();
    let message;
    await act(async () => { ({ message } = await two.result.current.publishPlace('Main')); });
    const second = readPublished().Main;
    expect(message).toContain('revision 2');
    expect(second.unitBookId).toBe(first.unitBookId);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(shared.files.map(file => file.data.revision)).toEqual([1, 2]);
    expect(shared.files[1].filename).toBe('scrubplaybook-unit-main-r2.json');
  });

  it('keeps unit rules another tab saved while this tab published', async () => {
    const one = tab();
    const two = tab();
    act(() => { two.result.current.saveUnitSettings('Main', { staleDays: 30, dictation: false, twoPerson: true }); });
    await act(async () => { await one.result.current.publishPlace('Main'); });
    expect(readPublished().Main.settings).toEqual({ staleDays: 30, dictation: false, twoPerson: true });
    expect(shared.files[0].data.settings).toEqual({ staleDays: 30, dictation: false, twoPerson: true });
  });

  it('stores nothing when the share sheet is cancelled', async () => {
    shared.outcome = 'cancelled';
    const one = tab();
    let message;
    await act(async () => { ({ message } = await one.result.current.publishPlace('Main')); });
    expect(message).toBe('Main was not published. The next file is still revision 1.');
    expect(readPublished()).toEqual({});
  });

  it('hands over from the stored entry and records it', async () => {
    const one = tab();
    const two = tab();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    const { unitBookId } = readPublished().Main;
    await act(async () => { await two.result.current.handOverPlace('Main'); });
    expect(readPublished().Main).toBeUndefined();
    expect(readHandedOver().Main).toMatchObject({ unitBookId, revision: 2 });
    expect(shared.files[1].data.kind).toBe(HANDOVER_KIND);
  });

  it('keeps unit rules saved before a publish that is cancelled', async () => {
    const one = tab();
    act(() => { one.result.current.saveUnitSettings('Main', { staleDays: 30, dictation: false, twoPerson: true }); });
    shared.outcome = 'cancelled';
    await act(async () => { await one.result.current.publishPlace('Main'); });
    expect(readPublished()).toEqual({ Main: { settings: { staleDays: 30, dictation: false, twoPerson: true } } });
    expect(one.result.current.published).toEqual(readPublished());
  });
});

describe('usePublishing when the phone cannot save', () => {
  it('sends no first file it could not record, so no key is lost', async () => {
    refuseWrites(PUBLISHED_KEY);
    const one = tab();
    let message;
    await act(async () => { ({ message } = await one.result.current.publishPlace('Main')); });
    expect(message).toBe(`Main was not published. ${CANNOT_SAVE}`);
    expect(shared.files).toEqual([]);
    expect(readPublished()).toEqual({});
    expect(one.result.current.published).toEqual({});
  });

  it('sends no later revision it could not record, so staff never get a repeated revision', async () => {
    const one = tab();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    const first = readPublished().Main;
    refuseWrites(PUBLISHED_KEY);
    await act(async () => { await one.result.current.publishPlace('Main'); });
    expect(shared.files.map(file => file.data.revision)).toEqual([1]);
    expect(readPublished().Main).toEqual(first);
    expect(one.result.current.published.Main).toEqual(first);
    vi.restoreAllMocks();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    expect(shared.files.map(file => file.data.revision)).toEqual([1, 2]);
    expect(shared.files[1].data.publicKey).toEqual(shared.files[0].data.publicKey);
  });

  it('warns not to publish again when a sent hand-over could not be recorded', async () => {
    const one = tab();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    refuseWrites(PUBLISHED_KEY, HANDED_OVER_KEY);
    let message;
    await act(async () => { ({ message } = await one.result.current.handOverPlace('Main')); });
    expect(shared.files[1].data.kind).toBe(HANDOVER_KIND);
    expect(message).toContain('could not save that it handed over');
    expect(message).toContain('Do not publish Main from this phone again.');
  });

  it('does not claim a replaced key it could not save', async () => {
    const one = tab();
    await act(async () => { await one.result.current.publishPlace('Main'); });
    const first = readPublished().Main;
    refuseWrites(PUBLISHED_KEY);
    let message;
    await act(async () => { ({ message } = await one.result.current.replaceKey('Main')); });
    expect(message).toBe(`The key for Main was not replaced. ${CANNOT_SAVE}`);
    expect(readPublished().Main).toEqual(first);
    expect(one.result.current.published.Main).toEqual(first);
  });
});
