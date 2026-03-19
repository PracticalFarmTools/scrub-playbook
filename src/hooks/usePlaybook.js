import { useState, useEffect, useMemo } from 'react';

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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage quota exceeded, data not saved:', e);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Lightweight fuzzy matcher: every query token must appear somewhere in the text.
 * "phaco needle" matches "Likes the Phaco tip. Calls it The Needle."
 */
function fuzzyMatch(text, tokens) {
  const lower = text.toLowerCase();
  return tokens.every(t => lower.includes(t));
}

/**
 * Build a flat searchable string for an entire surgeon record.
 * Includes name, specialty, procedure names, nicknames, tips,
 * equipment, glove models, sutures, needles, and vendor links.
 */
function buildSearchBlob(surgeon) {
  const parts = [surgeon.name, surgeon.specialty];
  (surgeon.procedures || []).forEach(p => {
    parts.push(p.name || '');
    parts.push(p.tips || '');
    parts.push(p.equipment || '');
    parts.push(p.glove?.model || '');
    parts.push(p.glove?.brand || '');
    (p.nicknames || []).forEach(n => {
      parts.push(n.nickname);
      parts.push(n.actual);
    });
    (p.sutures || []).forEach(s => {
      parts.push(s.name);
      parts.push(s.needle || '');
    });
  });
  (surgeon.vendorLinks || []).forEach(v => parts.push(typeof v === 'string' ? v : v.name || ''));
  // Legacy
  if (surgeon.gloveModel) parts.push(surgeon.gloveModel);
  return parts.join(' ');
}

/**
 * Custom hook for filtered search across surgeons and vendors.
 * Uses fuzzy token matching — all query words must appear somewhere
 * in the surgeon's combined searchable fields.
 */
export function useSearch(surgeons, vendors, query) {
  const q = query.toLowerCase().trim();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const filteredSurgeons = useMemo(() => {
    if (!tokens.length) return surgeons;
    return surgeons.filter(s => fuzzyMatch(buildSearchBlob(s), tokens));
  }, [surgeons, q]);

  const filteredVendors = useMemo(() => {
    if (!tokens.length) return vendors;
    return vendors.filter(v =>
      fuzzyMatch(`${v.name} ${v.alias}`, tokens)
    );
  }, [vendors, q]);

  const hasVendorResults = q && filteredVendors.length > 0 && filteredVendors.length < vendors.length;

  return { q, filteredSurgeons, filteredVendors, hasVendorResults };
}

