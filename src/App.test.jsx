// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BOOK_KEY, BOOK_VERSION, DISCLAIMER_KEY, LAST_EXPORT_KEY, emptyProcedure } from './data/schema';
import App from './App';

vi.mock('./pwa', () => ({ onUpdateReady: () => () => {}, applyUpdate: () => {} }));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const surgeon = { id: 'a', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [], archived: false };
const right = emptyProcedure('a', { id: 'r', name: 'Right TKA' });

function seed() {
  localStorage.setItem(DISCLAIMER_KEY, 'true');
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  localStorage.setItem(BOOK_KEY, JSON.stringify({ version: BOOK_VERSION, surgeons: [surgeon], procedures: [right] }));
}

describe('App', () => {
  it('shows the version it was built from', async () => {
    seed();
    render(<App />);
    expect(await screen.findByText(`Version ${__APP_VERSION__} · built ${__BUILD_DATE__}`)).toBeTruthy();
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('opens a case from today’s board while a search is typed, then clears the search', async () => {
    seed();
    render(<App />);
    const search = await screen.findByRole('searchbox');
    fireEvent.change(search, { target: { value: 'nothing matches this' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Surgeon'), { target: { value: 'Chen' } });
    fireEvent.change(screen.getByLabelText('Procedure'), { target: { value: 'Right TKA' } });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('07:30 · Rm 4 · Chen · Right TKA'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('Right TKA').length).toBeGreaterThan(0);
    expect(screen.getByRole('searchbox').value).toBe('');
  });
});
