import { describe, expect, it } from 'vitest';
import { DEMO_SURGEONS } from './defaults';
import { migrateBook } from './migrate';
import { findPhiSignals } from './phi';
import { resolveProductLink } from './productLink';
import { filterBook } from './searchBook';
import { classifyIncomingCard, mergeBackup, parseImport, placeIncomingCard, qrFits, shareMessage, toBackup, toGlanceText, toShareableCard } from './share';
import { LINK_FRESH_DAYS, QR_MAX_CHARS, STALE_AFTER_DAYS, emptyBlocks, emptyProcedure, textBlock } from './schema';
import { resolveTodayTap, visibleToday } from './today';
import { applySave, detectConflict, rowTrust, trustState, withConfirmation } from './trust';
import { validateProcedure } from './validate';

describe('migrateBook', () => {
  const book = migrateBook(DEMO_SURGEONS);

  it('keeps glove, suture, nickname, assist, tip, and vendor from each demo card', () => {
    expect(book.surgeons).toHaveLength(3);
    expect(book.procedures).toHaveLength(3);
    const chen = book.procedures.find(p => book.surgeons.find(s => s.id === p.surgeonId)?.name === 'Dr. Marcus Chen');
    expect(chen.blocks.gloves.outer.model).toBe('Biogel Eclipse');
    expect(chen.blocks.gloves.outer.productId).toBe('g1');
    expect(chen.blocks.sutures.map(s => s.name)).toEqual(['Vicryl', 'Monocryl', 'Nylon/Ethilon']);
    expect(chen.blocks.sutures[0].needle).toBe('');
    expect(chen.blocks.nicknames[0].nickname).toBe('The Cobb');
    expect(chen.blocks.people[0].name).toBe('Jake Rivera');
    expect(chen.blocks.note.text).toMatch(/Bovie at 35\/35/);
    expect(chen.blocks.implants.map(i => i.systemName)).toEqual(['Stryker', 'Zimmer Biomet']);
    expect(chen.name).toBe('All cases (imported)');
  });

  it('turns a verified card into one confirmation, not a permanent badge', () => {
    const miller = book.procedures.find(p => book.surgeons.find(s => s.id === p.surgeonId)?.name === 'Dr. Miller');
    expect(miller.confirmations).toHaveLength(1);
    expect(miller.confirmations[0].name).toBe('Kyle');
    expect(miller.disputed).toBe(false);
  });

  it('leaves an unconfirmed card without a confirmation', () => {
    const chen = book.procedures.find(p => book.surgeons.find(s => s.id === p.surgeonId)?.name === 'Dr. Marcus Chen');
    expect(chen.confirmations).toHaveLength(0);
    expect(trustState(chen).status).toBe('unconfirmed');
  });

  it('is idempotent', () => {
    expect(migrateBook(book)).toBe(book);
  });

  it('marks demo ids', () => {
    expect(book.surgeons.every(s => s.demo)).toBe(true);
    expect(book.procedures.every(p => p.demo)).toBe(true);
  });
});

