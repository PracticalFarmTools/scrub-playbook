import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOK_KEY, BOOK_VERSION, LEGACY_STORAGE_KEY, TECH_NAME_KEY, cleanFirstCase, emptyProcedure, emptySurgeon, uid } from '../data/schema';
import { migrateBook } from '../data/migrate';
import { refreshSamples } from '../data/defaults';
import { requestPersistentStorage, safeGet, safeRemove, safeSet } from '../data/storage';
import { openChannel, readValue, writeValue } from '../data/store';
import { mergeBackup, placeIncomingCard } from '../data/share';
import { archivePlace, deletePlace } from '../data/places';
import { applyUnitBook, copyUnitProcedure } from '../data/unitBook';
import { applySave, clearConfirmation, stripConfirmation, withConfirmation } from '../data/trust';

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
    return { book: migrateBook(null), unreadable, legacy };
  }
  try {
    const book = refreshSamples(migrateBook(source ?? null));
    return { book, unreadable: false, legacy };
  } catch {
    if (source !== undefined) safeSet(UNREADABLE_KEY, JSON.stringify(source));
    return { book: migrateBook(null), unreadable: source !== undefined, legacy };
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
  const [saveState, setSaveState] = useState({ ok: true });
  const [saveAttempt, setSaveAttempt] = useState(0);
  const bookRef = useRef(book);
  const askedPersist = useRef(false);
  const skipSave = useRef(true);
  const saveSeq = useRef(0);
  const channel = useRef(null);

  useEffect(() => {
    let alive = true;
    loadStoredBook().then(result => {
      if (!alive) return;
      skipSave.current = result.unreadable;
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
    const seq = ++saveSeq.current;
    writeValue(BOOK_KEY, book).then(result => {
      if (seq !== saveSeq.current) return;
      if (result.ok) {
        safeRemove(LEGACY_STORAGE_KEY);
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

  const deleteSurgeon = useCallback((id) => {
    setBook(prev => ({
      ...prev,
      surgeons: prev.surgeons.filter(s => s.id !== id),
      procedures: prev.procedures.filter(p => p.surgeonId !== id),
    }));
  }, []);

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
    setBook(prev => ({ ...prev, procedures: prev.procedures.filter(p => p.id !== id) }));
  }, []);

  const confirmProcedure = useCallback((id, name) => {
    const tech = writeTechName(name) || name;
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id
        ? withConfirmation(p, { name: tech, mode: 'personal' })
        : p),
    }));
    return tech;
  }, []);

  const disputeProcedure = useCallback((id) => {
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id ? { ...p, disputed: true, updatedAt: new Date().toISOString() } : p),
    }));
  }, []);

  const clearDispute = useCallback((id) => {
    setBook(prev => ({
      ...prev,
      procedures: prev.procedures.map(p => p.id === id ? clearConfirmation({ ...p, disputed: false }) : p),
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
        firstCaseBy: readTechName(),
      } : s),
    }));
  }, []);

  const setPlaceArchived = useCallback((place, archived) => {
    setBook(prev => archivePlace(prev, place, archived));
  }, []);

  const removePlace = useCallback((place, options) => {
    setBook(prev => deletePlace(prev, place, options));
  }, []);

  const updateSurgeon = useCallback((id, { name, facility } = {}) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setBook(prev => ({
      ...prev,
      surgeons: prev.surgeons.map(s => s.id === id && !s.unitBook ? { ...s, name: trimmed, facility: (facility || '').trim() } : s),
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
    replaceProcedure,
    newProcedure: emptyProcedure,
  };
}
