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
