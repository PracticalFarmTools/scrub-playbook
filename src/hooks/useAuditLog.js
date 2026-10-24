import { useCallback } from 'react';
import { AUDIT_KEY, TECH_NAME_KEY, uid } from '../data/schema';
import { safeGet, safeJson, safeSet } from '../data/storage';
import { useStoredState } from './useStoredState';

const MAX_ENTRIES = 100;

function currentUser() {
  return safeGet(TECH_NAME_KEY, '') || 'Unknown';
}

export function loadLog() {
  const log = safeJson(AUDIT_KEY, []);
  return Array.isArray(log) ? log.filter(entry => entry && typeof entry === 'object') : [];
}

function saveLog(log) {
  return safeSet(AUDIT_KEY, JSON.stringify(log));
}

function newestFirst(entries) {
  const byId = new Map();
  for (const entry of entries) if (entry?.id && !byId.has(entry.id)) byId.set(entry.id, entry);
  return [...byId.values()]
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, MAX_ENTRIES);
}

/** Recent activity on this phone: up to 100 entries, newest first, shared by every open tab. */
export function useAuditLog() {
  const [log, update] = useStoredState(AUDIT_KEY, loadLog, saveLog);

  const addEntry = useCallback(({ action, surgeonName, user, note }) => {
    const entry = {
      id: uid(),
      action,
      surgeonName: surgeonName || '',
      user: user || currentUser(),
      note: note?.trim() || null,
      timestamp: new Date().toISOString(),
    };
    update(prev => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, [update]);

  const mergeLog = useCallback((incoming) => {
    update(prev => newestFirst([...prev, ...(Array.isArray(incoming) ? incoming : [])]));
  }, [update]);

  return { log, addEntry, mergeLog };
}
