// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { emptyProcedure } from '../data/schema';
import { HANDOVER_KIND, readHandedOver, readPublished } from '../data/unitBook';
import { usePublishing } from './usePublishing';

const shared = vi.hoisted(() => ({ files: [], outcome: 'saved' }));

vi.mock('../utils/download', async (importOriginal) => ({
  ...(await importOriginal()),
  shareFile: async (filename, data) => {
    shared.files.push({ filename, data });
    return shared.outcome;
  },
}));

afterEach(() => {
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
});
