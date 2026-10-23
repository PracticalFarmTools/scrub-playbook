import { describe, expect, it } from 'vitest';
import { buildSampleBook } from './defaults';
import { findPhiInBook, findPhiInProcedure, findPhiSignals, phiFoundText } from './phi';
import { emptyBlocks, emptyProcedure, textBlock } from './schema';

const ids = (text) => findPhiSignals(text).map(hit => hit.id);

describe('patient-detail check', () => {
  it.each([
    ['Mr. Jones in bay 4', 'titled-name'],
    ['Mrs Smith', 'titled-name'],
    ['born 01/02/1955', 'dob'],
    ['d.o.b. on the sticker', 'dob'],
    ['seen 10/23/2026', 'date'],
    ['2026-10-23 case', 'date'],
    ['Oct 23, 2026', 'date'],
    ['23 Oct 2026', 'date'],
    ['call 555-123-4567', 'phone'],
    ['(555) 123-4567', 'phone'],
    ['acct 12345', 'account'],
    ['FIN# 98765', 'account'],
    ['CSN 4471', 'account'],
    ['Pt Smith, Robert', 'patient-name'],
    ['patient named Ann', 'patient-name'],
    ['Ancef 2 g', 'dose'],
    ['2g Ancef', 'dose'],
    ['Marcaine 30 cc', 'dose'],
    ['vanc 1gm', 'dose'],
    ['10 units heparin', 'dose'],
    ['lidocaine 1% 10 ml', 'dose'],
  ])('pauses on %s', (text, id) => {
    expect(ids(text)).toContain(id);
  });

  it.each([
    'Vicryl 2-0', '3-0 Monocryl', 'Bovie 40/40', 'Bovie 35/35, smoke evac', 'size 7.5', 'Patient supine, arms tucked',
    'Pt in beach chair', 'MS 4', 'Stryker, Mako', '60 cc syringe', '10 cc Luer', '3000 ml bags', 'Irrigation 3000 ml',
    'saline 3000 ml', '18g spinal', '18 g needle', '18g', '1/2 inch', 'J345H', '0730 start', 'OR 4', 'May 2026 tray change',
    'Dr. Chen', 'patient positioning',
  ])('lets setup language through: %s', (text) => {
    expect(ids(text)).toEqual([]);
  });

  it('does not pause on catalog numbers that look like dates or sizes', () => {
    const procedure = emptyProcedure('s', {
      name: 'Knee',
      blocks: { ...emptyBlocks(), sutures: [{ id: 'a', name: 'Vicryl', catalogNumber: '10-12-2026', overrideUrl: 'https://example.com/item/555-123-4567?size=2g' }] },
    });
    expect(findPhiInProcedure(procedure)).toEqual([]);
  });

  it('raises no pause anywhere in the sample book', () => {
    const book = buildSampleBook();
    const asOwn = {
      surgeons: book.surgeons.map(surgeon => ({ ...surgeon, demo: false })),
      procedures: book.procedures.map(procedure => ({ ...procedure, demo: false })),
    };
    expect(findPhiInBook(asOwn)).toEqual([]);
  });

  it('names the card that would leave the phone with a patient detail', () => {
    const book = {
      surgeons: [{ id: 's1', name: 'Dr. Chen', firstCase: [] }, { id: 's2', name: 'Dr. Patel', firstCase: ['Mr. Jones likes music'] }],
      procedures: [emptyProcedure('s1', { name: 'Knee', blocks: { ...emptyBlocks(), note: textBlock('MRN 1234567', 'Alex') } })],
    };
    const found = findPhiInBook(book, ['s1', 's2']);
    expect(found).toHaveLength(2);
    expect(phiFoundText(found)).toMatch(/^Dr. Chen · Knee and 1 more card may include a medical record number/);
    expect(findPhiInBook(book, ['s1'])).toHaveLength(1);
  });
});
