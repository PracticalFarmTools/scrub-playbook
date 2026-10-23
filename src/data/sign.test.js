import { describe, expect, it } from 'vitest';
import { canonicalJson, generateSigningKey, keyFingerprint, signFile, verifyFile } from './sign';
import { emptyBlocks, emptyProcedure } from './schema';
import { parseImport } from './share';
import { trustState } from './trust';
import {
  applyUnitBook, changedSections, checkHandover, checkUnitFile, dictationOff, handOverPublishing, publishUnitBook,
  takeOverPublishing, trustOptionsFor, unitAgeDays, unitChangeList, unitCheckText, unitResultText, withUnitSettings,
} from './unitBook';

const source = () => ({
  version: 2,
  surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, firstCase: [] }],
  procedures: [emptyProcedure('s1', {
    id: 'p1',
    name: 'Knee',
    blocks: { ...emptyBlocks(), sutures: [{ id: 'su1', layer: 'Fascia', name: 'Vicryl', size: '0', needle: 'CT-1', open: '', hold: '', catalogNumber: '' }] },
  })],
});
const empty = () => ({ version: 2, surgeons: [], procedures: [] });

async function subscribe(book, file) {
  const check = await checkUnitFile(file);
  return applyUnitBook(book, file, { published: {}, fingerprint: check.fingerprint });
}

describe('signing', () => {
  it('writes the same canonical text whatever the key order', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: undefined }] })).toBe(canonicalJson({ a: [{ d: 2 }], b: 1 }));
  });

  it('verifies a signed file and refuses one changed after signing', async () => {
    const keys = await generateSigningKey();
    const signed = await signFile({ hello: 'world', publicKey: keys.publicKey }, keys.privateKey);
    const check = await verifyFile(signed);
    expect(check.ok).toBe(true);
    expect(check.fingerprint).toBe(await keyFingerprint(keys.publicKey));
    expect(check.fingerprint).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect((await verifyFile({ ...signed, hello: 'there' })).reason).toBe('changed');
    expect((await verifyFile({ hello: 'world' })).reason).toBe('unsigned');
  });
});

describe('signed unit books', () => {
  it('refuses the earlier unsigned format and a forged revision', async () => {
    const { file } = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    expect((await checkUnitFile(file)).ok).toBe(true);
    expect((await checkUnitFile({ ...file, v: 1 })).reason).toBe('old-format');
    const forged = { ...file, revision: 99 };
    const check = await checkUnitFile(forged);
    expect(check.reason).toBe('changed');
    expect(unitCheckText(check)).toMatch(/changed after it was published/);
    expect(applyUnitBook(empty(), forged, { published: {} }).status).toBe('unsigned');
    expect(parseImport(JSON.stringify(file)).type).toBe('unitbook');
  });

  it('keeps one key per place and carries the unit settings inside the signature', async () => {
    const withSettings = withUnitSettings({}, 'Main', { staleDays: 30, dictation: false, twoPerson: true });
    const first = await publishUnitBook(source(), 'Main', 'Alex', { published: withSettings });
    const second = await publishUnitBook(source(), 'Main', 'Alex', { published: first.published });
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.file.settings).toEqual({ staleDays: 30, dictation: false, twoPerson: true });
    expect((await checkUnitFile({ ...second.file, settings: { ...second.file.settings, twoPerson: false } })).ok).toBe(false);

    const applied = await subscribe(empty(), second.file);
    const procedure = applied.book.procedures[0];
    expect(procedure.unitBook.settings).toEqual({ staleDays: 30, dictation: false, twoPerson: true });
    expect(trustOptionsFor(procedure, applied.book.surgeons[0], {})).toEqual({ staleDays: 30, mode: 'facility' });
    expect(dictationOff(applied.book, {})).toBe(true);
    expect(dictationOff(source(), {})).toBe(false);
    expect(dictationOff(source(), withSettings)).toBe(true);
  });

  it('refuses a revision signed by a different publisher once a key is trusted', async () => {
    const real = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    const phone = (await subscribe(empty(), real.file)).book;
    const impostorKeys = await generateSigningKey();
    const impostor = await publishUnitBook(source(), 'Main', 'Mallory', {
      published: { Main: { unitBookId: real.file.unitBookId, revision: 5 } },
      keys: impostorKeys,
    });
    const result = await subscribe(phone, impostor.file);
    expect(result.status).toBe('other-publisher');
    expect(result.book).toBe(phone);
    expect(unitResultText('Main', result)).toMatch(/different publisher/);
  });

  it('lists what changed on each card and stamps the revision date', async () => {
    const first = await publishUnitBook(source(), 'Main', 'Alex', { published: {}, now: '2026-10-01T00:00:00.000Z' });
    const phone = (await subscribe(empty(), first.file)).book;
    expect(phone.procedures[0].unitBook.changes).toEqual(['New card']);
    expect(phone.procedures[0].unitBook.publishedAt).toBe('2026-10-01T00:00:00.000Z');

    const edited = source();
    edited.procedures[0].blocks.sutures[0].size = '2-0';
    edited.procedures[0].blocks.trays = [{ id: 't1', commonName: 'Knee tray', spdName: '', vendorName: '', openOrHold: 'open' }];
    edited.procedures.push(emptyProcedure('s1', { id: 'p2', name: 'Hip', blocks: emptyBlocks() }));
    const second = await publishUnitBook(edited, 'Main', 'Alex', { published: first.published, now: '2026-10-20T00:00:00.000Z' });
    const check = await checkUnitFile(second.file);
    const preview = unitChangeList(phone, second.file, { published: {}, fingerprint: check.fingerprint });
    expect(preview.cards).toEqual([
      { id: 'p1', title: 'Dr. Chen · Knee', changes: ['Trays', 'Sutures'] },
      { id: 'p2', title: 'Dr. Chen · Hip', changes: ['New card'] },
    ]);
    const third = await publishUnitBook(edited, 'Main', 'Alex', { published: second.published });
    const after = (await subscribe((await subscribe(phone, second.file)).book, third.file)).book;
    expect(after.procedures.find(item => item.id === 'p1').unitBook.changes).toEqual([]);
    expect(unitAgeDays({ publishedAt: '2026-07-01T00:00:00.000Z' }, Date.parse('2026-10-23T00:00:00.000Z'))).toBe(114);
  });

  it('names changed sections only', () => {
    const before = emptyProcedure('s1', { name: 'Knee', blocks: emptyBlocks() });
    const after = { ...before, approach: 'Medial', blocks: { ...emptyBlocks(), note: { text: 'New', source: 'observed' } } };
    expect(changedSections(before, after)).toEqual(['Name', 'Note']);
    expect(changedSections(before, { ...before, blocks: { ...emptyBlocks(), note: { text: '', updatedBy: 'Someone else' } } })).toEqual([]);
  });
});