describe('trust', () => {
  const base = { disputed: false, confirmations: [], lastConfirmedAt: null };

  it('needs two different facility accounts', () => {
    const once = withConfirmation(base, { name: 'Alex', userId: 'a', at: '2026-10-01T00:00:00.000Z', mode: 'facility' });
    const twice = withConfirmation(once, { name: 'Alex', userId: 'a', at: '2026-10-02T00:00:00.000Z', mode: 'facility' });
    expect(trustState(twice, { mode: 'facility', now: Date.parse('2026-10-05T00:00:00.000Z') }).status).toBe('noted');
    const both = withConfirmation(twice, { name: 'Blair', userId: 'b', at: '2026-10-03T00:00:00.000Z', mode: 'facility' });
    expect(trustState(both, { mode: 'facility', now: Date.parse('2026-10-05T00:00:00.000Z') }).status).toBe('confirmed');
  });

  it('keeps one name on a personal confirmation', () => {
    const once = withConfirmation(base, { name: 'Alex', at: '2026-10-01T00:00:00.000Z' });
    const twice = withConfirmation(once, { name: 'Blair', at: '2026-10-02T00:00:00.000Z' });
    expect(twice.confirmations).toEqual([{ name: 'Blair', userId: null, at: '2026-10-02T00:00:00.000Z' }]);
    expect(trustState(twice, { now: Date.parse('2026-10-05T00:00:00.000Z') }).names).toEqual(['Blair']);
  });

  it('clears a match when the note changes and keeps it when the save is identical', () => {
    const confirmed = withConfirmation({
      ...base,
      name: 'Right total knee',
      blocks: { note: { text: 'Damp lap' } },
      official: { label: '', note: '' },
    }, { name: 'Alex', at: '2026-10-01T00:00:00.000Z' });
    const same = applySave(confirmed, confirmed, '2026-10-05T00:00:00.000Z');
    expect(same.confirmations).toHaveLength(1);
    const edited = applySave(confirmed, {
      ...confirmed,
      blocks: { note: { text: 'Dry lap' } },
    }, '2026-10-05T00:00:00.000Z');
    expect(edited.confirmations).toEqual([]);
    expect(edited.lastConfirmedAt).toBeNull();
  });

  it('goes stale from the clock', () => {
    const confirmed = withConfirmation(base, { name: 'Alex', at: '2026-01-01T00:00:00.000Z' });
    const state = trustState(confirmed, { now: Date.parse('2026-10-05T00:00:00.000Z'), staleDays: STALE_AFTER_DAYS });
    expect(state.status).toBe('stale');
  });

  it('detects an offline edit against a newer server row', () => {
    expect(detectConflict({ dirty: true, baseUpdatedAt: '2026-10-01T00:00:00.000Z' }, '2026-10-02T00:00:00.000Z')).toBe(true);
    expect(detectConflict({ dirty: true, baseUpdatedAt: '2026-10-02T00:00:00.000Z' }, '2026-10-02T00:00:00.000Z')).toBe(false);
  });
});

describe('phi', () => {
  it('pauses an MRN and ignores a glove note', () => {
    expect(findPhiSignals('MRN 1234567').length).toBeGreaterThan(0);
    expect(findPhiSignals('Biogel Eclipse 7.5, Vicryl 2-0')).toEqual([]);
  });
});

