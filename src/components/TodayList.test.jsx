// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyProcedure } from '../data/schema';
import TodayList from './TodayList';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const surgeon = { id: 'a', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
const right = emptyProcedure('a', { id: 'r', name: 'Right TKA' });
const left = emptyProcedure('a', { id: 'l', name: 'Left TKA' });
const book = { surgeons: [surgeon], procedures: [right, left] };

function renderList(overrides = {}) {
  const props = { book, onOpen: vi.fn(), onOpenAll: vi.fn(), onPrintAll: vi.fn(), onStartProcedure: vi.fn(), onStartSurgeon: vi.fn(), ...overrides };
  render(<TodayList {...props} />);
  return props;
}

describe('TodayList', () => {
  it('reads pasted board lines, leaves out a patient line, and adds the rest', () => {
    const props = renderList();
    fireEvent.click(screen.getByText('Paste the board'));
    fireEvent.change(screen.getByLabelText(/Paste time, room, surgeon, and procedure/), {
      target: { value: '07:30\tOR 4\tCHEN, AMY\tR TKA\n09:00\tOR 4\tSMITH, JOHN\tCHEN, AMY\tL TKA\n10:30  OR 4  Chen  TKA' },
    });
    fireEvent.click(screen.getByText('Read the lines'));
    const lines = screen.getByRole('list', { name: 'Lines read from the board' });
    expect(lines.textContent).toContain('07:30 · Rm 4 · CHEN, AMY · R TKA');
    expect(lines.textContent).toContain('Opens Right TKA');
    expect(lines.textContent).toContain('Line 2: Left out: this line may carry a patient detail.');
    expect(lines.textContent).not.toContain('SMITH');
    expect(lines.textContent).toContain('You choose the card');
    fireEvent.click(screen.getByText('Add 2 lines to today'));

    expect(screen.getByText('07:30 · Rm 4 · CHEN, AMY · R TKA')).toBeTruthy();
    expect(screen.queryByText(/SMITH/)).toBeNull();
    fireEvent.click(screen.getByText('07:30 · Rm 4 · CHEN, AMY · R TKA'));
    expect(props.onOpen).toHaveBeenCalledWith(right);
  });

  it('shows the closest cards when the board names no side, with a way to start a new card', () => {
    const props = renderList();
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Surgeon'), { target: { value: 'Chen' } });
    fireEvent.change(screen.getByLabelText('Procedure'), { target: { value: 'TKA revision' } });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('07:30 · Rm 4 · Chen · TKA revision'));
    expect(screen.getByText(/Closest cards. Check the side/)).toBeTruthy();
    fireEvent.click(screen.getByText('None of these. Start a card for TKA revision'));
    expect(props.onStartProcedure).toHaveBeenCalledWith(surgeon, 'TKA revision');
    expect(props.onOpen).not.toHaveBeenCalled();
  });
});
