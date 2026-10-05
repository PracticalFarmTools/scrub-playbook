import { describe, expect, it } from 'vitest';
import { DEMO_SURGEONS } from './defaults';
import { migrateBook } from './migrate';
import { findPhiSignals } from './phi';
import { resolveProductLink } from './productLink';
import { filterBook } from './searchBook';
import { mergeBackup, parseImport, qrFits, toBackup, toShareableCard } from './share';
import { LINK_FRESH_DAYS, QR_MAX_CHARS, STALE_AFTER_DAYS, emptyBlocks, emptyProcedure, textBlock } from './schema';
import { applySave, detectConflict, trustState, withConfirmation } from './trust';
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
