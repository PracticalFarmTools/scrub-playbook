import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOK_KEY, BOOK_VERSION, CHANGES_KEY, LEGACY_STORAGE_KEY, TECH_NAME_KEY, cleanFirstCase, emptyProcedure, emptySurgeon, uid } from '../data/schema';
import { migrateBook } from '../data/migrate';
import { refreshSamples } from '../data/defaults';
import { requestPersistentStorage, safeGet, safeRemove, safeSet } from '../data/storage';
import { openChannel, readValue, writeValue } from '../data/store';
import { placeIncomingCard } from '../data/incoming';
import { mergeBackup, restoreBackup } from '../data/backup';
import { archivePlace, deletePlace } from '../data/places';
import { applyUnitBook, copyUnitProcedure } from '../data/unitBook';
import { applySave, clearConfirmation, personId, stripConfirmation, withConfirmation } from '../data/trust';

export const UNREADABLE_KEY = 'scrubplaybook_book_unreadable';

function parseRaw(raw) {
  if (raw === null) return undefined;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Reads the saved book. `unreadable` is true when something is stored but cannot be read;
 * that copy is kept under UNREADABLE_KEY and is never overwritten by an empty book.
 */
export async function loadStoredBook() {
  let unreadable = false;
  const saved = await readValue(BOOK_KEY);
  const localRaw = safeGet(BOOK_KEY);
  let source = saved;
  let legacy = false;
  if (source === undefined && localRaw !== null) unreadable = true;
  if (source === undefined && !unreadable) {
    const legacyValue = parseRaw(safeGet(LEGACY_STORAGE_KEY));
    if (legacyValue === null) unreadable = true;
    else if (legacyValue !== undefined) { source = legacyValue; legacy = true; }
  }
  if (unreadable) {
    safeSet(UNREADABLE_KEY, localRaw ?? safeGet(LEGACY_STORAGE_KEY) ?? '');
    return { book: migrateBook(null), unreadable, legacy, needsWrite: false };
  }
  try {
    const book = refreshSamples(migrateBook(source ?? null));
    return { book, unreadable: false, legacy, needsWrite: legacy || localRaw !== null };
  } catch {
    if (source !== undefined) safeSet(UNREADABLE_KEY, JSON.stringify(source));
    return { book: migrateBook(null), unreadable: source !== undefined, legacy, needsWrite: false };
  }
}

export function readTechName() {
  return safeGet(TECH_NAME_KEY, '') || '';
}

export function writeTechName(name) {
  const trimmed = (name || '').trim();
  if (trimmed) safeSet(TECH_NAME_KEY, trimmed);
  return trimmed;
}

export function useBook() {
  const [book, setBook] = useState(() => migrateBook(null));
  const [loaded, setLoaded] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [saveState, setSaveState] = useState(/** @type {{ ok: boolean, reason?: string }} */ ({ ok: true }));
  const [saveAttempt, setSaveAttempt] = useState(0);
  const bookRef = useRef(book);
  const askedPersist = useRef(false);
  const skipSave = useRef(true);
  const quietWrite = useRef(false);
  const saveSeq = useRef(0);
  const channel = useRef(null);

  useEffect(() => {
    let alive = true;
    loadStoredBook().then(result => {
      if (!alive) return;
      skipSave.current = result.unreadable || !result.needsWrite;
      quietWrite.current = result.needsWrite;
      bookRef.current = result.book;
      setBook(result.book);
      setUnreadable(result.unreadable);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return undefined;
    const link = openChannel(async (key) => {
      if (key !== BOOK_KEY) return;
      const value = await readValue(BOOK_KEY);
      if (value === undefined) return;
      try {
        const next = refreshSamples(migrateBook(value));
        skipSave.current = true;
        bookRef.current = next;
        setBook(next);
      } catch {
        /* keep this tab's copy */
      }
    });
    channel.current = link;
    return () => { link.close(); channel.current = null; };
  }, [loaded]);

  useEffect(() => {
    bookRef.current = book;
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const counted = !quietWrite.current;
    quietWrite.current = false;
    const seq = ++saveSeq.current;
    writeValue(BOOK_KEY, book).then(result => {
      if (seq !== saveSeq.current) return;
      if (result.ok) {
        safeRemove(LEGACY_STORAGE_KEY);
        if (counted && book.surgeons.some(s => !s.demo)) safeSet(CHANGES_KEY, String((Number(safeGet(CHANGES_KEY, '0')) || 0) + 1));
        channel.current?.post(BOOK_KEY);
        setSaveState(prev => (prev.ok ? prev : { ok: true }));
      } else {
        setSaveState({ ok: false, reason: result.reason });
      }
    });
    if (!askedPersist.current && book.surgeons.some(s => !s.demo)) {
      askedPersist.current = true;
      requestPersistentStorage();
    }
  }, [book, loaded, saveAttempt]);

  const retrySave = useCallback(() => setSaveAttempt(n => n + 1), []);

  const addSurgeon = useCallback((partial) => {
    const surgeon = emptySurgeon({
      ...partial,
      name: partial.name.trim(),
      facility: (partial.facility || '').trim(),
      addedBy: writeTechName(partial.addedBy) || partial.addedBy || '',
    });
    setBook(prev => ({ ...prev, surgeons: [surgeon, ...prev.surgeons] }));
    return surgeon;
  }, []);

  const commit = useCallback((next) => {
    bookRef.current = next;
    setBook(next);
  }, []);

  const deleteSurgeon = useCallback((id) => {
    const prev = bookRef.current;
    const removed = {
      surgeons: prev.surgeons.filter(s => s.id === id),
      procedures: prev.procedures.filter(p => p.surgeonId === id),
    };
    commit({
      ...prev,
      surgeons: prev.surgeons.filter(s => s.id !== id),
      procedures: prev.procedures.filter(p => p.surgeonId !== id),
    });
    return removed;
  }, [commit]);

  /** Puts back what a delete removed. Anything already back in the book is left as it is. */
  const restoreRemoved = useCallback((removed) => {
    const prev = bookRef.current;
    const surgeonIds = new Set(prev.surgeons.map(s => s.id));
    const procedureIds = new Set(prev.procedures.map(p => p.id));
    const surgeons = (removed?.surgeons || []).filter(s => !surgeonIds.has(s.id));
    const keptSurgeons = new Set([...surgeonIds, ...surgeons.map(s => s.id)]);
    const procedures = (removed?.procedures || []).filter(p => !procedureIds.has(p.id) && keptSurgeons.has(p.surgeonId));
    commit({ ...prev, surgeons: [...surgeons, ...prev.surgeons], procedures: [...procedures, ...prev.procedures] });
    return { surgeons: surgeons.length, procedures: procedures.length };
  }, [commit]);

  const saveProcedure = useCallback((procedure) => {
    setBook(prev => {
      const previous = prev.procedures.find(p => p.id === procedure.id);
      const next = applySave(previous, procedure);
      return {
        ...prev,
        procedures: previous
          ? prev.procedures.map(p => p.id === next.id ? next : p)
          : [next, ...prev.procedures],
      };
    });
  }, []);

  const deleteProcedure = useCallback((id) => {
    const prev = bookRef.current;
    const removed = { surgeons: [], procedures: prev.procedures.filter(p => p.id === id) };
    commit({ ...prev, procedures: prev.procedures.filter(p => p.id !== id) });
    return removed;
  }, [commit]);

  const confirmProcedure = useCallback((id, name, { mode = 'personal' } = {}) => {
    const tech = writeTechName(name) || name;
    const userId = personId(tech);
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id
        ? withConfirmation(p, { name: tech, userId, mode })
        : p),
    }));
    return tech;
  }, []);

  const disputeProcedure = useCallback((id, reason = '') => {
    const at = new Date().toISOString();
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id ? {
        ...p,
        disputed: true,
        reportNote: String(reason || '').trim().slice(0, 300),
        disputedAt: at,
        disputedBy: readTechName(),
        updatedAt: at,
      } : p),
    }));
  }, []);

  const clearDispute = useCallback((id) => {
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id ? clearConfirmation({ ...p, disputed: false, reportNote: '', disputedAt: null, disputedBy: '' }) : p),
    }));
  }, []);

  const saveFirstCase = useCallback((id, lines) => {
    const firstCase = cleanFirstCase(lines);
    setBook(prev => ({
      ...prev,
      surgeons: prev.surgeons.map(s => s.id === id && !s.unitBook ? {
        ...s,
        firstCase,
        firstCaseAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        firstCaseBy: readTechName(),
      } : s),
    }));
  }, []);

  const setPlaceArchived = useCallback((place, archived) => {
    setBook(prev => archivePlace(prev, place, archived));
  }, []);

  const removePlace = useCallback((place, options) => {
    const prev = bookRef.current;
    const next = deletePlace(prev, place, options);
    const left = new Set(next.surgeons.map(s => s.id));
    commit(next);
    return {
      surgeons: prev.surgeons.filter(s => !left.has(s.id)),
      procedures: prev.procedures.filter(p => !left.has(p.surgeonId)),
    };
  }, [commit]);

  const updateSurgeon = useCallback((id, /** @type {{ name?: string, facility?: string }} */ { name, facility } = {}) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setBook(prev => ({
      ...prev,
      surgeons: prev.surgeons.map(s => s.id === id && !s.unitBook ? { ...s, name: trimmed, facility: (facility || '').trim(), updatedAt: new Date().toISOString() } : s),
    }));
  }, []);

  const copySample = useCallback((surgeonId) => {
    setBook(prev => {
      const surgeon = prev.surgeons.find(s => s.id === surgeonId && s.demo);
      if (!surgeon) return prev;
      const id = uid();
      const now = new Date().toISOString();
      const copy = { ...surgeon, id, demo: false, createdAt: now, addedBy: readTechName() };
      const procedures = prev.procedures.filter(p => p.surgeonId === surgeonId).map(p => stripConfirmation({
        ...p,
        id: uid(),
        surgeonId: id,
        demo: false,
        name: 'Copied setup',
        updatedAt: now,
        baseUpdatedAt: now,
      }));
      return {
        ...prev,
        surgeons: [copy, ...prev.surgeons],
        procedures: [...procedures, ...prev.procedures],
      };
    });
  }, []);

  const loadSamples = useCallback((sample) => {
    setBook(prev => {
      const ids = new Set(prev.surgeons.map(s => s.id));
      const surgeons = [...prev.surgeons];
      const procedures = [...prev.procedures];
      sample.surgeons.forEach(s => { if (!ids.has(s.id)) surgeons.push(s); });
      const pids = new Set(procedures.map(p => p.id));
      sample.procedures.forEach(p => { if (!pids.has(p.id) && !ids.has(p.surgeonId)) procedures.push(p); });
      return { version: BOOK_VERSION, surgeons, procedures };
    });
  }, []);

  const importUnitBook = useCallback((file, options = {}) => {
    const result = applyUnitBook(bookRef.current, file, options);
    if (result.status === 'updated') {
      bookRef.current = result.book;
      setBook(result.book);
    }
    return result;
  }, []);

  const copyToNotes = useCallback((procedureId) => {
    const result = copyUnitProcedure(bookRef.current, procedureId);
    if (result.status === 'copied') {
      bookRef.current = result.book;
      setBook(result.book);
    }
    return result;
  }, []);

  const importIncoming = useCallback((incoming, options = {}) => {
    let result = { imported: 0, skipped: 0 };
    setBook(prev => {
      result = options.surgeonId
        ? placeIncomingCard(prev, incoming, { surgeonId: options.surgeonId })
        : mergeBackup(prev, incoming);
      return result.book;
    });
    return result;
  }, []);

  const restoreOwnBackup = useCallback((incoming) => {
    const result = restoreBackup(bookRef.current, incoming);
    bookRef.current = result.book;
    setBook(result.book);
    return result;
  }, []);

  const replaceBook = useCallback((next) => {
    bookRef.current = next;
    setBook(next);
  }, []);

  const replaceProcedure = useCallback((procedure) => {
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === procedure.id ? procedure : p),
    }));
  }, []);

  return {
    book,
    loaded,
    unreadable,
    saveState,
    retrySave,
    addSurgeon,
    deleteSurgeon,
    saveProcedure,
    deleteProcedure,
    confirmProcedure,
    disputeProcedure,
    clearDispute,
    saveFirstCase,
    setPlaceArchived,
    removePlace,
    updateSurgeon,
    copySample,
    loadSamples,
    importUnitBook,
    copyToNotes,
    importIncoming,
    restoreOwnBackup,
    replaceProcedure,
    replaceBook,
    restoreRemoved,
    newProcedure: emptyProcedure,
  };
}
