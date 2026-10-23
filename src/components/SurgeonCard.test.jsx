// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyProcedure } from '../data/schema';
import EmptyState from './EmptyState';
import SurgeonCard from './SurgeonCard';

afterEach(cleanup);

const noop = () => {};
const handlers = {
  onDeleteSurgeon: noop,
  onDeleteProcedure: noop,
  onEdit: noop,
  onAddProcedure: noop,
  onConfirm: noop,
  onDispute: noop,
  onClearDispute: noop,
  onShare: noop,
  onCopySample: noop,
  onCaseView: noop,
  onSaveFirstCase: noop,
};

describe('SurgeonCard', () => {
  it('says why a blank name is not saved', () => {
    const onUpdateSurgeon = vi.fn();
    const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [] };
    render(<SurgeonCard surgeon={surgeon} procedures={[]} staleDays={90} onUpdateSurgeon={onUpdateSurgeon} onCopyToNotes={noop} {...handlers} />);
    fireEvent.click(screen.getByText('Edit details'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByRole('alert').textContent).toBe('Add a name to save.');
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(onUpdateSurgeon).not.toHaveBeenCalled();
  });

  it('keeps a unit surgeon read-only and points to the copy once it exists', () => {
    const stamp = { id: 'unit-1', revision: 3 };
    const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Bovie 35/35'], unitBook: stamp };
    const unitCard = { ...emptyProcedure('s1', { id: 'p1', name: 'Knee' }), unitBook: stamp };
    const onCopyToNotes = vi.fn();
    const { rerender } = render(<SurgeonCard surgeon={surgeon} procedures={[unitCard]} staleDays={90} onUpdateSurgeon={noop} onCopyToNotes={onCopyToNotes} {...handlers} />);
    expect(screen.queryByText('Edit details')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.getByText('Unit book · revision 3', { selector: 'header p' })).toBeTruthy();
    fireEvent.click(screen.getByText('Copy to my notes'));
    expect(onCopyToNotes).toHaveBeenCalledWith('p1');

    const copy = { ...emptyProcedure('s1', { id: 'p2', name: 'Knee' }), copiedFrom: 'p1' };
    rerender(<SurgeonCard surgeon={surgeon} procedures={[copy, unitCard]} staleDays={90} onUpdateSurgeon={noop} onCopyToNotes={onCopyToNotes} {...handlers} />);
    expect(screen.getByText('Go to my copy')).toBeTruthy();
    expect(screen.getByText('My notes')).toBeTruthy();
    expect(screen.getAllByText('Edit')).toHaveLength(1);
  });

  it('uses the unit rule for two-person confirmation and shows what the revision changed', () => {
    const at = new Date(Date.now() - 86400000).toISOString();
    const stamp = { id: 'unit-1', revision: 4, changes: ['Trays', 'Sutures'], settings: { staleDays: 90, dictation: true, twoPerson: true } };
    const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [], unitBook: stamp };
    const procedure = { ...emptyProcedure('s1', { id: 'p1', name: 'Knee' }), unitBook: stamp, confirmations: [{ name: 'Alex', userId: 'alex', at }], lastConfirmedAt: at };
    const trustFor = () => ({ staleDays: 90, mode: 'facility' });
    render(<SurgeonCard surgeon={surgeon} procedures={[procedure]} staleDays={90} trustFor={trustFor} onUpdateSurgeon={noop} onCopyToNotes={noop} {...handlers} />);
    expect(screen.getByText('Unconfirmed')).toBeTruthy();
    expect(screen.getByText(/One staff member/)).toBeTruthy();
    expect(screen.getByText('Changed in revision 4: Trays, Sutures.')).toBeTruthy();
  });

  it('draws the highlight inside the highlighted card only', () => {
    const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', demo: false, firstCase: [] };
    const cards = [emptyProcedure('s1', { id: 'p1', name: 'Knee' }), emptyProcedure('s1', { id: 'p2', name: 'Hip' })];
    const { container } = render(<SurgeonCard surgeon={surgeon} procedures={cards} staleDays={90} highlightId="p2" onUpdateSurgeon={noop} onCopyToNotes={noop} {...handlers} />);
    expect(container.querySelector('#procedure-p2').className).toContain('ring-inset');
    expect(container.querySelector('#procedure-p1').className).not.toContain('ring-inset');
  });

  it('keeps two identical first-case lines', () => {
    const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', demo: false, firstCase: ['Same', 'Same'] };
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SurgeonCard surgeon={surgeon} procedures={[]} staleDays={90} onUpdateSurgeon={noop} onCopyToNotes={noop} {...handlers} />);
    expect(screen.getAllByText('• Same')).toHaveLength(2);
    expect(error.mock.calls.some(call => String(call[0]).includes('same key'))).toBe(false);
    error.mockRestore();
  });
});

describe('EmptyState', () => {
  it('sends an all-archived book to Places instead of offering samples', () => {
    const onOpenPlaces = vi.fn();
    render(<EmptyState hasQuery={false} archivedCount={2} onAddSurgeon={noop} onPreview={noop} onOpenPlaces={onOpenPlaces} />);
    expect(screen.getByText('Every place is archived')).toBeTruthy();
    expect(screen.getByText(/2 archived surgeons are kept in Places/)).toBeTruthy();
    expect(screen.queryByText('Preview sample cards')).toBeNull();
    fireEvent.click(screen.getByText('Open Places'));
    expect(onOpenPlaces).toHaveBeenCalled();
  });
});