describe('share', () => {
  it('imports a verified backup as unconfirmed and skips demos on export', () => {
    const book = migrateBook(DEMO_SURGEONS);
    expect(toBackup(book).book.surgeons).toHaveLength(0);
    const real = migrateBook([{
      id: 'real-1',
      name: 'Dr. Real',
      specialty: 'Orthopedics',
      status: 'verified',
      lastVerifiedBy: 'Alex',
      lastVerifiedAt: '2026-10-01T00:00:00.000Z',
      gloveModel: 'Biogel Eclipse',
      sutures: [],
      nicknames: [],
      assists: [],
      tips: 'Damp lap',
      vendorLinks: [],
      createdAt: '2026-10-01T00:00:00.000Z',
    }]);
    const raw = JSON.stringify(toBackup(real));
    const parsed = parseImport(raw);
    expect(parsed.book.procedures[0].confirmations).toEqual([]);
    expect(parsed.book.procedures[0].lastConfirmedAt).toBeNull();
  });

  it('hides the QR when the payload is past the limit', () => {
    expect(qrFits('x'.repeat(QR_MAX_CHARS))).toBe(true);
    expect(qrFits('x'.repeat(QR_MAX_CHARS + 1))).toBe(false);
  });

  it('fits a short case in a QR code and restores empty blocks on import', () => {
    const surgeon = { name: 'Dr. Test', specialty: 'General Surgery', facility: 'Test OR', demo: false };
    const procedure = emptyProcedure('surgeon-1', {
      name: 'Right total knee',
      blocks: {
        ...emptyBlocks(),
        note: textBlock('Damp lap on the field', 'Alex'),
        trays: [{ id: 't1', commonName: 'Knee tray', spdName: 'SPD-KNEE', vendorName: '', openOrHold: 'open' }],
        sutures: [{ id: 'su1', layer: 'Fascia', name: 'Vicryl', size: '3-0', needle: 'CT-1', color: '#8E44AD', textColor: 'white', open: '', hold: '', productId: 'suture-vicryl', catalogNumber: '' }],
        nicknames: [{ nickname: 'The Cobb', actual: 'Cobb Elevator' }],
      },
    });
    const share = toShareableCard(surgeon, procedure);
    expect(share.showQr).toBe(true);
    expect(share.text.length).toBeLessThanOrEqual(QR_MAX_CHARS);
    const parsed = parseImport(share.text);
    expect(parsed.book.procedures[0].blocks.note.text).toBe('Damp lap on the field');
    expect(parsed.book.procedures[0].blocks.room.text).toBe('');
    expect(parsed.book.procedures[0].confirmations).toEqual([]);
    const long = toShareableCard(surgeon, {
      ...procedure,
      blocks: { ...procedure.blocks, note: textBlock('x'.repeat(1200), 'Alex') },
    });
    expect(long.showQr).toBe(false);
  });

  it('refuses to share a sample', () => {
    const book = migrateBook(DEMO_SURGEONS);
    expect(toShareableCard(book.surgeons[0], book.procedures[0]).error).toMatch(/Sample/);
  });

  it('does not keep a typed co-sign when a legacy card is imported', () => {
    const parsed = parseImport(JSON.stringify({
      kind: 'scrubplaybook-card',
      v: 1,
      name: 'Dr. Import',
      specialty: 'ENT',
      status: 'verified',
      confirmedBy: ['A', 'B'],
      lastVerifiedBy: 'A',
      lastVerifiedAt: '2026-10-01T00:00:00.000Z',
      gloveModel: 'Protexis PI',
      sutures: [],
      tips: '',
    }));
    expect(parsed.book.procedures[0].confirmations).toEqual([]);
    expect(parsed.book.procedures[0].blocks.gloves.outer.model).toBe('Protexis PI');
  });

  it('skips duplicate ids on backup merge', () => {
    const book = migrateBook([{ id: 'real-1', name: 'Dr. Real', specialty: 'ENT', sutures: [], status: 'unconfirmed' }]);
    const again = mergeBackup(book, book);
    expect(again.imported).toBe(0);
    expect(again.book.surgeons).toHaveLength(1);
  });

  it('writes the glance a person can read and keeps the card behind the fence', () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main OR', demo: false };
    const procedure = emptyProcedure('surgeon-1', {
      name: 'Right total knee',
      confirmations: [{ name: 'Blair', userId: null, at: '2026-10-01T00:00:00.000Z' }],
      lastConfirmedAt: '2026-10-01T00:00:00.000Z',
      official: { label: 'Knee card', reviewedAt: null, note: '' },
      blocks: {
        ...emptyBlocks(),
        gloves: { outer: { model: 'Biogel Eclipse', size: '7.5' }, inner: null },
        sutures: [{ id: 'su1', layer: 'Fascia', name: 'Vicryl', size: '2-0', needle: 'CT-1', open: '2', hold: '1' }],
        trays: [{ id: 't1', commonName: 'Knee tray', spdName: 'SPD-KNEE', openOrHold: 'open' }],
        nicknames: [{ nickname: 'The Cobb', actual: 'Cobb Elevator' }],
        note: textBlock('Damp lap on the field', 'Blair'),
      },
    });
    const glance = toGlanceText(surgeon, procedure);
    expect(glance.text).toContain('Dr. Chen · Orthopedics');
    expect(glance.text).toContain('Procedure: Right total knee');
    expect(glance.text).toContain('Outer: Biogel Eclipse 7.5');
    expect(glance.text).toContain('Fascia · Vicryl 2-0 CT-1 · open 2 · hold 1');
    expect(glance.text).toContain('Arrives unconfirmed. Confirm after you are in the room.');
    expect(glance.text).not.toContain('Blair');
    expect(glance.text).not.toContain('\nImplants\n');

    const message = shareMessage(surgeon, procedure);
    const parsed = parseImport(message.message);
    expect(parsed.book.procedures[0].blocks.note.text).toBe('Damp lap on the field');
    expect(parsed.book.procedures[0].blocks.trays[0].commonName).toBe('Knee tray');
    expect(parsed.book.procedures[0].blocks.sutures[0].name).toBe('Vicryl');
    expect(parsed.book.procedures[0].blocks.gloves.outer.model).toBe('Biogel Eclipse');
    expect(parsed.book.procedures[0].confirmations).toEqual([]);
    expect(() => parseImport('Dr. Chen\nProcedure: Right total knee')).toThrow(/no-card/);

    const fenced = shareMessage(surgeon, emptyProcedure('surgeon-1', {
      name: 'Right total knee',
      blocks: { ...emptyBlocks(), note: textBlock('Note mentions --- scrubplaybook --- inside', 'Alex') },
    }));
    expect(parseImport(fenced.message).book.procedures[0].blocks.note.text).toContain('scrubplaybook');
  });

  it('keeps the code on the payload length when the glance makes the message longer', () => {
    const surgeon = { name: 'Dr. Test', specialty: 'General Surgery', facility: '', demo: false };
    let note = 'Damp lap. ';
    let share = shareMessage(surgeon, emptyProcedure('s', { name: 'Knee', blocks: { ...emptyBlocks(), note: textBlock(note, 'Alex') } }));
    while (share.message.length <= QR_MAX_CHARS && share.payloadText.length + 40 <= QR_MAX_CHARS) {
      note += 'Keep the field dry. ';
      share = shareMessage(surgeon, emptyProcedure('s', {
        name: 'Knee',
        blocks: { ...emptyBlocks(), note: textBlock(note, 'Alex') },
      }));
    }
    expect(share.payloadText.length).toBeLessThanOrEqual(QR_MAX_CHARS);
    expect(share.message.length).toBeGreaterThan(QR_MAX_CHARS);
    expect(share.showQr).toBe(true);
    expect(share.showQr).toBe(qrFits(share.payloadText));
  });

  it('refuses a glance of a sample', () => {
    const book = migrateBook(DEMO_SURGEONS);
    expect(toGlanceText(book.surgeons[0], book.procedures[0]).error).toMatch(/Sample/);
  });

  it('attaches a second share to the surgeon already in the book', () => {
    const book = {
      version: 1,
      surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main OR', demo: false }],
      procedures: [emptyProcedure('s1', { name: 'Left knee' })],
    };
    const incoming = parseImport(shareMessage(
      { name: 'chen', specialty: 'Orthopedics', facility: '', demo: false },
      emptyProcedure('x', { name: 'Right total knee', blocks: { ...emptyBlocks(), note: textBlock('Damp lap', 'Alex') } }),
    ).message).book;
    expect(classifyIncomingCard(book, incoming.surgeons[0], incoming.procedures[0]).kind).toBe('attach');
    const placed = placeIncomingCard(book, incoming, { surgeonId: 's1' });
    expect(placed.book.surgeons).toHaveLength(1);
    expect(placed.book.procedures).toHaveLength(2);
    expect(placed.book.procedures[1].confirmations).toEqual([]);

    const otherSpecialty = parseImport(shareMessage(
      { name: 'Dr. Chen', specialty: 'ENT', facility: '', demo: false },
      emptyProcedure('x', { name: 'Tonsils' }),
    ).message).book;
    expect(classifyIncomingCard(book, otherSpecialty.surgeons[0], otherSpecialty.procedures[0]).kind).toBe('new');

    const sameName = parseImport(shareMessage(
      { name: 'Dr. Chen', specialty: 'Orthopedics', demo: false },
      emptyProcedure('x', { name: 'Left knee' }),
    ).message).book;
    expect(classifyIncomingCard(book, sameName.surgeons[0], sameName.procedures[0]).kind).toBe('duplicate');
  });

  it('leaves the day list out of a book backup', () => {
    const book = migrateBook([{ id: 'real-1', name: 'Dr. Real', specialty: 'ENT', sutures: [], status: 'unconfirmed' }]);
    const backup = toBackup(book);
    expect(backup.items).toBeUndefined();
    expect(JSON.stringify(backup)).not.toContain('scrubplaybook_today');
  });
});

