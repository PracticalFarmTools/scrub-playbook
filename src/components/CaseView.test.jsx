// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { emptyBlocks, emptyProcedure } from '../data/schema';
import CaseView from './CaseView';

const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Bovie 35/35', 'Bovie 35/35'] };

function procedureWith(blocks = {}, partial = {}) {
  return emptyProcedure('s1', {
    name: 'Knee',
    blocks: {
      ...emptyBlocks(),
      instruments: [{ id: 'i1', name: 'Cobb elevator', from: '', mayo: true }],
      trays: [{ id: 't1', commonName: 'Major ortho', spdName: '', vendorName: '', openOrHold: 'open' }],
      ...blocks,
    },
    ...partial,
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CaseView', () => {
  it('names each checkbox after the item and opens as a dialog', () => {
    render(<CaseView surgeon={surgeon} procedure={procedureWith()} staleDays={90} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Dr. Chen Knee' })).toBeTruthy();
    const names = screen.getAllByRole('checkbox').map(box => box.labels[0].textContent);
    expect(names).toEqual(['Cobb elevator · Mayo', 'Major ortho · Open']);
    expect(screen.getByRole('checkbox', { name: 'Cobb elevator · Mayo' })).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Close');
    expect(screen.getByText('This browser may dim the screen')).toBeTruthy();
    expect(screen.getAllByText(/Bovie 35\/35/)).toHaveLength(2);
  });

  it('closes on Escape, and Escape first leaves the suggestion form', () => {
    const onClose = vi.fn();
    render(<CaseView surgeon={surgeon} procedure={procedureWith()} staleDays={90} onClose={onClose} />);
    fireEvent.click(screen.getByText('Suggest a card change'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('In the room I saw')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('labels a sample and offers no suggestion for it', () => {
    render(<CaseView surgeon={{ ...surgeon, demo: true }} procedure={procedureWith({}, { demo: true })} staleDays={90} onClose={() => {}} />);
    expect(screen.getByText('Sample. Not from your hospital.')).toBeTruthy();
    expect(screen.getByText(/^Sample · Unconfirmed$/)).toBeTruthy();
    expect(screen.queryByText('Suggest a card change')).toBeNull();
  });

  it('says it is asking before the screen lock answers', () => {
    vi.stubGlobal('navigator', { ...navigator, wakeLock: { request: () => new Promise(() => {}) } });
    render(<CaseView surgeon={surgeon} procedure={procedureWith()} staleDays={90} onClose={() => {}} />);
    expect(screen.getByText('Asking to keep the screen on')).toBeTruthy();
  });
});