describe('publisher hand-over', () => {
  it('passes the key to the next publisher so phones keep accepting revisions', async () => {
    const first = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    const subscriber = (await subscribe(empty(), first.file)).book;

    const handover = await handOverPublishing(source(), 'Main', 'Alex', { published: first.published });
    expect(handover.revision).toBe(2);
    expect(handover.published.Main).toBeUndefined();
    const parsed = parseImport(JSON.stringify(handover.file));
    expect(parsed.type).toBe('publisher');
    const check = await checkHandover(parsed.handover);
    expect(check.ok).toBe(true);

    const nextPhone = (await subscribe(empty(), first.file)).book;
    const taken = takeOverPublishing(nextPhone, parsed.handover, { fingerprint: check.fingerprint });
    expect(taken.book.procedures.every(item => !item.unitBook)).toBe(true);
    expect(taken.book.surgeons.every(item => !item.unitBook)).toBe(true);
    expect(taken.entry).toMatchObject({ unitBookId: first.file.unitBookId, revision: 2, fingerprint: first.fingerprint });

    const edited = taken.book;
    edited.procedures[0] = { ...edited.procedures[0], name: 'Knee, new publisher' };
    const next = await publishUnitBook(edited, 'Main', 'Blair', { published: { Main: taken.entry } });
    expect(next.file.revision).toBe(3);
    const updated = await subscribe(subscriber, next.file);
    expect(updated.status).toBe('updated');
    expect(updated.book.procedures[0].name).toBe('Knee, new publisher');
  });

  it('refuses a hand-over whose key does not match the unit book', async () => {
    const first = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    const handover = await handOverPublishing(source(), 'Main', 'Alex', { published: first.published });
    const other = await generateSigningKey();
    expect((await checkHandover({ ...handover.file, privateKey: other.privateKey })).ok).toBe(false);
    expect((await handOverPublishing(source(), 'Main', 'Alex', { published: {} })).error).toBe('not-publisher');
  });

  it('will not publish under a new key when the place already has a key this phone lacks', async () => {
    const first = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    const keyless = { ...first.published.Main };
    delete keyless.privateKey;
    await expect(publishUnitBook(source(), 'Main', 'Alex', { published: { Main: keyless } })).rejects.toThrow('no-key');
  });

  it('refuses a hand-over for a unit book this phone trusts under another key', async () => {
    const real = await publishUnitBook(source(), 'Main', 'Alex', { published: {} });
    const phone = (await subscribe(empty(), real.file)).book;
    const impostor = await publishUnitBook(source(), 'Main', 'Sam', {
      published: { Main: { unitBookId: real.file.unitBookId, revision: 5 } },
    });
    const handover = await handOverPublishing(source(), 'Main', 'Sam', { published: impostor.published });
    const check = await checkHandover(handover.file);
    expect(check.ok).toBe(true);
    const taken = takeOverPublishing(phone, handover.file, { fingerprint: check.fingerprint });
    expect(taken.status).toBe('other-publisher');
    expect(taken.entry).toBeUndefined();
    expect(taken.book).toBe(phone);
  });
});

describe('two-person confirmation window', () => {
  it('counts only confirmations inside the staleness window', () => {
    const card = { id: 'p', confirmations: [
      { name: 'Alex', userId: 'alex', at: '2026-01-01T00:00:00.000Z' },
      { name: 'Blair', userId: 'blair', at: '2026-10-20T00:00:00.000Z' },
    ], lastConfirmedAt: '2026-10-20T00:00:00.000Z' };
    const now = Date.parse('2026-10-23T00:00:00.000Z');
    expect(trustState(card, { mode: 'facility', staleDays: 90, now }).status).toBe('noted');
    expect(trustState(card, { mode: 'facility', staleDays: 365, now }).status).toBe('confirmed');
  });
});
