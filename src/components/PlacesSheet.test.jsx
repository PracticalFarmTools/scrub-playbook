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

  it('shows why a hand-off did not leave the phone', async () => {
    const onHandOff = vi.fn(async () => ({ message: 'Main was not handed off. Dr. Chen · Knee may include a phone number.' }));
    render(<PlacesSheet book={book} onClose={() => {}} onHandOff={onHandOff} onArchive={() => {}} onDelete={() => {}} onPublish={() => {}} />);
    fireEvent.click(within(sections()[0]).getByText('Hand off'));
    expect((await screen.findByRole('status')).textContent).toMatch(/may include a phone number/);
  });

  it('edits unit rules and offers hand-over only to the publisher', () => {
    const onSettings = vi.fn();
    const onHandOverPublishing = vi.fn(async () => ({ message: 'Hand-over file for Main is ready.' }));
    const props = { book, onClose: () => {}, onHandOff: () => {}, onArchive: () => {}, onDelete: () => {}, onPublish: () => {}, onSettings, onHandOverPublishing };
    render(<PlacesSheet {...props} published={{}} />);
    const active = sections()[0];
    expect(within(active).queryByText('Hand over publishing')).toBeNull();
    fireEvent.change(within(active).getByLabelText('A confirmation goes stale after'), { target: { value: '30' } });
    expect(onSettings).toHaveBeenLastCalledWith('Main', { staleDays: 30, dictation: true, twoPerson: false });
    fireEvent.click(within(active).getByLabelText('Allow dictation in the editor'));
    expect(onSettings).toHaveBeenLastCalledWith('Main', { staleDays: 90, dictation: false, twoPerson: false });
    fireEvent.click(within(active).getByLabelText(/Two different people confirm/));
    expect(onSettings).toHaveBeenLastCalledWith('Main', { staleDays: 90, dictation: true, twoPerson: true });
    expect(within(sections()[1]).queryByText(/Unit rules/)).toBeNull();
    cleanup();

    const published = { Main: { unitBookId: 'u', revision: 3, fingerprint: 'AB12-CD34-EF56-7890', privateKey: { kty: 'EC' }, settings: { staleDays: 60, dictation: false, twoPerson: true } } };
    render(<PlacesSheet {...props} published={published} />);
    const mine = sections()[0];
    expect(within(mine).getByText('Unit rules · published revision 3')).toBeTruthy();
    expect(within(mine).getByLabelText('A confirmation goes stale after').value).toBe('60');
    expect(within(mine).getByLabelText('Allow dictation in the editor').checked).toBe(false);
    expect(within(mine).getByText('Publisher key AB12-CD34-EF56-7890')).toBeTruthy();
    fireEvent.click(within(mine).getByText('Hand over publishing'));
    expect(onHandOverPublishing).toHaveBeenCalledWith('Main');
  });

  it('replaces the publishing key only after a second tap', async () => {
    const onReplaceKey = vi.fn(() => ({ message: 'The key for Main is replaced.' }));
    const props = { book, onClose: () => {}, onHandOff: () => {}, onArchive: () => {}, onDelete: () => {}, onPublish: () => {}, onSettings: () => {}, onHandOverPublishing: () => {}, onReplaceKey };
    render(<PlacesSheet {...props} published={{}} />);
    expect(screen.queryByText('Replace the publishing key')).toBeNull();
    cleanup();

    render(<PlacesSheet {...props} published={{ Main: { unitBookId: 'u', revision: 2, publicKey: { x: 'a' } } }} />);
    const mine = sections()[0];
    expect(within(mine).queryByText('Hand over publishing')).toBeNull();
    fireEvent.click(within(mine).getByText('Replace the publishing key'));
    expect(within(mine).getByRole('alert').textContent).toContain('starts a new unit book for Main under a new key');
    fireEvent.click(within(mine).getByText('Keep the key'));
    expect(within(mine).queryByRole('alert')).toBeNull();
    expect(onReplaceKey).not.toHaveBeenCalled();

    fireEvent.click(within(mine).getByText('Replace the publishing key'));
    fireEvent.click(within(mine).getByText('Replace the key'));
    expect(onReplaceKey).toHaveBeenCalledWith('Main');
    expect((await screen.findByRole('status')).textContent).toBe('The key for Main is replaced.');
  });

  it('says nothing changed when publishing fails', async () => {
    const onPublish = vi.fn(async () => { throw new Error('crypto unavailable'); });
    render(<PlacesSheet book={book} onClose={() => {}} onHandOff={() => {}} onArchive={() => {}} onDelete={() => {}} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish as unit book' }));
    expect((await screen.findByRole('status')).textContent).toBe('That did not finish, and nothing was changed. Try again.');
  });
});
