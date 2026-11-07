// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { cleanSystemUses } from '../data/systems';
import { SystemDoors, SystemListEditor } from './Systems';

afterEach(cleanup);

describe('SystemDoors', () => {
  it('names the product page and the instructions separately', () => {
    const use = cleanSystemUses([{ catalogId: 'sys-attune', repExpected: true }])[0];
    render(<SystemDoors use={use} />);
    expect(screen.getByRole('link', { name: 'Product page' }).getAttribute('href')).toMatch(/attune-knee-system/);
    expect(screen.getByRole('link', { name: 'DePuy Synthes (J&J) instructions' }).getAttribute('href')).toBe('https://www.e-ifu.com');
    expect(screen.getByText(/Rep expected/)).toBeTruthy();
  });

  it('keeps a catalog code visible when no catalog page is stored', () => {
    const use = cleanSystemUses([{ name: 'House tray system', catalogNumber: 'HT-14' }])[0];
    render(<SystemDoors use={use} />);
    expect(screen.getByText('Catalog code HT-14')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('hides a listed system that is already on the card', async () => {
    const onChange = vi.fn();
    render(<SystemListEditor systems={cleanSystemUses([{ catalogId: 'sys-mako' }])} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Add a listed system/ }));
    await waitFor(() => expect(screen.getByRole('option', { name: /TightRope/ })).toBeTruthy());
    expect(screen.queryByRole('option', { name: /Mako/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add system' }).disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the listed system when the typed name is already in the catalog', () => {
    const onChange = vi.fn();
    render(<SystemListEditor systems={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('System name not in the list'), { target: { value: 'ATTUNE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this name' }));
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ catalogId: 'sys-attune', name: 'ATTUNE Knee System', companyId: 'depuy-synthes-j-and-j' });
  });

  it('says when that system is already on the list', () => {
    const onChange = vi.fn();
    render(<SystemListEditor systems={cleanSystemUses([{ catalogId: 'sys-mako' }])} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('System name not in the list'), { target: { value: 'Mako SmartRobotics' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this name' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Mako is already on this list.');
  });

  it('says when no page is stored', () => {
    render(<SystemDoors use={cleanSystemUses([{ name: 'House tray system' }])[0]} />);
    expect(screen.getByText('No page is stored for this system yet.')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
