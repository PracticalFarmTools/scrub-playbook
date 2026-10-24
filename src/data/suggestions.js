import { SUGGESTIONS_KEY, uid } from './schema';
import { safeJson, safeSet } from './storage';
import { daysSince } from './trust';

const MAX_SUGGESTIONS = 200;
export const SUGGESTION_ASK_DAYS = 30;

export function loadSuggestions() {
  const list = safeJson(SUGGESTIONS_KEY, []);
  return Array.isArray(list) ? list.filter(item => item?.id && item.procedureId) : [];
}

export function saveSuggestions(list) {
  return safeSet(SUGGESTIONS_KEY, JSON.stringify(list));
}

/** Keeps what was sent so the card can follow up. The text stays on this phone. */
export function recordSuggestion(list, procedure, { seen = '', change = '' } = {}, at = new Date().toISOString()) {
  const entry = {
    id: uid(),
    procedureId: procedure.id,
    surgeonId: procedure.surgeonId,
    at,
    seen: String(seen).trim().slice(0, 500),
    change: String(change).trim().slice(0, 500),
    revision: procedure.unitBook?.revision ?? null,
    status: 'open',
    closedAt: null,
  };
  const same = (item) => item.procedureId === entry.procedureId && item.status === 'open'
    && item.seen === entry.seen && item.change === entry.change;
  const rest = (list || []).filter(item => !same(item));
  return [entry, ...rest]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, MAX_SUGGESTIONS);
}

export function closeSuggestion(list, id, status, at = new Date().toISOString()) {
  return (list || []).map(item => (item.id === id ? { ...item, status, closedAt: at } : item));
}

export function openSuggestion(list, procedureId) {
  return (list || []).find(item => item.procedureId === procedureId && item.status === 'open') || null;
}

/**
 * Where an open suggestion stands. `revision` means a newer unit book revision arrived,
 * `checked` means the official card was checked since, `ask` means it has waited a month.
 */
export function suggestionState(suggestion, procedure, now = Date.now()) {
  if (!suggestion || suggestion.status !== 'open') return null;
  const revision = procedure?.unitBook?.revision;
  if (revision && suggestion.revision != null && revision > suggestion.revision) return { kind: 'revision', revision };
  const reviewedAt = procedure?.official?.reviewedAt;
  if (reviewedAt && Date.parse(reviewedAt) > Date.parse(suggestion.at)) return { kind: 'checked' };
  const days = Math.floor(daysSince(suggestion.at, now));
  if (days >= SUGGESTION_ASK_DAYS) return { kind: 'ask', days };
  return { kind: 'waiting', days };
}

export function followUpText(state) {
  if (!state) return '';
  if (state.kind === 'revision') return `Unit book revision ${state.revision} came out after your suggestion. Check whether it has your change.`;
  if (state.kind === 'checked') return 'You checked the official card after you suggested this. Does it have your change?';
  if (state.kind === 'ask') return `Sent ${state.days} days ago. Ask the card owner about it.`;
  return 'Check the official card for it the next time you are in this case.';
}