describe('today', () => {
  const surgeon = { id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', demo: false };
  const procedure = emptyProcedure('s1', { name: 'Right total knee' });
  const book = { surgeons: [surgeon], procedures: [procedure] };

  it('opens a matching line and starts a missing one', () => {
    expect(resolveTodayTap(book, { surgeonName: 'chen', procedureName: 'Right total knee' }).action).toBe('open');
    expect(resolveTodayTap(book, { surgeonName: 'Dr. Chen', procedureName: 'Left knee' }).action).toBe('start-procedure');
    expect(resolveTodayTap(book, { surgeonName: 'Dr. Patel', procedureName: 'Lap chole' }).action).toBe('start-surgeon');
    const anne = { surgeons: [{ id: 'a', name: 'Anne', specialty: 'ENT', demo: false }], procedures: [] };
    expect(resolveTodayTap(anne, { surgeonName: 'Ann', procedureName: 'Case' }).action).toBe('start-surgeon');
    const twins = {
      surgeons: [surgeon, { ...surgeon, id: 's2', name: 'Chen' }],
      procedures: [procedure],
    };
    expect(resolveTodayTap(twins, { surgeonName: 'Dr. Chen', procedureName: 'Right total knee' }).action).toBe('choose');
  });

  it('drops yesterday’s list', () => {
    expect(visibleToday({ day: '2026-10-04', items: [{ id: 'a', startsAt: '07:30' }] }, '2026-10-05')).toEqual([]);
    expect(visibleToday({
      day: '2026-10-05',
      items: [
        { id: 'late', startsAt: '15:00' },
        { id: 'early', startsAt: '07:30' },
        { id: 'blank', startsAt: '' },
      ],
    }, '2026-10-05').map(item => item.id)).toEqual(['early', 'late', 'blank']);
  });

  it('pauses a today line that says patient', () => {
    expect(findPhiSignals('3\nDr. Chen\npatient positioning').length).toBeGreaterThan(0);
  });
});

describe('row trust', () => {
  const now = Date.parse('2026-10-05T00:00:00.000Z');
  const confirmed = (at) => withConfirmation({ disputed: false, confirmations: [], lastConfirmedAt: null }, { name: 'Alex', at });

  it('shows the worst state and the latest match', () => {
    expect(rowTrust([])).toBeNull();
    expect(rowTrust([{ disputed: true }, confirmed('2026-10-01T00:00:00.000Z')], { now }).label).toBe('Flagged');
    expect(rowTrust([
      { disputed: false, confirmations: [], lastConfirmedAt: null },
      withConfirmation({ disputed: false, confirmations: [], lastConfirmedAt: null }, { name: 'Alex', at: '2026-01-01T00:00:00.000Z' }),
    ], { now }).label).toBe('Unconfirmed');
    expect(rowTrust([
      confirmed('2026-01-01T00:00:00.000Z'),
      confirmed('2026-10-01T00:00:00.000Z'),
    ], { now, staleDays: STALE_AFTER_DAYS }).label).toBe('Stale');
    const matched = rowTrust([
      confirmed('2026-09-01T00:00:00.000Z'),
      confirmed('2026-10-01T00:00:00.000Z'),
    ], { now, staleDays: STALE_AFTER_DAYS });
    expect(matched.label).toBe('Matched a case');
    expect(matched.at).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('product links', () => {
  const now = Date.parse('2026-10-05T00:00:00.000Z');

  it('opens Biogel Eclipse on Mölnlycke’s product page', () => {
    const link = resolveProductLink({ productId: 'g1', now });
    expect(link.kind).toBe('product-page');
    expect(link.href).toMatch(/molnlycke\.com\/.+biogel-eclipse/);
  });

  it('uses an Ethicon catalog code only when one is stored', () => {
    expect(resolveProductLink({ productId: 'suture-vicryl', now }).kind).toBe('company');
    const coded = resolveProductLink({ productId: 'suture-vicryl', catalogNumber: 'J496G', now });
    expect(coded.kind).toBe('catalog-code');
    expect(coded.href).toBe('https://www.ethicon.com/na/epc/code/J496G');
  });

  it('prefers a hospital https override and drops a stale product page', () => {
    const hospital = resolveProductLink({ productId: 'g1', overrideUrl: 'https://example.com/pack', now });
    expect(hospital.kind).toBe('hospital');
    const stale = resolveProductLink({
      productId: 'g1',
      now: Date.parse('2026-10-05T00:00:00.000Z') + (LINK_FRESH_DAYS + 5) * 86400000,
    });
    expect(stale.kind).toBe('company');
  });
});

describe('search and validate', () => {
  it('finds a suture name', () => {
    const book = migrateBook(DEMO_SURGEONS);
    const found = filterBook(book, 'Vicryl');
    expect(found.procedures.length).toBeGreaterThan(0);
    expect(found.surgeons.some(s => s.name === 'Dr. Marcus Chen')).toBe(true);
  });

  it('rejects a patient slot', () => {
    const book = migrateBook([{ id: 'real-1', name: 'Dr. Real', specialty: 'ENT', sutures: [], status: 'unconfirmed' }]);
    const procedure = { ...book.procedures[0], patient: 'nope' };
    expect(validateProcedure(procedure).length).toBeGreaterThan(0);
    expect(validateProcedure(book.procedures[0])).toEqual([]);
  });
});
