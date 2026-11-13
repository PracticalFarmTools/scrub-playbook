// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VendorLibrary } from './VendorPanels';

afterEach(cleanup);

describe('VendorLibrary', () => {
  it('finds a system by name and keeps the company list for a specialty', () => {
    render(<VendorLibrary onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Systems and companies' })).toBeTruthy();
    const finder = screen.getByLabelText('Find a system or company');
    expect(finder.closest('.overflow-y-auto')).toBeNull();
    expect(screen.queryByText('Mako')).toBeNull();
    fireEvent.change(screen.getByLabelText('Find a system or company'), { target: { value: 'mako' } });
    expect(screen.getByRole('link', { name: 'Stryker instructions' }).getAttribute('href')).toBe('https://ifu.stryker.com');
    fireEvent.change(screen.getByLabelText('Find a system or company'), { target: { value: 'eye' } });
    expect(screen.getByRole('heading', { name: 'Eyes' })).toBeTruthy();
    expect(screen.getByText('Alcon')).toBeTruthy();
  });

  it('does not list every system from a company that also works in another specialty', () => {
    render(<VendorLibrary onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Find a system or company'), { target: { value: 'sports' } });
    const systems = screen.getByRole('heading', { name: /^Systems \(/ }).closest('section');
    expect(systems.textContent).toMatch(/TightRope/);
    expect(systems.textContent).not.toMatch(/Mako/);
    expect(systems.textContent).not.toMatch(/LigaSure/);
  });
});
