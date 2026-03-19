import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting state in localStorage.
 * Falls back to defaultValue if localStorage is empty or corrupt.
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

/**
 * Custom hook for filtered search across surgeons and vendors.
 * Returns memoized filtered results to avoid unnecessary re-computation.
 */
export function useSearch(surgeons, vendors, query) {
  const q = query.toLowerCase().trim();

  const filteredSurgeons = (() => {
    if (!q) return surgeons;
    return surgeons.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      (s.procedures || []).some(p =>
        p.name?.toLowerCase().includes(q) ||
        (p.nicknames || []).some(n =>
          n.nickname.toLowerCase().includes(q) || n.actual.toLowerCase().includes(q)
        ) ||
        (p.tips || '').toLowerCase().includes(q) ||
        (p.equipment || '').toLowerCase().includes(q) ||
        p.glove?.model?.toLowerCase().includes(q) ||
        (p.sutures || []).some(su =>
          su.name.toLowerCase().includes(q) || (su.needle || '').toLowerCase().includes(q)
        )
      ) ||
      // Legacy fallback for unmigrated data
      s.gloveModel?.toLowerCase().includes(q)
    );
  })();

  const filteredVendors = (() => {
    if (!q) return vendors;
    return vendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.alias.toLowerCase().includes(q)
    );
  })();

  const hasVendorResults = q && filteredVendors.length > 0 && filteredVendors.length < vendors.length;

  return { q, filteredSurgeons, filteredVendors, hasVendorResults };
}
