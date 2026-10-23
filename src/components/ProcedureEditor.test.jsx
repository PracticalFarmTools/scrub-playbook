// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ProcedureEditor from './ProcedureEditor';

afterEach(cleanup);

const surgeon = { id: 's1', name: 'Dr. Ada Lin', specialty: 'Orthopedics', facility: 'Main' };
const partial = {
  id: 'p1',
  surgeonId: 's1',
  name: 'Right total knee',
  approach: '',
  confirmations: [],
  official: { label: '', note: '' },
  blocks: { position: { text: 'Supine' } },
};

describe('ProcedureEditor', () => {
  it('opens a card that has only some sections and names every field', () => {
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Dr. Ada Lin' })).toBeTruthy();
    expect(screen.getByLabelText('Position').value).toBe('Supine');
    expect(screen.getByLabelText('How the room starts').value).toBe('');
    expect(screen.getByLabelText('Procedure, as the board writes it').value).toBe('Right total knee');
    const unnamed = [...document.querySelectorAll('input, select, textarea')]
      .filter(field => !(field.labels?.length || field.getAttribute('aria-label')));
    expect(unnamed).toEqual([]);
  });

  it('saves the full set of sections from a partial card', () => {
    const onSave = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save procedure' }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.blocks.position.text).toBe('Supine');
    expect(saved.blocks.room).toBeTruthy();
    expect(saved.blocks.steps).toEqual([]);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={onClose} onSave={() => {}} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes at once when nothing changed', () => {
    const onClose = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={onClose} onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before discarding a change, from Cancel or Escape', () => {
    const onClose = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={onClose} onSave={() => {}} />);
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'Lateral' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep editing' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByLabelText('Position').value).toBe('Lateral');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('also asks when only the board names changed', () => {
    const onClose = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} onClose={onClose} onSave={() => {}} />);
    fireEvent.change(screen.getByLabelText('Other names on the board'), { target: { value: 'R TKA' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('marks the official card checked only when asked', () => {
    const onSave = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} allowOfficial onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Official card name'), { target: { value: 'Epic card' } });
    expect(screen.getByText('Not checked against the official card yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save procedure' }));
    expect(onSave.mock.calls[0][0].official.label).toBe('Epic card');
    expect(onSave.mock.calls[0][0].official.reviewedAt).toBeFalsy();
    cleanup();
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} allowOfficial onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'I checked the official card today' }));
    expect(screen.getByText(/^Checked against the official card /)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save procedure' }));
    const reviewedAt = onSave.mock.calls[1][0].official.reviewedAt;
    expect(Date.now() - Date.parse(reviewedAt)).toBeLessThan(5000);
  });

  it('jumps to a section and moves focus there', () => {
    render(<ProcedureEditor surgeon={surgeon} procedure={partial} allowOfficial onClose={() => {}} onSave={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Jump to a section' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Trays' }));
    expect(document.activeElement.id).toBe('editor-trays');
    fireEvent.click(within(nav).getByRole('button', { name: 'Official card' }));
    expect(document.activeElement.id).toBe('editor-official');
  });

  it('opens a duplicate on its name and asks before dropping it', () => {
    const onClose = vi.fn();
    render(<ProcedureEditor surgeon={surgeon} procedure={{ ...partial, id: 'p2', name: 'Right total knee (copy)' }} copyOf="Right total knee" onClose={onClose} onSave={() => {}} />);
    expect(screen.getByText(/A copy of Right total knee\./)).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Procedure, as the board writes it'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});
