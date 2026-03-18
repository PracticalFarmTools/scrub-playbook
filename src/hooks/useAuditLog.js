import { useState, useEffect, useCallback } from 'react';

const AUDIT_KEY = 'scrubplaybook_audit';
const MAX_ENTRIES = 100;

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  } catch { return []; }
}

/**
 * Hook for the audit trail.
 * Stores up to 100 entries in localStorage, newest first.
 */
export function useAuditLog() {
  const [log, setLog] = useState(loadLog);

  useEffect(() => {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
  }, [log]);

  const addEntry = useCallback(({ action, surgeonName, user, note }) => {
    const entry = {
      id: crypto.randomUUID(),
      action,
      surgeonName: surgeonName || '',
      user: user || 'Kyle',
      note: note?.trim() || null,
      timestamp: new Date().toISOString(),
    };
    setLog(prev => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  return { log, addEntry };
}
