// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PUBLISHED_KEY, emptyBlocks, emptyProcedure } from '../data/schema';
import { shareMessage } from '../data/share';
import ImportCardModal from './ImportCardModal';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function paste(text) {
  fireEvent.change(screen.getByPlaceholderText('Paste the shared text here'), { target: { value: text } });
  fireEvent.click(screen.getByText('Review'));
}

const unitFile = {
  kind: 'scrubplaybook-unitbook',
  v: 1,
  unitBookId: 'unit-1',
  place: 'Main',
  revision: 2,
  publishedBy: 'Alex',
  book: {
    version: 2,
    surgeons: [
      { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false },
      { id: 's2', name: 'Dr. Patel', specialty: 'General Surgery', facility: 'Main', demo: false },
    ],
    procedures: [emptyProcedure('s1', { id: 'p1', name: 'Knee', blocks: emptyBlocks() })],
  },
};

describe('ImportCardModal', () => {
  it('offers to switch a hand-off copy to the unit book', () => {
    const onImport = vi.fn(() => ({ success: true }));
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }], procedures: [] };
    render(<ImportCardModal book={book} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(unitFile));
    expect(screen.getByText(/You already keep Dr. Chen as your own notes/)).toBeTruthy();
    fireEvent.click(screen.getByText('Use the unit book for Dr. Chen'));
    expect(onImport.mock.calls[0][1]).toMatchObject({ unitFile: { unitBookId: 'unit-1' }, adopt: true });
  });

  it('tells the publisher the unit book is their own', () => {
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify({ Main: { unitBookId: 'unit-1', revision: 2 } }));
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(unitFile));
    expect(screen.getByText(/the unit book you published from this phone/)).toBeTruthy();
    expect(screen.queryByText('Add unit book')).toBeNull();
  });

  it('shows the incoming first-case lines and says an existing surgeon keeps theirs', () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Bovie 35/35'] };
    const { message } = shareMessage(surgeon, emptyProcedure('x', { name: 'Knee' }));
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Mine'] }], procedures: [] };
    render(<ImportCardModal book={book} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(message);
    expect(screen.getByText('• Bovie 35/35')).toBeTruthy();
    expect(screen.getByText(/Dr. Chen keeps the first-case lines already in your book/)).toBeTruthy();
  });

  it('pauses an imported card that carries a patient field', () => {
    const card = { kind: 'scrubplaybook-card', v: 2, surgeon: { name: 'Dr. Chen' }, procedure: { name: 'Knee', patient: { name: 'Smith' } } };
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(card));
    expect(screen.getByRole('alertdialog').textContent).toContain('a field named “patient”');
    expect(screen.getByRole('alertdialog').textContent).toContain('Nothing was saved.');
  });
});
