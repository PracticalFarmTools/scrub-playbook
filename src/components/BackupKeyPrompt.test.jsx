// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BackupKeyPrompt from './BackupKeyPrompt';

afterEach(cleanup);

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('BackupKeyPrompt', () => {
  it('asks for a long enough passphrase typed twice before locking', async () => {
    let finish;
    const onLock = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    render(<BackupKeyPrompt places={['Main']} onLock={onLock} onWithout={() => {}} onClose={onClose} />);
    expect(screen.getByText(/publishes the unit book for Main/)).toBeTruthy();
    const lock = screen.getByText('Lock the key and save the backup');
    expect(lock.disabled).toBe(true);

    type(/Passphrase, at least 8/, 'short');
    expect(screen.getByText(/Use at least 8 characters/)).toBeTruthy();
    type(/Passphrase, at least 8/, 'blue heron 42');
    type('The same passphrase again', 'blue heron 41');
    expect(screen.getByText('The two passphrases are different.')).toBeTruthy();
    expect(lock.disabled).toBe(true);

    type('The same passphrase again', 'blue heron 42');
    expect(lock.disabled).toBe(false);
    fireEvent.click(lock);
    expect(onLock).toHaveBeenCalledWith('blue heron 42');
    expect(await screen.findByText('Locking the key…')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    finish();
  });

  it('saves without publishing, and says what that means', () => {
    const onWithout = vi.fn();
    render(<BackupKeyPrompt places={['Main', 'West']} onLock={() => {}} onWithout={onWithout} onClose={() => {}} />);
    expect(screen.getByText(/cannot publish Main, West/)).toBeTruthy();
    fireEvent.click(screen.getByText('Save without publishing'));
    expect(onWithout).toHaveBeenCalled();
  });

  it('says so when the key cannot be locked', async () => {
    render(<BackupKeyPrompt places={['Main']} onLock={() => Promise.reject(new Error('no-crypto'))} onWithout={() => {}} onClose={() => {}} />);
    type(/Passphrase, at least 8/, 'blue heron 42');
    type('The same passphrase again', 'blue heron 42');
    fireEvent.click(screen.getByText('Lock the key and save the backup'));
    expect((await screen.findByRole('alert')).textContent).toContain('could not be locked');
  });
});
