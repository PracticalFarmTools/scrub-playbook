import { useState, useEffect, useCallback } from 'react';
import { TECH_NAME_KEY, uid } from '../data/schema';
import { safeGet, safeJson, safeSet } from '../data/storage';

function currentUser() {
  return safeGet(TECH_NAME_KEY, '') || 'Unknown';
}

const AUDIT_KEY = 'scrubplaybook_audit';
const MAX_ENTRIES = 100;

function loadLog() {
  const log = safeJson(AUDIT_KEY, []);
  return Array.isArray(log) ? log : [];
}

/**
 * Hook for the audit trail.
 * Stores up to 100 entries on this phone, newest first.
 */
export function useAuditLog() {
  const [log, setLog] = useState(loadLog);

  useEffect(() => {
    safeSet(AUDIT_KEY, JSON.stringify(log));
  }, [log]);

  const addEntry = useCallback(({ action, surgeonName, user, note }) => {
    const entry = {
      id: uid(),
      action,
      surgeonName: surgeonName || '',
      user: user || currentUser(),
      note: note?.trim() || null,
      timestamp: new Date().toISOString(),
    };
    setLog(prev => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  return { log, addEntry };
}
