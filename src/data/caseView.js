import { getProduct } from './products';
import { CARD_STATUS } from './schema';
import { systemIdentity } from './systems';
import { timeAgo, trustState } from './trust';

export function trustLine(procedure, staleDays, sample, trust = {}) {
  if (sample) return `Sample · ${trustLine(procedure, staleDays, false, trust)}`;
  const state = trustState(procedure, { staleDays, ...trust });
  if (state.status === CARD_STATUS.CONFIRMED) return state.at ? `Matched a case · ${timeAgo(state.at)}` : 'Matched a case';
  if (state.status === CARD_STATUS.NOTED) return `One staff member · ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.STALE) return `Stale · last matched ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.DISPUTED) return 'Flagged · do not treat this as a match';
  return 'Unconfirmed';
}

export function nickFor(blocks, name) {
  return (blocks.nicknames || []).find(entry => (entry.actual || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
}

/** The same tray sentence on the card, in the room, and in a shared message. */
export function trayLine(tray, blocks) {
  const system = (blocks?.systems || []).find(item => item.id === tray?.systemId);
  const identity = system ? systemIdentity(system) : null;
  return [
    tray?.commonName || 'Tray',
    identity?.listed,
    identity?.called && `Room calls it ${identity.called}`,
    tray?.spdName && `SPD: ${tray.spdName}`,
    tray?.vendorName,
    tray?.openOrHold === 'hold' ? 'Hold' : 'Open',
  ].filter(Boolean).join(' · ');
}

/** The implant the page belongs to, then the name the room uses when those differ. */
export function implantLine(implant) {
  const product = getProduct(implant?.productId);
  const name = String(implant?.systemName || '').trim();
  const listed = product?.name && product.name !== name ? product.name : '';
  return [listed || name || 'Unnamed system', listed && name && `Room calls it ${name}`, implant?.repExpected ? 'Rep expected' : ''].filter(Boolean).join(' · ');
}

export function pullTargets(blocks) {
  const items = [];
  if (blocks.gloves?.outer?.model) items.push({ id: 'glove-outer', label: `Outer glove · ${[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}` });
  if (blocks.gloves?.inner?.model) items.push({ id: 'glove-inner', label: `Inner glove · ${[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}` });
  (blocks.instruments || []).filter(item => item?.name?.trim()).forEach(item => {
    const nick = nickFor(blocks, item.name);
    const name = nick ? `${item.name.trim()} “${nick.nickname}”` : item.name.trim();
    const where = item.mayo ? 'Mayo' : (item.from?.trim() ? `from ${item.from.trim()}` : '');
    items.push({ id: `instrument-${item.id}`, label: [name, where].filter(Boolean).join(' · ') });
  });
  (blocks.trays || []).forEach(tray => {
    items.push({
      id: `tray-${tray.id}`,
      label: trayLine(tray, blocks),
    });
  });
  (blocks.sutures || []).forEach(suture => {
    const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
    items.push({
      id: `suture-${suture.id}`,
      label: [layer, suture.name, suture.size, suture.needle, suture.open && `open ${suture.open}`, suture.hold && `hold ${suture.hold}`].filter(Boolean).join(' '),
    });
  });
  (blocks.implants || []).forEach(implant => {
    items.push({
      id: `implant-${implant.id}`,
      label: implantLine(implant),
    });
  });
  return items;
}
