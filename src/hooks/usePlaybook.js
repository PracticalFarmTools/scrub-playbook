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
 * `facility` narrows results to a single facility tag (traveler tech use case).
 */
export function useSearch(surgeons, vendors, query, facility = null) {
  const q = query.toLowerCase().trim();

  const facilityScoped = facility
    ? surgeons.filter(s => s.facility === facility)
    : surgeons;

  const filteredSurgeons = (() => {
    if (!q) return facilityScoped;
    return facilityScoped.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      (s.facility || '').toLowerCase().includes(q) ||
      (s.nicknames || []).some(n =>
        n.nickname.toLowerCase().includes(q) || n.actual.toLowerCase().includes(q)
      ) ||
      (s.tips || '').toLowerCase().includes(q) ||
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

  const facilities = [...new Set(surgeons.map(s => s.facility).filter(Boolean))].sort();

  return { q, filteredSurgeons, filteredVendors, hasVendorResults, facilities };
}
