// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { emptyBlocks, emptyProcedure } from '../data/schema';
import { emptyHistory, recordChanges } from '../data/history';
import { addSignedEdit } from '../data/editTrail';
import CardHistorySheet from './CardHistorySheet';
import DeletedCardsSheet from './DeletedCardsSheet';

afterEach(cleanup);

const surgeon = { id: 's', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
const card = (overrides = {}) => emptyProcedure('s', { id: 'p', name: 'Right TKA', blocks: emptyBlocks(), updatedAt: '2026-10-01T12:00:00.000Z', ...overrides });
const withPosition = (procedure, text) => ({ ...procedure, blocks: { ...procedure.blocks, position: { ...procedure.blocks.position, text } } });
const book = (...procedures) => ({ version: 2, surgeons: [surgeon], procedures });

function twoEdits() {
  const v1 = withPosition(card({ confirmations: [{ name: 'Alex', at: '2026-10-01T13:00:00.000Z' }], lastConfirmedAt: '2026-10-01T13:00:00.000Z' }), 'Supine');
  const v2 = withPosition(v1, 'Lateral');
  const v3 = { ...v2, name: 'Right TKA, robotic' };
  let { history } = recordChanges(emptyHistory(), book(v1), book(v2));
  ({ history } = recordChanges(history, book(v2), book(v3)));
  return { history, current: v3 };
}

describe('CardHistorySheet', () => {
  it('lists earlier versions newest first, shows one read-only without its old confirmation, and brings it back after a second step', () => {
    const { history, current } = twoEdits();
    const onRestore = vi.fn();
    render(<CardHistorySheet surgeon={surgeon} procedure={current} history={history} onRestore={onRestore} onForget={vi.fn()} onClose={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Changed after it: Name.')).toBeTruthy();
    expect(within(items[1]).getByText('Changed after it: Position.')).toBeTruthy();
    expect(within(items[0]).getByText(/by an edit on this phone\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View earlier version 2' }));
    expect(screen.getByText('Earlier version · not the current card')).toBeTruthy();
    expect(within(items[1]).getByText('Supine')).toBeTruthy();
    expect(within(items[1]).getByText('Unconfirmed')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Bring back earlier version 2' }));
    expect(onRestore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Bring this version back'));
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ procedure: expect.objectContaining({ blocks: expect.objectContaining({ position: expect.objectContaining({ text: 'Supine' }) }) }) }));
  });

  it('offers no bring-back on a unit book card, and clears history only after asking', () => {
    const { history, current } = twoEdits();
    const onForget = vi.fn();
    render(<CardHistorySheet surgeon={surgeon} procedure={{ ...current, unitBook: { id: 'u', revision: 4 } }} history={history} onRestore={vi.fn()} onForget={onForget} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Bring back/ })).toBeNull();
    expect(screen.getByText(/The unit book decides this card/)).toBeTruthy();
    fireEvent.click(screen.getByText('Clear this card’s history'));
    expect(onForget).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Clear history'));
    expect(onForget).toHaveBeenCalled();
  });

  it('lists signed changes newest first, and says when the card changed after the last one', async () => {
    const first = card();
    const made = { ...first, trail: await addSignedEdit(first, { by: 'Jordan Ames', action: 'created' }) };
    const edited = withPosition(made, 'Supine');
    edited.trail = await addSignedEdit(edited, { by: 'Alex Rivera', action: 'edited' });
    render(<CardHistorySheet surgeon={surgeon} procedure={edited} history={emptyHistory()} onRestore={vi.fn()} onForget={vi.fn()} onClose={vi.fn()} />);
    const list = await screen.findByRole('list', { name: 'Signed changes, newest first' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map(item => item.querySelector('p')?.textContent)).toEqual(['Edited the card · Alex Rivera', 'Made the card · Jordan Ames']);
    expect(items[0].textContent).toMatch(/this phone$/);
    expect(screen.getByText(/^Last change signed by/).textContent).toMatch(/Alex Rivera .* this phone$/);
    expect(await screen.findByText(/^This phone signs as [0-9A-F]{4}-/)).toBeTruthy();
    cleanup();

    render(<CardHistorySheet surgeon={surgeon} procedure={withPosition(edited, 'Prone')} history={emptyHistory()} onRestore={vi.fn()} onForget={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/^Changed after the last signed change \(Alex Rivera,/)).toBeTruthy();
    cleanup();

    const forged = { ...edited, trail: [edited.trail[0], { ...edited.trail[1], by: 'Dr. Amy Chen' }] };
    render(<CardHistorySheet surgeon={surgeon} procedure={forged} history={emptyHistory()} onRestore={vi.fn()} onForget={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/^A signed record on this card does not check out/)).toBeTruthy();
    expect(screen.getByText(/does not check out$/)).toBeTruthy();
  });

  it('says when there is nothing yet', () => {
    render(<CardHistorySheet surgeon={surgeon} procedure={card()} history={emptyHistory()} onRestore={vi.fn()} onForget={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/No earlier versions yet/)).toBeTruthy();
    expect(screen.queryByText('Clear this card’s history')).toBeNull();
  });
});

describe('DeletedCardsSheet', () => {
  it('lists a deleted card with what removed it and brings it back', () => {
    const { history } = recordChanges(emptyHistory(), book(withPosition(card(), 'Supine')), book());
    const onBringBack = vi.fn();
    const onRemove = vi.fn();
    render(<DeletedCardsSheet history={history} onBringBack={onBringBack} onRemove={onRemove} onClose={vi.fn()} />);
    expect(screen.getByText('Right TKA · Dr. Amy Chen')).toBeTruthy();
    expect(screen.getByText(/Deleted on this phone/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View Right TKA · Dr. Amy Chen' }));
    expect(screen.getByText('Supine')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bring back Right TKA · Dr. Amy Chen' }));
    expect(onBringBack).toHaveBeenCalledWith(history.deleted[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove for good: Right TKA · Dr. Amy Chen' }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }));
    expect(onRemove).toHaveBeenCalledWith(history.deleted[0]);
  });
});
