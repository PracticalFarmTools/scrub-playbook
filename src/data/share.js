import { QR_MAX_CHARS, normalizeBlocks } from './schema';
import { stripConfirmation } from './trust';
import { cleanAliases } from './boardMatch';

/** The text and the small payload of one card that a tech sends by message, AirDrop, or QR. */

export const SHARE_FENCE = '--- scrubplaybook ---';
const UNCONFIRMED_LINE = 'Arrives unconfirmed. Confirm after you are in the room.';

export function qrFits(text) {
  return typeof text === 'string' && text.length > 0 && text.length <= QR_MAX_CHARS;
}

function prune(value) {
  if (Array.isArray(value)) {
    const next = value.map(prune).filter(item => item !== undefined);
    return next.length ? next : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      if (raw === '' || raw === null || raw === undefined || raw === false) continue;
      if (key === 'source' && raw === 'observed') continue;
      const next = prune(raw);
      if (next !== undefined) out[key] = next;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

/** The newest signed record goes with a shared card, so the other phone can see who last changed it. */
function slimProcedure(procedure) {
  const last = Array.isArray(procedure?.trail) ? procedure.trail.at(-1) : null;
  const slim = slimContent(procedure);
  return last ? { ...slim, trail: [last] } : slim;
}

function slimContent(procedure) {
  const stripped = stripConfirmation(procedure);
  return prune({
    name: stripped.name,
    approach: stripped.approach,
    aliases: cleanAliases(stripped.aliases),
    blocks: stripped.blocks,
    official: stripped.official?.label
      ? { label: stripped.official.label, note: stripped.official.note || '' }
      : undefined,
  }) || { name: stripped.name || 'Untitled case' };
}

function sampleError(surgeon, procedure) {
  if (surgeon?.demo || procedure?.demo) return { error: 'Sample cards stay on this device.' };
  return null;
}

export function instrumentLines(blocks) {
  const items = (blocks?.instruments || []).filter(item => item?.name?.trim());
  const nickOf = (name) => (blocks.nicknames || []).find(nick => (nick.actual || '').trim().toLowerCase() === name.trim().toLowerCase());
  const withNick = (item) => {
    const nick = nickOf(item.name);
    return nick ? `${item.name.trim()} “${nick.nickname}”` : item.name.trim();
  };
  return {
    mayo: items.filter(item => item.mayo).map(withNick),
    rest: items.filter(item => !item.mayo).map(item => (
      item.from?.trim() ? `${withNick(item)} (from ${item.from.trim()})` : withNick(item)
    )),
  };
}

function pushSection(lines, title, bodyLines) {
  const kept = (bodyLines || []).map(line => (line || '').trim()).filter(Boolean);
  if (!kept.length) return;
  lines.push('', title, ...kept);
}

function surgeonTitle(name) {
  return (name || '').trim() || 'this surgeon';
}

export function toGlanceText(surgeon, procedure) {
  const blocked = sampleError(surgeon, procedure);
  if (blocked) return blocked;
  const blocks = normalizeBlocks(procedure?.blocks);
  const lines = [];
  const who = [surgeon?.name, surgeon?.specialty].filter(Boolean).join(' · ');
  if (who) lines.push(who);
  if (surgeon?.facility?.trim()) lines.push(`Place: ${surgeon.facility.trim()}`);
  const procedureTitle = [procedure?.name || 'Untitled case', procedure?.approach].filter(part => part && String(part).trim()).join(' · ');
  lines.push(`Procedure: ${procedureTitle}`);
  if (procedure?.official?.label?.trim()) lines.push(`Official card: ${procedure.official.label.trim()}`);
  lines.push('', UNCONFIRMED_LINE);

  const firstCase = (surgeon?.firstCase || []).map(line => String(line || '').trim()).filter(Boolean).slice(0, 3);
  if (firstCase.length) pushSection(lines, `New to ${surgeonTitle(surgeon?.name)}`, firstCase);

  if (blocks.position.text?.trim()) pushSection(lines, 'Position', [blocks.position.text]);
  if (blocks.prep.text?.trim()) pushSection(lines, 'Prep', [blocks.prep.text]);
  if (blocks.drapes.text?.trim()) pushSection(lines, 'Drapes', [blocks.drapes.text]);
  if (blocks.room.text?.trim()) pushSection(lines, 'Room start', [blocks.room.text]);
  if (blocks.equipment.text?.trim()) pushSection(lines, 'Equipment and settings', [blocks.equipment.text]);

  const gloves = [];
  if (blocks.gloves.outer?.model) {
    gloves.push(`Outer: ${[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}`);
  }
  if (blocks.gloves.inner?.model) {
    gloves.push(`Inner: ${[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}`);
  }
  pushSection(lines, 'Gloves', gloves);

  pushSection(lines, 'Case flow', (blocks.steps || []).filter(step => step.title?.trim()).map((step, index) => {
    const parts = [`${index + 1}. ${step.title.trim()}`];
    if (step.ready?.trim()) parts.push(`Have ready: ${step.ready.trim()}`);
    if (step.habit?.trim()) parts.push(step.habit.trim());
    return parts.join(' · ');
  }));

  const gear = instrumentLines(blocks);
  if (gear.mayo.length) lines.push('', `Mayo: ${gear.mayo.join(', ')}`);
  if (gear.rest.length) lines.push('', 'Also ready:', ...gear.rest);

  pushSection(lines, 'Trays', (blocks.trays || []).map(tray => {
    const parts = [tray.commonName];
    if (tray.spdName) parts.push(`SPD: ${tray.spdName}`);
    if (tray.vendorName) parts.push(tray.vendorName);
    parts.push(tray.openOrHold === 'hold' ? 'Hold' : 'Open');
    return parts.filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Sutures', (blocks.sutures || []).map(suture => {
    const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
    const head = [layer, [suture.name, suture.size, suture.needle].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const tail = [];
    if (suture.open) tail.push(`open ${suture.open}`);
    if (suture.hold) tail.push(`hold ${suture.hold}`);
    if (suture.catalogNumber) tail.push(suture.catalogNumber);
    return [head, ...tail].filter(Boolean).join(' · ');
  }));

  pushSection(lines, 'Implants', (blocks.implants || []).map(implant => {
    const name = implant.systemName || 'Unnamed system';
    return implant.repExpected ? `${name} · Rep expected` : name;
  }));

  pushSection(lines, 'Nicknames', (blocks.nicknames || []).map(nick => `“${nick.nickname}” → ${nick.actual || ''}`));
  pushSection(lines, 'People', (blocks.people || []).map(person => [person.name, person.role].filter(Boolean).join(' · ')));

  if (blocks.endOfCase.text?.trim()) pushSection(lines, 'Dressing and end of case', [blocks.endOfCase.text]);
  if (blocks.note.text?.trim()) pushSection(lines, 'Note', [blocks.note.text]);

  return { text: lines.join('\n').trim() };
}

export function toShareableCard(surgeon, procedure) {
  const blocked = sampleError(surgeon, procedure);
  if (blocked) return blocked;
  const payload = {
    kind: 'scrubplaybook-card',
    v: 2,
    surgeon: {
      name: surgeon.name,
      specialty: surgeon.specialty,
      facility: surgeon.facility || '',
      ...((surgeon.firstCase || []).some(line => String(line || '').trim())
        ? { firstCase: (surgeon.firstCase || []).map(line => String(line).trim()).filter(Boolean).slice(0, 3) }
        : {}),
    },
    procedure: slimProcedure(procedure),
  };
  const text = JSON.stringify(payload);
  const qrText = qrFits(text) || !payload.procedure.trail
    ? text
    : JSON.stringify({ ...payload, procedure: slimContent(procedure) });
  return { payload, text, qrText, showQr: qrFits(qrText), qrSigned: qrText === text && Boolean(payload.procedure.trail) };
}

export function shareMessage(surgeon, procedure) {
  const card = toShareableCard(surgeon, procedure);
  if (card.error) return card;
  const glance = toGlanceText(surgeon, procedure);
  if (glance.error) return glance;
  return {
    glance: glance.text,
    payload: card.payload,
    payloadText: card.text,
    qrText: card.qrText,
    message: `${glance.text}\n\n${SHARE_FENCE}\n${card.text}`,
    showQr: card.showQr,
    qrSigned: card.qrSigned,
  };
}

export function suggestionText({ surgeon, procedure, cardSays = '', seen = '', change = '', from = '', date = '' }) {
  const title = [surgeon?.name, procedure?.name, procedure?.approach].filter(part => part && String(part).trim()).join(' · ');
  return [
    'Preference card suggestion',
    title,
    `Official card: ${(procedure?.official?.label || '').trim()}`,
    `The card says: ${cardSays}`,
    `Seen in the room: ${seen}`,
    `Suggested change: ${change}`,
    `From: ${from} · ${date}`,
    'Staff note. The surgeon and the card owner decide.',
  ].join('\n');
}
