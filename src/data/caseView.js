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
    tray?.openOrHold === 'hold' ? 'Hold' : tray?.openOrHold === 'open' ? 'Open' : 'Open or hold not set',
  ].filter(Boolean).join(' · ');
}

/** Outer or inner glove, including the color the box is picked by. */
export function gloveLine(label, glove) {
  const words = [glove?.model, glove?.size, glove?.color].map(item => String(item || '').trim()).filter(Boolean).join(' ');
  return words ? `${label} · ${words}` : '';
}

/** Name, role, and the glove stored for that person. */
export function personLine(person) {
  const glove = [person?.gloveModel, person?.gloveSize, person?.gloveColor].map(item => String(item || '').trim()).filter(Boolean).join(' ');
  return [person?.name, person?.role, glove].map(item => String(item || '').trim()).filter(Boolean).join(' · ');
}

/** One suture sentence: what it is, how many to open, how many to hold, and the catalog code. */
export function sutureLine(suture) {
  const layer = suture?.layer && String(suture.layer).toLowerCase() !== 'unspecified' ? String(suture.layer).trim() : '';
  const name = [suture?.name, suture?.size, suture?.needle].map(item => String(item || '').trim()).filter(Boolean).join(' ');
  const head = [layer, name].filter(Boolean).join(' · ');
  const tail = [
    String(suture?.open || '').trim() && `open ${String(suture.open).trim()}`,
    String(suture?.hold || '').trim() && `hold ${String(suture.hold).trim()}`,
    String(suture?.catalogNumber || '').trim(),
  ].filter(Boolean);
  return [head, ...tail].filter(Boolean).join(' · ');
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
  const outer = gloveLine('Outer', blocks.gloves?.outer);
  const inner = gloveLine('Inner', blocks.gloves?.inner);
  if (outer) items.push({ id: 'glove-outer', label: outer });
  if (inner) items.push({ id: 'glove-inner', label: inner });
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
    items.push({
      id: `suture-${suture.id}`,
      label: sutureLine(suture),
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
