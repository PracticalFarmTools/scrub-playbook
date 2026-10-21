import { TODAY_KEY, uid } from './schema';

export function localDay(offsetDays = 0, date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyToday() {
  return { v: 2, items: [] };
}

/** A leading "Dr." is ignored. "Ann" does not match "Anne". */
export function normalizePersonName(name) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/^dr\.\s+/, '');
}

export function samePersonName(a, b) {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  return left.length > 0 && left === right;
}

export function sameProcedureName(a, b) {
  const left = (a || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const right = (b || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return left.length > 0 && left === right;
}

function convertToday(stored, today) {
  if (!stored || typeof stored !== 'object') return emptyToday();
  const source = Array.isArray(stored.items) ? stored.items : [];
  const legacyDay = stored.v === 2 ? '' : (stored.day || '');
  const items = source.map(item => ({
    ...item,
    day: item.day || legacyDay || today,
  })).filter(item => item.day && item.day >= today);
  return { v: 2, items };
}

export function loadToday(source, today = localDay()) {
  if (source === undefined) {
    try {
      const raw = localStorage.getItem(TODAY_KEY);
      return convertToday(raw ? JSON.parse(raw) : null, today);
    } catch {
      return emptyToday();
    }
  }
  return convertToday(source, today);
}

export function visibleDay(stored, day) {
  return [...(stored?.items || [])]
    .filter(item => item.day === day)
    .sort((a, b) => {
      if (!a.startsAt && !b.startsAt) return 0;
      if (!a.startsAt) return 1;
      if (!b.startsAt) return -1;
      return a.startsAt.localeCompare(b.startsAt);
    });
}

export function saveToday(state) {
  localStorage.setItem(TODAY_KEY, JSON.stringify(state));
}

export function todayItem({ day = localDay(), startsAt = '', room = '', surgeonName = '', procedureName = '' } = {}) {
  return {
    id: uid(),
    day,
    startsAt,
    room: room.trim(),
    surgeonName: surgeonName.trim(),
    procedureName: procedureName.trim(),
  };
}

/**
 * Tap a board line. A missing surgeon or procedure opens the editor.
 * The board room is not copied onto the card.
 */
export function resolveTodayTap(book, item) {
  const surgeonName = (item?.surgeonName || '').trim();
  const procedureName = (item?.procedureName || '').trim();
  const surgeons = (book?.surgeons || []).filter(surgeon => !surgeon.demo && samePersonName(surgeon.name, surgeonName));
  if (surgeons.length === 0) {
    return { action: 'start-surgeon', surgeonName, procedureName };
  }
  if (surgeons.length > 1) {
    return { action: 'choose', surgeons };
  }
  const surgeon = surgeons[0];
  const procedures = (book?.procedures || []).filter(procedure => (
    procedure.surgeonId === surgeon.id
    && !procedure.demo
    && sameProcedureName(procedure.name, procedureName)
  ));
  if (procedures.length === 1) return { action: 'open', surgeon, procedure: procedures[0] };
  if (procedures.length > 1) return { action: 'choose', surgeons: [surgeon], procedures };
  return { action: 'start-procedure', surgeon, procedureName };
}
