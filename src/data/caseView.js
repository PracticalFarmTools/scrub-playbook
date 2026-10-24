import { CARD_STATUS } from './schema';
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
      label: [tray.commonName || 'Tray', tray.spdName && `SPD: ${tray.spdName}`, tray.openOrHold === 'hold' ? 'Hold' : 'Open'].filter(Boolean).join(' · '),
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
      label: [implant.systemName || 'Unnamed system', implant.repExpected ? 'Rep expected' : ''].filter(Boolean).join(' · '),
    });
  });
  return items;
}
