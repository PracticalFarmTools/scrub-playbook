// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VendorLibrary } from './VendorPanels';

afterEach(cleanup);

describe('VendorLibrary', () => {
  it('finds a system by name and keeps the company list for a specialty', () => {
    render(<VendorLibrary onClose={() => {}} />);
    expect(screen.queryByText('Mako')).toBeNull();
    fireEvent.change(screen.getByLabelText('Find a system or company'), { target: { value: 'mako' } });
    expect(screen.getByRole('link', { name: 'Stryker instructions' }).getAttribute('href')).toBe('https://ifu.stryker.com');
    fireEvent.change(screen.getByLabelText('Find a system or company'), { target: { value: 'eye' } });
    expect(screen.getByRole('heading', { name: 'Eyes' })).toBeTruthy();
    expect(screen.getByText('Alcon')).toBeTruthy();
  });
});
