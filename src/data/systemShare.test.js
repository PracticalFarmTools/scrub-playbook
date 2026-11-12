import { describe, expect, it } from 'vitest';
import { parseImport, placeIncomingCard } from './incoming';
import { emptyBlocks, emptyProcedure, emptySurgeon } from './schema';
import { shareMessage } from './share';
import { doorsFor } from './systems';

describe('system share round trip', () => {
  it('keeps the case system, the tray, the hospital link, and the surgeon system', () => {
    const surgeon = emptySurgeon({
      name: 'Dr. Ada Chen',
      preferredSystems: [{
        id: 'ps1', catalogId: 'sys-mako', name: 'Mako', companyId: 'stryker',
        catalogNumber: '', overrideUrl: '', repExpected: false,
      }],
    });
    const procedure = emptyProcedure(surgeon.id, {
      name: 'Right total knee',
      blocks: {
        ...emptyBlocks(),
        systems: [{
          id: 'cs1', catalogId: 'sys-attune', name: 'ATTUNE Knee System', companyId: 'depuy-synthes-j-and-j',
          catalogNumber: 'ATT-100', overrideUrl: 'https://hospital.example/item', repExpected: true,
        }, {
          id: 'cs2', catalogId: null, name: 'House retractor set', companyId: null,
          catalogNumber: '', overrideUrl: 'http://insecure.example/item', repExpected: false,
        }],
        trays: [{ id: 't1', commonName: 'Knee tray', spdName: '', vendorName: 'Stryker', openOrHold: 'open', systemId: 'cs1' }],
      },
    });
    const sent = shareMessage(surgeon, procedure);
    expect(sent.glance).toContain('Product page: https://www.jnjmedtech.com/en-US/product/attune-knee-system');
    expect(sent.glance).toContain('Hospital item: https://hospital.example/item');
    expect(sent.glance).toContain('Catalog code: ATT-100');
    expect(sent.glance).toContain('Knee tray · ATTUNE Knee System · Stryker · Open');
    expect(sent.glance).toContain('Systems Dr. Ada Chen uses');
    expect(sent.glance).toContain('https://ifu.stryker.com');

    const incoming = parseImport(sent.message);
    const card = incoming.book.procedures[0];
    const arrived = card.blocks.systems;
    expect(arrived.map(system => system.name)).toEqual(['ATTUNE Knee System', 'House retractor set']);
    expect(card.blocks.trays[0].systemId).toBe(arrived[0].id);
    expect(doorsFor(arrived[0]).hospital.href).toBe('https://hospital.example/item');
    expect(arrived[1].overrideUrl).toBe('');
    expect(doorsFor(arrived[1]).hospital).toBeNull();
    expect(incoming.book.surgeons[0].preferredSystems.map(system => system.name)).toEqual(['Mako']);

    const placed = placeIncomingCard(
      { surgeons: [{ id: 'here', name: 'Dr. Ada Chen', specialty: 'Orthopedics', facility: '', demo: false }], procedures: [] },
      incoming.book,
      { surgeonId: 'here' },
    );
    const attached = placed.book.procedures[0].blocks.systems;
    expect(attached.map(system => system.name)).toEqual(['ATTUNE Knee System', 'House retractor set']);
    expect(attached[1].overrideUrl).toBe('');
    expect(placed.book.procedures[0].blocks.trays[0].systemId).toBe(attached[0].id);
  });
});
