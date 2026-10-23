// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
});
