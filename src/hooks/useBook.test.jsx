// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { emptyBlocks } from '../data/schema';
import { loadHistory } from '../data/history';
import { useBook } from './useBook';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const withPosition = (procedure, text) => ({ ...procedure, blocks: { ...procedure.blocks, position: { ...procedure.blocks.position, text } } });

describe('useBook card history', () => {
  it('keeps the version an edit replaced and a deleted card, and brings an earlier version back unconfirmed', async () => {
    const { result } = renderHook(() => useBook());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    let surgeon;
    act(() => { surgeon = result.current.addSurgeon({ name: 'Dr. Amy Chen', specialty: 'Orthopedics' }); });
    const first = { ...result.current.newProcedure(surgeon.id), name: 'Right TKA', blocks: emptyBlocks() };
    act(() => result.current.saveProcedure(withPosition(first, 'Supine')));
    const saved = result.current.book.procedures.find(p => p.name === 'Right TKA');
    act(() => result.current.saveProcedure(withPosition(saved, 'Lateral')));

    await waitFor(async () => expect((await loadHistory()).cards[saved.id]?.length).toBe(1));
    const history = await loadHistory();
    expect(history.cards[saved.id][0]).toMatchObject({ reason: 'edit', surgeonName: 'Dr. Amy Chen' });
    expect(history.cards[saved.id][0].procedure.blocks.position.text).toBe('Supine');

    act(() => { result.current.confirmProcedure(saved.id, 'Alex'); });
    let brought;
    act(() => { brought = result.current.restoreVersion(saved.id, history.cards[saved.id][0]); });
    expect(brought).toBe(true);
    const back = result.current.book.procedures.find(p => p.id === saved.id);
    expect(back.blocks.position.text).toBe('Supine');
    expect(back.confirmations).toEqual([]);
    await waitFor(async () => expect((await loadHistory()).cards[saved.id][0].reason).toBe('earlier-version'));

    act(() => { result.current.deleteProcedure(saved.id); });
    await waitFor(async () => expect((await loadHistory()).deleted).toHaveLength(1));
    expect((await loadHistory()).deleted[0]).toMatchObject({ removedBy: 'edit', surgeon: { id: surgeon.id } });
  });
});
