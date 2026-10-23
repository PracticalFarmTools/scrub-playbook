// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { emptyBlocks, emptyProcedure, textBlock } from '../data/schema';
import ShareCardModal from './ShareCardModal';

afterEach(cleanup);

const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [] };

describe('ShareCardModal', () => {
  it('holds back a card that carries a patient detail and shows no message or code', () => {
    const procedure = emptyProcedure('s1', { name: 'Knee', blocks: { ...emptyBlocks(), note: textBlock('Mr. Jones likes it cold', 'Alex') } });
    render(<ShareCardModal surgeon={surgeon} procedure={procedure} onClose={() => {}} />);
    expect(screen.getByRole('alert').textContent).toMatch(/a name with Mr., Mrs., or Ms./);
    expect(screen.queryByText('Copy')).toBeNull();
  });

  it('shares a clean card', () => {
    const procedure = emptyProcedure('s1', { name: 'Knee', blocks: { ...emptyBlocks(), note: textBlock('Likes it cold', 'Alex') } });
    render(<ShareCardModal surgeon={surgeon} procedure={procedure} onClose={() => {}} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Copy')).toBeTruthy();
  });
});
