// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { AUDIT_KEY } from '../data/schema';
import { useAuditLog } from './useAuditLog';
import { useStoredState } from './useStoredState';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const KEY = 'scrubplaybook_test_list';
const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = (value) => localStorage.setItem(KEY, JSON.stringify(value));

describe('useStoredState', () => {
  it('applies a change to what is stored now, not to this tab’s copy', () => {
    const { result } = renderHook(() => useStoredState(KEY, load, save));
    expect(result.current[0]).toEqual([]);
    save(['from the other tab']);
    act(() => { result.current[1](list => [...list, 'from this tab']); });
    expect(result.current[0]).toEqual(['from the other tab', 'from this tab']);
    expect(load()).toEqual(['from the other tab', 'from this tab']);
  });

  it('picks up another tab’s write from the storage event', () => {
    const { result } = renderHook(() => useStoredState(KEY, load, save));
    save(['written elsewhere']);
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: KEY })); });
    expect(result.current[0]).toEqual(['written elsewhere']);
  });

  it('ignores storage events for other keys and reloads when storage is cleared', () => {
    const { result } = renderHook(() => useStoredState(KEY, load, save));
    save(['changed']);
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'scrubplaybook_other' })); });
    expect(result.current[0]).toEqual([]);
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: null })); });
    expect(result.current[0]).toEqual(['changed']);
  });
});

describe('useAuditLog in two tabs', () => {
  it('keeps both tabs’ entries', () => {
    const one = renderHook(() => useAuditLog());
    const two = renderHook(() => useAuditLog());
    act(() => { one.result.current.addEntry({ action: 'Procedure saved', surgeonName: 'Dr. Chen' }); });
    act(() => { two.result.current.addEntry({ action: 'Case confirmed', surgeonName: 'Dr. Patel' }); });
    const stored = JSON.parse(localStorage.getItem(AUDIT_KEY));
    expect(stored.map(entry => entry.action)).toEqual(['Case confirmed', 'Procedure saved']);
  });

  it('merges a restored log without duplicates, newest first, and drops junk entries', () => {
    localStorage.setItem(AUDIT_KEY, JSON.stringify([{ id: 'b', action: 'Here', timestamp: '2026-02-01T00:00:00Z' }, null, 'x']));
    const { result } = renderHook(() => useAuditLog());
    expect(result.current.log).toHaveLength(1);
    act(() => {
      result.current.mergeLog([
        { id: 'a', action: 'Older', timestamp: '2026-01-01T00:00:00Z' },
        { id: 'b', action: 'Here again', timestamp: '2026-02-01T00:00:00Z' },
        { id: 'c', action: 'Newer', timestamp: '2026-03-01T00:00:00Z' },
      ]);
    });
    expect(result.current.log.map(entry => entry.id)).toEqual(['c', 'b', 'a']);
    expect(result.current.log[1].action).toBe('Here');
  });
});
