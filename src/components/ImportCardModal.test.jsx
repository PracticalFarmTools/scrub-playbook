// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { applyUnitBook, checkUnitFile, handOverPublishing, publishUnitBook, replacePublishingKey } from '../data/unitBook';
import { PUBLISHED_KEY, emptyBlocks, emptyProcedure } from '../data/schema';
import { shareMessage, toBackup } from '../data/share';
import { lockPublished } from '../data/keyLock';
import ImportCardModal from './ImportCardModal';

const camera = vi.hoisted(() => ({ read: null, fail: false }));
vi.mock('../utils/qrReader', () => ({
  canUseCamera: () => true,
  createQrReader: async () => {
    if (camera.fail) throw new Error('no-canvas');
    return camera.read;
  },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  camera.read = null;
  camera.fail = false;
});

function paste(text) {
  fireEvent.change(screen.getByPlaceholderText('Paste the shared text here'), { target: { value: text } });
  fireEvent.click(screen.getByText('Review'));
}

const unitSource = () => ({
  version: 2,
  surgeons: [
    { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false },
    { id: 's2', name: 'Dr. Patel', specialty: 'General Surgery', facility: 'Main', demo: false },
  ],
  procedures: [emptyProcedure('s1', { id: 'p1', name: 'Knee', blocks: emptyBlocks() })],
});

async function signedUnit(book = unitSource(), published = {}) {
  return publishUnitBook(book, 'Main', 'Alex', { published });
}

describe('ImportCardModal', () => {
  it('offers to switch a hand-off copy to the unit book once the signature checks out', async () => {
    const { file, fingerprint } = await signedUnit();
    const onImport = vi.fn(() => ({ success: true }));
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }], procedures: [] };
    render(<ImportCardModal book={book} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(file));
    expect(screen.getByText(/Checking the publisher’s signature/)).toBeTruthy();
    expect(screen.queryByText('Use the unit book for Dr. Chen')).toBeNull();
    expect(await screen.findByText(`Signed by publisher key ${fingerprint}.`)).toBeTruthy();
    expect(screen.getByText(/You already keep Dr. Chen as your own notes/)).toBeTruthy();
    fireEvent.click(screen.getByText('Use the unit book for Dr. Chen'));
    expect(onImport.mock.calls[0][1]).toMatchObject({ unitFile: { unitBookId: file.unitBookId }, adopt: true, fingerprint });
  });

  it('asks before switching to a new unit book after a key change, then refuses the old one', async () => {
    const first = await signedUnit();
    const empty = { version: 2, surgeons: [], procedures: [] };
    const phone = applyUnitBook(empty, first.file, { published: {}, fingerprint: (await checkUnitFile(first.file)).fingerprint }).book;
    const fresh = await signedUnit(unitSource(), replacePublishingKey(first.published, 'Main'));
    const onImport = vi.fn(() => ({ success: true }));
    render(<ImportCardModal book={phone} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(fresh.file));
    await screen.findByText(`Signed by publisher key ${fresh.fingerprint}.`);
    expect(screen.getByText(/You have Dr. Chen, Dr. Patel from an earlier unit book/).textContent).toContain(`the key ${fresh.fingerprint} matches`);
    expect(screen.queryByText(/as your own notes/)).toBeNull();
    expect(screen.queryByText('Add unit book')).toBeNull();
    fireEvent.click(screen.getByText('Switch to this unit book for them'));
    expect(onImport.mock.calls[0][1]).toMatchObject({ unitFile: { unitBookId: fresh.file.unitBookId }, adopt: true });
    cleanup();

    const switched = applyUnitBook(phone, fresh.file, { adopt: true, published: {}, fingerprint: fresh.fingerprint }).book;
    const leaked = await publishUnitBook(unitSource(), 'Main', 'Mallory', { published: first.published });
    render(<ImportCardModal book={switched} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(leaked.file));
    expect((await screen.findByRole('alert')).textContent).toContain('already switched from this unit book for Main');
    expect(screen.queryByText(/Switch to this unit book/)).toBeNull();
    expect(screen.queryByText('Add unit book')).toBeNull();
  });

  it('tells the publisher the unit book is their own', async () => {
    const { file, published } = await signedUnit();
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(published));
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(file));
    await screen.findByText(/Signed by publisher key/);
    expect(screen.getByText(/the unit book you published from this phone/)).toBeTruthy();
    expect(screen.queryByText('Add unit book')).toBeNull();
  });

  it('refuses an unsigned old file and a file changed after publishing', async () => {
    const { file } = await signedUnit();
    const old = { ...file, v: 1 };
    delete old.signature;
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(old));
    expect((await screen.findByRole('alert')).textContent).toContain('from an earlier version and is not signed');
    expect(screen.queryByText('Add unit book')).toBeNull();
    cleanup();

    const tampered = structuredClone(file);
    tampered.book.procedures[0].name = 'Knee, edited in transit';
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(tampered));
    expect((await screen.findByRole('alert')).textContent).toContain('changed after it was published');
    expect(screen.queryByText('Add unit book')).toBeNull();
  });

  it('lists what each card changes and warns about an old revision', async () => {
    const first = await signedUnit();
    const phone = applyUnitBook({ version: 2, surgeons: [], procedures: [] }, first.file, {
      published: {}, fingerprint: (await checkUnitFile(first.file)).fingerprint,
    }).book;
    const edited = unitSource();
    edited.procedures[0].blocks.trays = [{ id: 't1', commonName: 'Major ortho', spdName: '', vendorName: '', openOrHold: 'open' }];
    const second = await publishUnitBook(edited, 'Main', 'Alex', { published: first.published, now: '2026-01-02T00:00:00.000Z' });
    render(<ImportCardModal book={phone} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(second.file));
    expect(await screen.findByText('What changes from revision 1')).toBeTruthy();
    expect(screen.getByText('Dr. Chen · Knee').parentElement.textContent).toBe('Dr. Chen · Knee: Trays');
    expect(screen.getByText(/days ago. Ask your unit whether there is a newer one/)).toBeTruthy();
  });

  it('takes over publishing from a signed hand-over file', async () => {
    const first = await signedUnit();
    const handover = await handOverPublishing(unitSource(), 'Main', 'Alex', { published: first.published });
    const onImport = vi.fn(() => ({ success: true }));
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(handover.file));
    expect(screen.getByText(/Alex is handing you publishing for the unit book for Main, revision 2/)).toBeTruthy();
    fireEvent.click(await screen.findByText('Take over publishing'));
    expect(onImport.mock.calls[0][1]).toMatchObject({ handover: { kind: 'scrubplaybook-publisher' }, fingerprint: first.fingerprint });
  });

  it('shows the incoming first-case lines and says an existing surgeon keeps theirs', () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Bovie 35/35'] };
    const { message } = shareMessage(surgeon, emptyProcedure('x', { name: 'Knee' }));
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: ['Mine'] }], procedures: [] };
    render(<ImportCardModal book={book} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(message);
    expect(screen.getByText('• Bovie 35/35')).toBeTruthy();
    expect(screen.getByText('Adds to Dr. Chen in your book.')).toBeTruthy();
    expect(screen.getByText(/Dr. Chen keeps the first-case lines already in your book/)).toBeTruthy();
  });

  it('offers to restore a full backup or add it as someone else’s notes', () => {
    const onImport = vi.fn(() => ({ success: true }));
    const backup = toBackup({ version: 2, surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }], procedures: [] });
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(backup));
    fireEvent.click(screen.getByText('Restore my backup'));
    expect(onImport.mock.calls[0][1].restore.restorable).toBe(true);
    cleanup();
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(backup));
    fireEvent.click(screen.getByText('Add as someone else’s notes'));
    expect(onImport.mock.calls[1][1].restore).toBeUndefined();
  });

  it('pauses an imported card that carries a patient field', () => {
    const card = { kind: 'scrubplaybook-card', v: 2, surgeon: { name: 'Dr. Chen' }, procedure: { name: 'Knee', patient: { name: 'Smith' } } };
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    paste(JSON.stringify(card));
    expect(screen.getByRole('alertdialog').textContent).toContain('a field named “patient”');
    expect(screen.getByRole('alertdialog').textContent).toContain('Nothing was saved.');
  });

  it('scans a shared code with the camera and stops the camera after reading it', async () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
    const { message } = shareMessage(surgeon, emptyProcedure('x', { name: 'Knee' }));
    const stop = vi.fn();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const stream = { getTracks: () => [{ stop }] };
    const getUserMedia = vi.fn(async () => stream);
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } });
    let calls = 0;
    const shown = [];
    camera.read = vi.fn(async (video) => {
      shown.push(video.srcObject === stream);
      return ++calls < 2 ? '' : message;
    });
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    fireEvent.click(screen.getByText('Scan a code'));
    expect(await screen.findByText('Add unconfirmed', {}, { timeout: 2000 })).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    expect(camera.read).toHaveBeenCalledTimes(2);
    expect(shown).toEqual([true, true]);
    expect(play).toHaveBeenCalled();
    expect(screen.getByText('For Dr. Chen · Orthopedics, new to your book.')).toBeTruthy();
    expect(stop).toHaveBeenCalled();
  });

  it('falls back to pasting when the camera is refused or the scanner cannot start', async () => {
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => { throw new Error('denied'); }) } });
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    fireEvent.click(screen.getByText('Scan a code'));
    expect((await screen.findByText(/Camera permission is needed to scan/)).textContent).toContain('Paste the text instead.');
    cleanup();

    const stop = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop }] })) } });
    camera.fail = true;
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={() => ({ success: true })} />);
    fireEvent.click(screen.getByText('Scan a code'));
    expect(await screen.findByText(/This phone could not start the scanner/)).toBeTruthy();
    expect(stop).toHaveBeenCalled();
  });

  it('restores a locked publishing key only with its passphrase, or restores without publishing', async () => {
    const { published } = await signedUnit();
    const locked = await lockPublished(published, 'blue heron 42', { iterations: 1000 });
    const backup = toBackup({ version: 2, surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }], procedures: [] }, { published: locked });
    expect(JSON.stringify(backup)).not.toContain(published.Main.privateKey.d);
    const onImport = vi.fn(() => ({ success: true }));
    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(backup));
    expect(screen.getByText(/holds the locked publishing key for Main/)).toBeTruthy();
    expect(screen.getAllByText('Restore my backup')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Backup passphrase'), { target: { value: 'wrong words' } });
    fireEvent.click(screen.getByText('Restore my backup'));
    expect((await screen.findByRole('alert')).textContent).toContain('does not unlock the publishing key for Main');
    expect(onImport).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Backup passphrase'), { target: { value: 'blue heron 42' } });
    fireEvent.click(screen.getByText('Restore my backup'));
    await vi.waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const restored = onImport.mock.calls[0][1].restore.extras.published.Main;
    expect(restored.privateKey).toEqual(published.Main.privateKey);
    expect(restored.lockedKey).toBeUndefined();
    cleanup();

    render(<ImportCardModal book={{ surgeons: [], procedures: [] }} onClose={() => {}} onImport={onImport} />);
    paste(JSON.stringify(backup));
    fireEvent.click(screen.getByText('Restore without publishing'));
    expect(onImport.mock.calls[1][1].restore.extras.published).toEqual({});
  });
});
