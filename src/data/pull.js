import { safeJson, safeSet } from './storage';
import { localDay } from './today';

export const PULL_KEY = 'scrubplaybook_pull';

/** Today's checks for one procedure. A checklist from an earlier day starts clean. */
export function loadPull(procedureId, day = localDay(), stored = safeJson(PULL_KEY, {})) {
  const entry = stored && typeof stored === 'object' ? stored[procedureId] : null;
  if (!entry || entry.day !== day || !entry.checks || typeof entry.checks !== 'object') return {};
  return { ...entry.checks };
}

/** Keeps only today's checklists so the stored copy stays small. */
export function nextPull(stored, procedureId, checks, day = localDay()) {
  const next = {};
  for (const [id, entry] of Object.entries(stored && typeof stored === 'object' ? stored : {})) {
    if (entry?.day === day && id !== procedureId) next[id] = entry;
  }
  const kept = Object.fromEntries(Object.entries(checks || {}).filter(([, on]) => on));
  if (Object.keys(kept).length) next[procedureId] = { day, checks: kept };
  return next;
}

export function savePull(procedureId, checks, day = localDay()) {
  return safeSet(PULL_KEY, JSON.stringify(nextPull(safeJson(PULL_KEY, {}), procedureId, checks, day)));
}
