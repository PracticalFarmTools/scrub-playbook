import { useCallback, useEffect, useState } from 'react';
import { BOOK_KEY, LEGACY_STORAGE_KEY, TECH_NAME_KEY, emptyProcedure, emptySurgeon, uid } from '../data/schema';
import { migrateBook } from '../data/migrate';
import { mergeBackup } from '../data/share';
import { applySave, clearConfirmation, stripConfirmation, withConfirmation } from '../data/trust';

function loadBook() {
  try {
    const saved = localStorage.getItem(BOOK_KEY);
    if (saved) return migrateBook(JSON.parse(saved));
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return migrateBook(JSON.parse(legacy));
  } catch {
    /* keep an empty book if storage is unreadable */
  }
  return migrateBook(null);
}

export function readTechName() {
  try { return localStorage.getItem(TECH_NAME_KEY) || ''; }
  catch { return ''; }
}

export function writeTechName(name) {
  const trimmed = (name || '').trim();
  if (trimmed) localStorage.setItem(TECH_NAME_KEY, trimmed);
  return trimmed;
}

export function useBook() {
  const [book, setBook] = useState(loadBook);

  useEffect(() => {
    localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  }, [book]);

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

  const renameSurgeon = useCallback((id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setBook(prev => ({
      ...prev,
      surgeons: prev.surgeons.map(s => s.id === id ? { ...s, name: trimmed } : s),
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
      sample.procedures.forEach(p => { if (!pids.has(p.id)) procedures.push(p); });
      return { version: 1, surgeons, procedures };
    });
  }, []);

  const importIncoming = useCallback((incoming) => {
    let result = { imported: 0, skipped: 0 };
    setBook(prev => {
      result = mergeBackup(prev, incoming);
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
    addSurgeon,
    deleteSurgeon,
    saveProcedure,
    deleteProcedure,
    confirmProcedure,
    disputeProcedure,
    clearDispute,
    renameSurgeon,
    copySample,
    loadSamples,
    importIncoming,
    replaceProcedure,
    newProcedure: emptyProcedure,
  };
}
