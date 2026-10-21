import { describe, expect, it } from 'vitest';
import { DEMO_SURGEONS, buildSampleBook } from './defaults';
import { migrateBook } from './migrate';
import { findPhiInSurgeon, findPhiSignals } from './phi';
import { resolveProductLink } from './productLink';
import { archivePlace, deletePlace } from './places';
import { facilityLabels, filterBook } from './searchBook';
import { classifyIncomingCard, importPreviewText, instrumentLines, mergeBackup, parseImport, placeIncomingCard, qrFits, shareMessage, suggestionText, toBackup, toGlanceText, toPlacePack, toShareableCard } from './share';
import { LINK_FRESH_DAYS, QR_MAX_CHARS, STALE_AFTER_DAYS, cleanInstruments, cleanSteps, emptyBlocks, emptyProcedure, textBlock } from './schema';
import { loadToday, resolveTodayTap, visibleDay } from './today';
import { applySave, detectConflict, rowTrust, trustState, withConfirmation } from './trust';
import { applyUnitBook, publishUnitBook, unitPreviewText } from './unitBook';
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

  it('upgrades a version 1 book and keeps the confirmation', () => {
    const v1 = {
      version: 1,
      surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }],
      procedures: [{
        id: 'p1',
        surgeonId: 's1',
        name: 'Right total knee',
        confirmations: [{ name: 'Blair', userId: null, at: '2026-10-01T00:00:00.000Z' }],
        lastConfirmedAt: '2026-10-01T00:00:00.000Z',
        blocks: {
          note: { text: 'Damp lap' },
          gloves: { outer: { model: 'Biogel Eclipse', size: '7.5' } },
          sutures: [{ name: 'Vicryl' }],
        },
      }],
    };
    const next = migrateBook(v1);
    expect(next.version).toBe(2);
    expect(next.procedures[0].confirmations).toHaveLength(1);
    expect(next.procedures[0].lastConfirmedAt).toBe('2026-10-01T00:00:00.000Z');
    expect(next.procedures[0].blocks.note.text).toBe('Damp lap');
    expect(next.procedures[0].blocks.gloves.outer.model).toBe('Biogel Eclipse');
    expect(next.procedures[0].blocks.sutures[0].name).toBe('Vicryl');
    expect(next.procedures[0].blocks.position.text).toBe('');
    expect(next.procedures[0].blocks.steps).toEqual([]);
    expect(next.procedures[0].approach).toBe('');
    expect(next.surgeons[0].firstCase).toEqual([]);
    expect(next.surgeons[0].archived).toBe(false);
    expect(migrateBook(next)).toBe(next);
    const imported = parseImport(JSON.stringify({ kind: 'scrubplaybook-backup', v: 2, book: v1 }));
    expect(imported.book.version).toBe(2);
    expect(imported.book.procedures[0].blocks.prep.text).toBe('');
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
    const approachOnly = applySave(confirmed, { ...confirmed, approach: 'Anterior' }, '2026-10-05T00:00:00.000Z');
    expect(approachOnly.confirmations).toEqual([]);
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
    expect(findPhiSignals('patient positioning')).toEqual([]);
    expect(findPhiSignals('Patient supine, arms tucked')).toEqual([]);
    expect(findPhiSignals('Pt in beach chair')).toEqual([]);
    expect(findPhiSignals('Patient name: Smith').some(hit => hit.id === 'patient-name')).toBe(true);
    expect(findPhiSignals('pt’s name is Ann').some(hit => hit.id === 'patient-name')).toBe(true);
    expect(findPhiSignals('Patient #4471').some(hit => hit.id === 'patient-number')).toBe(true);
    expect(findPhiSignals('patient number 12').some(hit => hit.id === 'patient-number')).toBe(true);
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

  it('shares the approach and keeps a different approach as its own procedure', () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', facility: '', demo: false };
    const procedure = emptyProcedure('s1', {
      name: 'Right THA',
      approach: 'Anterior',
      blocks: { ...emptyBlocks(), position: textBlock('Supine, arms out', 'Alex') },
    });
    const glance = toGlanceText(surgeon, procedure);
    expect(glance.text).toContain('Procedure: Right THA · Anterior');
    expect(glance.text).toContain('Supine, arms out');
    const parsed = parseImport(shareMessage(surgeon, procedure).message);
    expect(parsed.book.procedures[0].approach).toBe('Anterior');
    expect(parsed.book.procedures[0].blocks.position.text).toBe('Supine, arms out');
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: '', demo: false }], procedures: [procedure] };
    expect(classifyIncomingCard(book, surgeon, emptyProcedure('x', { name: 'Right THA', approach: 'Posterior' })).kind).toBe('attach');
    expect(filterBook(book, 'anterior').procedures).toHaveLength(1);
  });

  it('keeps case-flow order through a share and drops an empty step', () => {
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', demo: false };
    const procedure = emptyProcedure('s1', {
      name: 'Right total knee',
      blocks: {
        ...emptyBlocks(),
        steps: [
          { id: 'a', title: 'Exposure', ready: 'Cobb', habit: 'Says “Cobb”' },
          { id: 'b', title: '  ', ready: 'skip', habit: '' },
          { id: 'c', title: 'Closing', ready: 'Vicryl', habit: '' },
        ],
      },
    });
    expect(cleanSteps(procedure.blocks.steps).map(step => step.title)).toEqual(['Exposure', 'Closing']);
    const message = shareMessage(surgeon, procedure);
    expect(message.glance.indexOf('1. Exposure')).toBeLessThan(message.glance.indexOf('2. Closing'));
    expect(message.glance).toContain('Have ready: Cobb');
    const parsed = parseImport(message.message);
    expect(parsed.book.procedures[0].blocks.steps.map(step => step.title)).toEqual(['Exposure', '  ', 'Closing']);
    const book = { surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', demo: false }], procedures: [procedure] };
    expect(filterBook(book, 'cobb').procedures).toHaveLength(1);
  });

  it('carries first-case lines to a new surgeon and leaves an existing surgeon alone', () => {
    const surgeon = {
      name: 'Dr. Chen',
      specialty: 'Orthopedics',
      facility: 'Main Hospital OR',
      demo: false,
      firstCase: ['Bovie at 35/35.', 'Jake Rivera usually assists.'],
    };
    const procedure = emptyProcedure('s1', { name: 'Right total knee' });
    const message = shareMessage(surgeon, procedure);
    expect(message.glance.indexOf('Arrives unconfirmed')).toBeLessThan(message.glance.indexOf('New to Dr. Chen'));
    expect(message.glance).toContain('Bovie at 35/35.');
    const parsed = parseImport(message.message);
    expect(parsed.book.surgeons[0].firstCase).toEqual(['Bovie at 35/35.', 'Jake Rivera usually assists.']);
    expect(parsed.book.surgeons[0].firstCaseBy).toBe('Imported');

    const book = {
      surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main Hospital OR', demo: false, firstCase: ['Keep mine'] }],
      procedures: [],
    };
    expect(classifyIncomingCard(book, parsed.book.surgeons[0], parsed.book.procedures[0]).kind).toBe('attach');
    const placed = placeIncomingCard(book, parsed.book, { surgeonId: 's1' });
    expect(placed.book.surgeons[0].firstCase).toEqual(['Keep mine']);
    expect(filterBook({
      surgeons: [{ id: 's1', name: 'Dr. Chen', specialty: 'Orthopedics', demo: false, firstCase: ['Bovie at 35/35.'] }],
      procedures: [procedure],
    }, 'bovie').surgeons).toHaveLength(1);
    expect(findPhiInSurgeon({ name: 'Dr. Chen', firstCase: ['patient number 12'] }).map(hit => hit.id)).toContain('patient-number');
    expect(findPhiInSurgeon({ name: 'Dr. Chen', facility: 'Patient #4471' }).map(hit => hit.id)).toContain('patient-number');

    const samples = buildSampleBook();
    expect(samples.surgeons.find(item => item.id === 'demo-1').firstCase).toEqual([
      'Calls the Cobb elevator “The Cobb.”',
      'Bovie at 35/35.',
      'Jake Rivera usually assists.',
    ]);
    expect(samples.surgeons.find(item => item.id === 'demo-miller').firstCase[0]).toBe('Room lights off for the start.');
  });

  it('splits Mayo instruments from the rest and keeps a nickname', () => {
    const blocks = {
      ...emptyBlocks(),
      instruments: [
        { id: 'i1', name: 'Cobb elevator', from: 'Major', mayo: true },
        { id: 'i2', name: '', from: 'x', mayo: false },
        { id: 'i3', name: 'Army-Navy', from: 'Major', mayo: false },
      ],
      nicknames: [{ nickname: 'The Cobb', actual: 'Cobb elevator' }],
    };
    expect(cleanInstruments(blocks.instruments).map(item => item.name)).toEqual(['Cobb elevator', 'Army-Navy']);
    const lines = instrumentLines(blocks);
    expect(lines.mayo).toEqual(['Cobb elevator “The Cobb”']);
    expect(lines.rest).toEqual(['Army-Navy (from Major)']);
    const surgeon = { name: 'Dr. Chen', specialty: 'Orthopedics', demo: false };
    const procedure = emptyProcedure('s1', { name: 'Knee', blocks });
    const parsed = parseImport(shareMessage(surgeon, procedure).message);
    expect(parsed.book.procedures[0].blocks.instruments[0].mayo).toBe(true);
    expect(filterBook({ surgeons: [{ id: 's1', name: 'Dr. Chen', demo: false }], procedures: [procedure] }, 'army-navy').procedures).toHaveLength(1);
  });

  it('writes a card suggestion the owner can read', () => {
    const text = suggestionText({
      surgeon: { name: 'Dr. Chen' },
      procedure: { name: 'Right THA', approach: 'Anterior', official: { label: 'Ortho card 4' } },
      cardSays: 'Bovie 30',
      seen: 'Bovie at 35/35',
      change: 'Change the card to 35/35',
      from: 'Alex',
      date: 'Oct 21, 2026',
    });
    expect(text).toBe([
      'Preference card suggestion',
      'Dr. Chen · Right THA · Anterior',
      'Official card: Ortho card 4',
      'The card says: Bovie 30',
      'Seen in the room: Bovie at 35/35',
      'Suggested change: Change the card to 35/35',
      'From: Alex · Oct 21, 2026',
      'Staff note. The surgeon and the card owner decide.',
    ].join('\n'));
    expect(findPhiSignals('Patient #4471').map(hit => hit.id)).toContain('patient-number');
  });

  it('packs one place and previews the hand-off', () => {
    const kept = withConfirmation(emptyProcedure('s1', { name: 'Knee' }), { name: 'Alex' });
    const book = {
      surgeons: [
        { id: 's1', name: 'Dr. Chen', facility: 'Main Hospital OR', demo: false, archived: true },
        { id: 's2', name: 'Dr. Patel', facility: 'Other', demo: false },
        { id: 'demo-1', name: 'Sample', facility: 'Main Hospital OR', demo: true },
      ],
      procedures: [
        kept,
        emptyProcedure('s2', { name: 'Other case' }),
        emptyProcedure('demo-1', { name: 'Sample setup', demo: true }),
      ],
    };
    const pack = toPlacePack(book, 'Main Hospital OR', 'Alex', '2026-10-21T00:00:00.000Z');
    expect(pack.book.surgeons.map(item => item.name)).toEqual(['Dr. Chen']);
    expect(pack.book.surgeons[0].archived).toBe(false);
    expect(pack.book.procedures.map(item => item.name)).toEqual(['Knee']);
    expect(pack.book.procedures[0].confirmations).toEqual([]);
    expect(JSON.stringify(pack)).not.toContain('Sample setup');
    const parsed = parseImport(JSON.stringify(pack));
    expect(parsed.book.surgeons[0].archived).toBe(false);
    expect(importPreviewText(parsed)).toBe('Hand-off for Main Hospital OR from Alex: 1 surgeons, 1 procedures. They arrive unconfirmed.');
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

  it('converts the old list, drops yesterday, and keeps tomorrow off today', () => {
    const converted = loadToday({
      day: '2026-10-05',
      items: [
        { id: 'late', startsAt: '15:00' },
        { id: 'early', startsAt: '07:30' },
        { id: 'blank', startsAt: '' },
      ],
    }, '2026-10-05');
    expect(converted.v).toBe(2);
    expect(converted.items.every(item => item.day === '2026-10-05')).toBe(true);
    expect(visibleDay(converted, '2026-10-05').map(item => item.id)).toEqual(['early', 'late', 'blank']);
    expect(loadToday({ day: '2026-10-04', items: [{ id: 'a', startsAt: '07:30' }] }, '2026-10-05').items).toEqual([]);
    const mixed = {
      v: 2,
      items: [
        { id: 'today', day: '2026-10-05', startsAt: '07:00' },
        { id: 'tomorrow', day: '2026-10-06', startsAt: '08:00' },
        { id: 'old', day: '2026-10-04', startsAt: '06:00' },
      ],
    };
    expect(loadToday(mixed, '2026-10-05').items.map(item => item.id)).toEqual(['today', 'tomorrow']);
    expect(visibleDay(mixed, '2026-10-05').map(item => item.id)).toEqual(['today']);
    expect(visibleDay(mixed, '2026-10-06').map(item => item.id)).toEqual(['tomorrow']);
  });

  it('hides an archived place, restores it, and deletes only that place', () => {
    const book = {
      surgeons: [
        { id: 's1', name: 'Dr. Chen', facility: 'Main', demo: false, archived: false },
        { id: 's2', name: 'Dr. Patel', facility: 'Other', demo: false },
      ],
      procedures: [
        emptyProcedure('s1', { name: 'Knee' }),
        emptyProcedure('s2', { name: 'Lap' }),
      ],
    };
    const archived = archivePlace(book, 'Main', true);
    expect(filterBook(archived, '').surgeons.map(item => item.id)).toEqual(['s2']);
    expect(facilityLabels(archived)).toEqual(['Other']);
    expect(resolveTodayTap(archived, { surgeonName: 'Dr. Chen', procedureName: 'Knee' }).action).toBe('start-surgeon');
    expect(classifyIncomingCard(archived, { name: 'Dr. Chen', facility: 'Main' }, { name: 'Knee', approach: '' }).kind).toBe('new');
    const restored = archivePlace(archived, 'Main', false);
    expect(filterBook(restored, 'chen').surgeons).toHaveLength(1);
    const removed = deletePlace(restored, 'Main');
    expect(removed.surgeons.map(item => item.id)).toEqual(['s2']);
    expect(removed.procedures.map(item => item.surgeonId)).toEqual(['s2']);
    expect(toBackup(archived).book.surgeons.map(item => item.id).sort()).toEqual(['s1', 's2']);
  });

  it('asks which approach when two procedures share a name', () => {
    const anterior = emptyProcedure('s1', { name: 'Knee', approach: 'Anterior' });
    const posterior = emptyProcedure('s1', { name: 'Knee', approach: 'Posterior' });
    const result = resolveTodayTap(
      { surgeons: [surgeon], procedures: [anterior, posterior] },
      { surgeonName: 'Dr. Chen', procedureName: 'Knee' },
    );
    expect(result.action).toBe('choose');
    expect(result.procedures.map(item => item.approach).sort()).toEqual(['Anterior', 'Posterior']);
  });

  it('pauses a today line that says patient', () => {
    expect(findPhiSignals('3\nDr. Chen\npatient positioning')).toEqual([]);
    expect(findPhiSignals('3\nDr. Chen\npatient name Smith').length).toBeGreaterThan(0);
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

describe('unit book', () => {
  it('replaces a newer revision, keeps a match on an unchanged card, and leaves personal cards', () => {
    const blocks = emptyBlocks();
    const unitProcedure = emptyProcedure('surg-1', { id: 'proc-1', name: 'Knee', approach: 'Anterior', blocks });
    const confirmed = {
      ...withConfirmation(unitProcedure, { name: 'Alex', at: '2026-10-01T00:00:00.000Z' }),
      unitBook: { id: 'unit-1', revision: 1 },
    };
    const gone = { ...emptyProcedure('surg-1', { id: 'proc-old', name: 'Retired', blocks }), unitBook: { id: 'unit-1', revision: 1 } };
    const personal = withConfirmation(emptyProcedure('mine', { id: 'personal-1', name: 'My knee', blocks }), { name: 'Alex', at: '2026-10-02T00:00:00.000Z' });
    const book = {
      version: 2,
      surgeons: [
        { id: 'surg-1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false, unitBook: { id: 'unit-1', revision: 1 } },
        { id: 'mine', name: 'Me', specialty: 'Orthopedics', facility: 'Main', demo: false },
      ],
      procedures: [confirmed, gone, personal],
    };
    const file = {
      kind: 'scrubplaybook-unitbook',
      v: 1,
      unitBookId: 'unit-1',
      place: 'Main',
      revision: 2,
      publishedBy: 'Alex',
      book: {
        version: 2,
        surgeons: [{ id: 'surg-1', name: 'Dr. Chen', specialty: 'Orthopedics', facility: 'Main', demo: false }],
        procedures: [emptyProcedure('surg-1', { id: 'proc-1', name: 'Knee', approach: 'Anterior', blocks })],
      },
    };
    const updated = applyUnitBook(book, file);
    expect(updated.status).toBe('updated');
    expect(updated.book.procedures.find(item => item.id === 'proc-1').confirmations).toHaveLength(1);
    expect(updated.book.procedures.find(item => item.id === 'proc-1').unitBook).toEqual({ id: 'unit-1', revision: 2 });
    expect(updated.book.procedures.some(item => item.id === 'proc-old')).toBe(false);
    expect(updated.book.procedures.find(item => item.id === 'personal-1').confirmations).toHaveLength(1);
    expect(updated.book.procedures.find(item => item.id === 'personal-1').unitBook).toBeUndefined();
    expect(applyUnitBook(updated.book, file).status).toBe('older');
    expect(applyUnitBook(updated.book, file).revision).toBe(2);

    const changed = applyUnitBook(updated.book, {
      ...file,
      revision: 3,
      book: {
        ...file.book,
        procedures: [emptyProcedure('surg-1', { id: 'proc-1', name: 'Knee revised', approach: 'Anterior', blocks })],
      },
    });
    expect(changed.book.procedures.find(item => item.id === 'proc-1').confirmations).toEqual([]);
    expect(changed.book.procedures.find(item => item.id === 'personal-1').name).toBe('My knee');

    const source = {
      surgeons: [
        { id: 'surg-1', name: 'Dr. Chen', facility: 'Main', demo: false },
        { id: 'demo-1', name: 'Sample', facility: 'Main', demo: true },
      ],
      procedures: [withConfirmation(emptyProcedure('surg-1', { id: 'proc-1', name: 'Knee', blocks }), { name: 'Alex' })],
    };
    const first = publishUnitBook(source, 'Main', 'Alex', { now: '2026-10-21T00:00:00.000Z', published: {}, persist: false });
    const second = publishUnitBook(source, 'Main', 'Alex', { published: first.published, persist: false });
    expect(second.file.revision).toBe(2);
    expect(second.file.unitBookId).toBe(first.file.unitBookId);
    expect(second.file.book.procedures[0].confirmations).toEqual([]);
    expect(second.file.book.surgeons.map(item => item.id)).toEqual(['surg-1']);
    expect(unitPreviewText(first.file)).toBe('Unit book for Main, revision 1 from Alex.');
    expect(parseImport(JSON.stringify(first.file)).type).toBe('unitbook');
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
