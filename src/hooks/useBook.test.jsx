// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { emptyBlocks } from '../data/schema';
import { loadHistory } from '../data/history';
import { checkTrail } from '../data/editTrail';
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

describe('useBook signed changes', () => {
  const cardOf = (result, id) => result.current.book.procedures.find(p => p.id === id);

  it('signs a new card and each change to it under the name given, and nothing for a confirmation', async () => {
    const { result, unmount } = renderHook(() => useBook());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let surgeon;
    act(() => { surgeon = result.current.addSurgeon({ name: 'Dr. Lee Park', specialty: 'General Surgery' }); });
    const first = { ...result.current.newProcedure(surgeon.id), name: 'Lap chole', blocks: emptyBlocks() };
    act(() => result.current.saveProcedure(withPosition(first, 'Supine'), { by: 'Alex Rivera' }));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(1));
    expect(cardOf(result, first.id).trail[0]).toMatchObject({ by: 'Alex Rivera', action: 'created', prev: null });

    act(() => result.current.saveProcedure(withPosition(cardOf(result, first.id), 'Supine, arms tucked'), { by: 'Jordan Ames' }));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(2));
    expect(cardOf(result, first.id).trail[1]).toMatchObject({ by: 'Jordan Ames', action: 'edited' });

    act(() => result.current.saveProcedure(cardOf(result, first.id), { by: 'Jordan Ames' }));
    act(() => { result.current.confirmProcedure(first.id, 'Sam'); });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(cardOf(result, first.id).trail).toHaveLength(2);
    const check = await checkTrail(cardOf(result, first.id));
    expect(check.status).toBe('signed');
    expect(check.entries.map(item => item.entry.by)).toEqual(['Jordan Ames', 'Alex Rivera']);
    expect(check.entries.every(item => item.mine)).toBe(true);

    await waitFor(async () => expect((await loadHistory()).cards[first.id]?.length).toBe(1));
    unmount();
    const reopened = renderHook(() => useBook());
    await waitFor(() => expect(reopened.result.current.loaded).toBe(true));
    expect((await checkTrail(cardOf(reopened.result, first.id))).status).toBe('signed');
  });

  it('keeps the stored records when an editor saves a copy opened before the last one', async () => {
    const { result } = renderHook(() => useBook());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let surgeon;
    act(() => { surgeon = result.current.addSurgeon({ name: 'Dr. Ines Ortiz', specialty: 'Orthopedics' }); });
    const first = { ...result.current.newProcedure(surgeon.id), name: 'Left THA', blocks: emptyBlocks() };
    act(() => result.current.saveProcedure(first, { by: 'Alex' }));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(1));
    act(() => result.current.saveProcedure(withPosition(first, 'Lateral'), { by: 'Alex' }));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(2));
    expect((await checkTrail(cardOf(result, first.id))).status).toBe('signed');
  });

  it('signs bringing back an earlier version, and does not sign an imported card', async () => {
    const { result } = renderHook(() => useBook());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let surgeon;
    act(() => { surgeon = result.current.addSurgeon({ name: 'Dr. Ravi Shah', specialty: 'Orthopedics', addedBy: 'Casey Lin' }); });
    const first = { ...result.current.newProcedure(surgeon.id), name: 'Right TKA', blocks: emptyBlocks() };
    act(() => result.current.saveProcedure(withPosition(first, 'Supine')));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(1));
    expect(cardOf(result, first.id).trail[0].by).toBe('Casey Lin');
    act(() => result.current.saveProcedure(withPosition(cardOf(result, first.id), 'Lateral')));
    await waitFor(async () => expect((await loadHistory()).cards[first.id]?.length).toBe(1));
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(2));
    const history = await loadHistory();
    act(() => { result.current.restoreVersion(first.id, history.cards[first.id][0]); });
    await waitFor(() => expect(cardOf(result, first.id).trail).toHaveLength(3));
    expect(cardOf(result, first.id).trail[2]).toMatchObject({ action: 'earlier-version', by: 'Casey Lin' });
    expect((await checkTrail(cardOf(result, first.id))).status).toBe('signed');

    const incoming = {
      version: 2,
      surgeons: [{ id: 'other', name: 'Dr. Noor Haddad', specialty: 'Urology', facility: '' }],
      procedures: [{ ...result.current.newProcedure('other'), id: 'incoming-card', name: 'Cysto', blocks: emptyBlocks() }],
    };
    act(() => { result.current.importIncoming(incoming); });
    await new Promise(resolve => setTimeout(resolve, 50));
    const imported = result.current.book.procedures.find(p => p.name === 'Cysto');
    expect(imported).toBeTruthy();
    expect(imported.trail).toBeUndefined();
  });
});
