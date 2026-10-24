import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyBlocks, emptyProcedure } from './schema';
import { readValue, writeValue } from './store';
import {
  DEVICE_KEY, TRAIL_MAX, addSignedEdit, checkTrail, contentHash, deviceKey, resetDeviceKeyForTests, signedContent, thisPhoneFingerprint,
} from './editTrail';
import { shareMessage } from './share';
import { parseImport } from './incoming';

const surgeon = { id: 's', name: 'Dr. Amy Chen', specialty: 'Orthopedics', facility: 'Main', demo: false };
const card = (overrides = {}) => emptyProcedure('s', { id: 'p', name: 'Right TKA', blocks: emptyBlocks(), ...overrides });
const withPosition = (procedure, text) => ({ ...procedure, blocks: { ...procedure.blocks, position: { ...procedure.blocks.position, text } } });

async function signed(procedure, edit = { by: 'Alex Rivera', action: 'edited' }) {
  return { ...procedure, trail: await addSignedEdit(procedure, edit) };
}

async function wipeDeviceKey() {
  resetDeviceKeyForTests();
  await writeValue(DEVICE_KEY, null);
}

beforeEach(async () => {
  await wipeDeviceKey();
});

describe('signedContent', () => {
  it('ignores confirmations, dates, and empty fields, and sees every content change', () => {
    const base = card();
    const confirmed = { ...base, confirmations: [{ name: 'Sam', at: '2026-10-01T00:00:00.000Z' }], lastConfirmedAt: '2026-10-01T00:00:00.000Z', updatedAt: '2027-01-01T00:00:00.000Z' };
    expect(signedContent(confirmed)).toBe(signedContent(base));
    expect(signedContent({ ...base, official: { label: '', note: '', reviewedAt: '2026-10-01T00:00:00.000Z' } })).toBe(signedContent(base));
    expect(signedContent(withPosition(base, 'Supine'))).not.toBe(signedContent(base));
    expect(signedContent({ ...base, aliases: ['R TKA'] })).not.toBe(signedContent(base));
    expect(signedContent({ ...base, approach: 'Medial parapatellar' })).not.toBe(signedContent(base));
  });
});

describe('signed edits', () => {
  it('signs a change and reads it back as signed, by this phone', async () => {
    const procedure = await signed(withPosition(card(), 'Supine'));
    const entry = procedure.trail[0];
    expect(entry).toMatchObject({ v: 1, by: 'Alex Rivera', action: 'edited', prev: null, content: await contentHash(procedure) });
    const result = await checkTrail(procedure);
    expect(result.status).toBe('signed');
    expect(result.entries[0]).toMatchObject({ ok: true, mine: true });
    expect(result.entries[0].fingerprint).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect(result.entries[0].fingerprint).toBe(await thisPhoneFingerprint());
  });

  it('reads a card with no records as unsigned', async () => {
    expect((await checkTrail(card())).status).toBe('unsigned');
  });

  it('sees content that changed after the last signed record', async () => {
    const procedure = await signed(card());
    const altered = withPosition(procedure, 'Prone');
    expect((await checkTrail(altered)).status).toBe('changed');
    expect((await checkTrail({ ...procedure, confirmations: [{ name: 'Sam', at: 'x' }] })).status).toBe('signed');
  });

  it('sees a record whose name, time, or signature was changed', async () => {
    const procedure = await signed(card());
    const [entry] = procedure.trail;
    for (const forged of [{ ...entry, by: 'Someone else' }, { ...entry, at: '2020-01-01T00:00:00.000Z' }, { ...entry, action: 'created' }, { ...entry, sig: entry.sig.replace(/^./, c => (c === 'A' ? 'B' : 'A')) }]) {
      const result = await checkTrail({ ...procedure, trail: [forged] });
      expect(result.status).toBe('broken');
      expect(result.entries[0].ok).toBe(false);
    }
  });

  it('sees a record taken out of the middle, or records put in another order', async () => {
    let procedure = card();
    for (const text of ['One', 'Two', 'Three']) procedure = await signed(withPosition(procedure, text));
    expect((await checkTrail(procedure)).status).toBe('signed');
    const [first, , third] = procedure.trail;
    expect((await checkTrail({ ...procedure, trail: [first, third] })).status).toBe('broken');
    expect((await checkTrail({ ...procedure, trail: [procedure.trail[1], first, third] })).status).toBe('broken');
  });

  it('cannot be made to match new content by re-signing with the old records', async () => {
    const procedure = await signed(card());
    const altered = withPosition(procedure, 'Prone');
    const entry = { ...procedure.trail[0], content: await contentHash(altered) };
    expect((await checkTrail({ ...altered, trail: [entry] })).status).toBe('broken');
  });

  it(`keeps the last ${TRAIL_MAX} records and still checks as signed`, async () => {
    let procedure = card();
    for (let i = 1; i <= TRAIL_MAX + 2; i += 1) procedure = await signed(withPosition(procedure, `Version ${i}`));
    expect(procedure.trail).toHaveLength(TRAIL_MAX);
    const result = await checkTrail(procedure);
    expect(result.status).toBe('signed');
    expect(result.trimmed).toBe(true);
    expect(result.entries).toHaveLength(TRAIL_MAX);
  });

  it('marks records from another phone as not this phone', async () => {
    const procedure = await signed(card(), { by: 'Jordan', action: 'created' });
    await wipeDeviceKey();
    const later = await signed(withPosition(procedure, 'Supine'), { by: 'Alex', action: 'edited' });
    const result = await checkTrail(later);
    expect(result.status).toBe('signed');
    expect(result.entries.map(item => [item.entry.by, item.mine])).toEqual([['Alex', true], ['Jordan', false]]);
    expect(result.entries[0].fingerprint).not.toBe(result.entries[1].fingerprint);
  });
});

describe('the phone key', () => {
  it('is made once, kept in IndexedDB as a key the browser will not export, and survives a reload', async () => {
    expect(await thisPhoneFingerprint()).toBeNull();
    const [a, b] = await Promise.all([deviceKey(), deviceKey()]);
    expect(a.fingerprint).toBe(b.fingerprint);
    const stored = await readValue(DEVICE_KEY);
    expect(stored.privateKey.extractable).toBe(false);
    expect(stored.privateJwk).toBeUndefined();
    resetDeviceKeyForTests();
    expect((await deviceKey()).fingerprint).toBe(a.fingerprint);
  });
});

describe('a shared card', () => {
  it('carries its last signed record and arrives signed on the other phone', async () => {
    const procedure = await signed(withPosition(card({ aliases: ['R TKA'] }), 'Supine, bump under the hip'));
    const share = shareMessage(surgeon, procedure);
    expect(share.payload.procedure.trail).toEqual([procedure.trail.at(-1)]);
    expect(share.showQr).toBe(true);
    const received = parseImport(share.message).book.procedures[0];
    expect(received.id).not.toBe(procedure.id);
    const result = await checkTrail(received);
    expect(result.status).toBe('signed');
    expect(result.entries[0].entry.by).toBe('Alex Rivera');
  });

  it('leaves the record out of the code when the card is too long for both', async () => {
    const long = await signed(withPosition(card(), 'x'.repeat(700)));
    const share = shareMessage(surgeon, long);
    expect(share.showQr).toBe(true);
    expect(share.qrSigned).toBe(false);
    expect(JSON.parse(share.qrText).procedure.trail).toBeUndefined();
    expect(share.payload.procedure.trail).toHaveLength(1);
  });
});
