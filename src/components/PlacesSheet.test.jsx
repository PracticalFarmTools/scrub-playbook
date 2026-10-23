// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { emptyProcedure } from '../data/schema';
import PlacesSheet from './PlacesSheet';

afterEach(cleanup);

const book = {
  surgeons: [
    { id: 'a', name: 'Dr. Active', facility: 'Main', demo: false },
    { id: 'b', name: 'Dr. Archived', facility: 'Main', demo: false, archived: true },
    { id: 'c', name: 'Dr. Second', facility: 'Main', demo: false, archived: true },
  ],
  procedures: [emptyProcedure('a', { name: 'Knee' }), emptyProcedure('b', { name: 'Hip' })],
};

function sections() {
  return screen.getAllByRole('heading', { level: 2, name: 'Main' }).map(heading => heading.closest('section'));
}

describe('PlacesSheet', () => {
  it('counts each group in words and deletes only that group', () => {
    const onDelete = vi.fn();
    const onHandOff = vi.fn();
    render(<PlacesSheet book={book} onClose={() => {}} onHandOff={onHandOff} onArchive={() => {}} onDelete={onDelete} onPublish={() => {}} />);
    const [active, archived] = sections();
    expect(within(active).getByText('1 surgeon · 1 procedure')).toBeTruthy();
    expect(within(archived).getByText('2 surgeons · 1 procedure')).toBeTruthy();
    expect(within(active).getByText(/the facility’s policy/)).toBeTruthy();

    fireEvent.click(within(archived).getByText('Delete'));
    expect(within(archived).getByRole('alert').textContent).toMatch(/^Delete 2 surgeons and 1 procedure archived at Main\?/);
    fireEvent.click(within(within(archived).getByRole('alert')).getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('Main', { archived: true });

    fireEvent.click(within(archived).getByText('Hand off'));
    expect(onHandOff).toHaveBeenCalledWith('Main', { archived: true });
    fireEvent.click(within(active).getByText('Hand off'));
    expect(onHandOff).toHaveBeenLastCalledWith('Main', { archived: false });
  });
});
