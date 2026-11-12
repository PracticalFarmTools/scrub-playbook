import { describe, expect, it } from 'vitest';
import { COMPANIES, findCompany } from './companies';
import { getProduct } from './products';
import { pullTargets, trayLine } from './caseView';
import { cleanSystemUses, doorsFor, findSystemByName, searchCatalog, SYSTEMS, systemShareLine, systemsForCase } from './systems';

describe('companies', () => {
  it('matches a whole name or alias and ignores a fragment', () => {
    expect(findCompany('Mölnlycke')?.id).toBe('molnlycke');
    expect(findCompany('Ethicon')?.name).toBe('Ethicon (J&J)');
    expect(findCompany('DePuy')?.name).toBe('DePuy Synthes (J&J)');
    expect(findCompany('Ansell')?.name).toBe('Ansell');
    expect(findCompany('S')).toBeNull();
    expect(findCompany('PI')).toBeNull();
    expect(findCompany('J&J')).toBeNull();
  });
});

describe('systems', () => {
  it('points every system at a real company, and a product page only when one is checked', () => {
    for (const system of SYSTEMS) {
      expect(COMPANIES.some(company => company.id === system.companyId), system.id).toBe(true);
      if (system.productId) expect(getProduct(system.productId)?.linkKind).toBe('product-page');
    }
  });

  it('keeps a product page and the instructions as separate doors', () => {
    const now = Date.parse('2026-10-05T00:00:00.000Z');
    const doors = doorsFor({
      catalogId: 'sys-attune', name: 'ATTUNE Knee System', companyId: 'depuy-synthes-j-and-j',
      catalogNumber: '', overrideUrl: '', repExpected: false,
    }, now);
    expect(doors.product.href).toMatch(/attune-knee-system/);
    expect(doors.instructions).toMatchObject({ href: 'https://www.e-ifu.com', label: 'DePuy Synthes (J&J) instructions' });
  });

  it('offers Alcon instructions for Centurion and no product page', () => {
    const doors = doorsFor({ catalogId: 'sys-centurion', name: 'Centurion Vision System', companyId: 'alcon' });
    expect(doors.product).toBeNull();
    expect(doors.instructions).toEqual({ href: 'https://ifu.alcon.com', label: 'Alcon instructions' });
  });

  it('keeps a renamed system on the listed product, and says what the room calls it', () => {
    const use = { catalogId: 'sys-attune', name: 'Persona Knee System', companyId: 'depuy-synthes-j-and-j', catalogNumber: '', overrideUrl: '', repExpected: false };
    const line = systemShareLine(use);
    expect(line.startsWith('ATTUNE Knee System')).toBe(true);
    expect(line).toContain('Room calls it Persona Knee System');
    expect(line).toContain('https://www.jnjmedtech.com/en-US/product/attune-knee-system');
    expect(line.indexOf('ATTUNE Knee System')).toBeLessThan(line.indexOf('Persona'));
    const blocks = {
      systems: [use],
      trays: [{ id: 't1', commonName: 'Knee tray', spdName: '', vendorName: 'Stryker', openOrHold: 'open', systemId: 'cs1' }],
      implants: [{ id: 'i1', systemName: 'Persona Knee System', productId: 'imp-attune', repExpected: false }],
    };
    use.id = 'cs1';
    expect(trayLine(blocks.trays[0], blocks)).toBe('Knee tray · ATTUNE Knee System · Room calls it Persona Knee System · Stryker · Open');
    expect(pullTargets(blocks).find(item => item.id === 'implant-i1').label).toBe('ATTUNE Knee System · Room calls it Persona Knee System');
  });

  it('finds a listed system by its exact name or alias', () => {
    expect(findSystemByName('ATTUNE')?.id).toBe('sys-attune');
    expect(findSystemByName('da Vinci Xi')?.id).toBe('sys-davinci');
    expect(findSystemByName('knee')).toBeNull();
  });

  it('searches names and aliases, and a one-letter search matches nothing', () => {
    expect(searchCatalog('a')).toEqual({ systems: [], companies: [] });
    expect(searchCatalog('attune').systems.map(system => system.id)).toEqual(['sys-attune']);
    expect(searchCatalog('mako').systems.map(system => system.id)).toContain('sys-mako');
    const stryker = searchCatalog('stryker');
    expect(stryker.systems.some(system => system.id === 'sys-triathlon')).toBe(true);
    expect(stryker.companies.map(company => company.name)).toEqual(expect.arrayContaining(['Stryker', 'Stryker CMF']));
  });

  it('keeps twelve, keeps a typed name when the catalog id is gone, and drops a non-https hospital link', () => {
    expect(cleanSystemUses(Array.from({ length: 20 }, (_, index) => ({ name: `System ${index}` })))).toHaveLength(12);
    expect(cleanSystemUses([{ catalogId: 'sys-retired', name: 'Old System', companyId: 'missing' }])[0]).toMatchObject({
      catalogId: null, name: 'Old System', companyId: null,
    });
    expect(cleanSystemUses([{ name: 'Custom', overrideUrl: 'http://insecure.example/item' }])[0].overrideUrl).toBe('');
    expect(cleanSystemUses([{ name: 'Custom', overrideUrl: 'https://hospital.example/item' }])[0].overrideUrl).toBe('https://hospital.example/item');
  });

  it('shows a surgeon system on the case only when the card does not already list it', () => {
    const onCard = cleanSystemUses([{ catalogId: 'sys-triathlon', repExpected: true }]);
    const shown = systemsForCase(
      { preferredSystems: cleanSystemUses([{ catalogId: 'sys-triathlon' }, { catalogId: 'sys-mako' }]) },
      { systems: onCard },
    );
    expect(shown.onCard.map(system => system.catalogId)).toEqual(['sys-triathlon']);
    expect(shown.onCard[0].repExpected).toBe(true);
    expect(shown.fromSurgeon.map(system => system.catalogId)).toEqual(['sys-mako']);
  });
});
