import { useState, useEffect, useCallback } from 'react';

const MAX_ENTRIES = 100;

function loadLog(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

/**
 * Hook for the audit trail.
 * Accepts an optional storage key for per-hospital isolation.
 * Stores up to 100 entries in localStorage, newest first.
 */
export function useAuditLog(storageKey = 'scrubplaybook_audit') {
  const [log, setLog] = useState(() => loadLog(storageKey));

  // Re-load when storage key changes (hospital switch)
  useEffect(() => {
    setLog(loadLog(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(log));
    } catch (e) {
      console.warn('Audit log save failed (storage full):', e);
    }
  }, [storageKey, log]);

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
