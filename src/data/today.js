import { TODAY_KEY, uid } from './schema';

export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyToday(day = localDay()) {
  return { day, items: [] };
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

export function visibleToday(stored, today = localDay()) {
  if (!stored || stored.day !== today) return [];
  return [...(stored.items || [])].sort((a, b) => {
    if (!a.startsAt && !b.startsAt) return 0;
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.localeCompare(b.startsAt);
  });
}

export function loadToday() {
  try {
    const raw = localStorage.getItem(TODAY_KEY);
    if (!raw) return emptyToday();
    const stored = JSON.parse(raw);
    if (!stored || stored.day !== localDay()) return emptyToday();
    return { day: stored.day, items: Array.isArray(stored.items) ? stored.items : [] };
  } catch {
    return emptyToday();
  }
}

export function saveToday(state) {
  localStorage.setItem(TODAY_KEY, JSON.stringify(state));
}

export function todayItem({ startsAt = '', room = '', surgeonName = '', procedureName = '' } = {}) {
  return {
    id: uid(),
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
