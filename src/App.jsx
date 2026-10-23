import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, MapPin, Menu, Plus, Upload, WifiOff } from 'lucide-react';
import { SURGICAL_VENDORS } from './data/vendors';
import { buildSampleBook } from './data/defaults';
import { CARD_STATUS, CHANGES_KEY, HANDED_OVER_KEY, HOME_SCREEN_KEY, LAST_EXPORT_KEY, SORT_KEY, STALE_AFTER_DAYS, duplicateProcedure, emptyProcedure } from './data/schema';
import { personId, rowTrust, trustState, withConfirmation } from './data/trust';
import { SORT_CHOICES, facilityLabels, filterBook, sortSurgeons } from './data/searchBook';
import { parseImport, restoreExtras, toBackup, toPlacePack } from './data/share';
import { loadToday, localDay, saveToday } from './data/today';
import { readTechName, useBook } from './hooks/useBook';
import {
  dictationOff, handOverPublishing, publishUnitBook, readPublished, savePublished, takeOverPublishing,
  trustOptionsFor, unitResultText, withUnitSettings,
} from './data/unitBook';
import { useAuditLog } from './hooks/useAuditLog';
import { findPhiInBook, phiFoundText } from './data/phi';
import { inPlaceGroup } from './data/places';
import { closeSuggestion, loadSuggestions, openSuggestion, recordSuggestion, saveSuggestions } from './data/suggestions';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import SurgeonCard from './components/SurgeonCard';
import SearchBox from './components/SearchBox';
import TodayList from './components/TodayList';
import EmptyState from './components/EmptyState';
import RecentActivity from './components/RecentActivity';
import { VendorLibrary, VendorResults } from './components/VendorPanels';
import ConfirmNameModal from './components/ConfirmNameModal';
import { needsHomeScreen, safeGet, safeJson, safeSet } from './data/storage';
import { keyPlaces, leaveKeysOut, lockPublished } from './data/keyLock';
import { downloadText } from './utils/download';
import { applyUpdate, onUpdateReady } from './pwa';
import { UNREADABLE_KEY } from './hooks/useBook';
import { useDialog } from './hooks/useDialog';

const AddSurgeonModal = lazy(() => import('./components/AddSurgeonModal'));
const CaseView = lazy(() => import('./components/CaseView'));
const PlacesSheet = lazy(() => import('./components/PlacesSheet'));
const ImportCardModal = lazy(() => import('./components/ImportCardModal'));
const ProcedureEditor = lazy(() => import('./components/ProcedureEditor'));
const ShareCardModal = lazy(() => import('./components/ShareCardModal'));
const PrintDay = lazy(() => import('./components/PrintDay'));
const BackupKeyPrompt = lazy(() => import('./components/BackupKeyPrompt'));

const WEEK_DAYS = 7;
const CHANGES_BEFORE_REMINDER = 20;

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export default function App() {
  const bookApi = useBook();
  const { book } = bookApi;
  const { log: auditLog, addEntry: addAudit, mergeLog } = useAuditLog();
  const { isOnline } = useNetworkStatus();

  const [search, setSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0);
  const clearSearch = () => {
    clearSearch();
    setSearchKey(key => key + 1);
  };
  const [sortMode, setSortMode] = useState(() => {
    const saved = safeGet(SORT_KEY, 'attention');
    return SORT_CHOICES.some(([value]) => value === saved) ? saved : 'attention';
  });
  const [undo, setUndo] = useState(null);
  const [suggestions, setSuggestions] = useState(loadSuggestions);
  const [activeFacility, setActiveFacility] = useState(null);
  const [addDraft, setAddDraft] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const flashProcedure = (id) => setHighlight({ id });
  const [showImport, setShowImport] = useState(false);
  const [backupKey, setBackupKey] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const [editor, setEditor] = useState(null);
  const [share, setShare] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(() => !safeGet('scrubplaybook_disclaimer_seen'));
  const [caseView, setCaseView] = useState(null);
  const [showPlaces, setShowPlaces] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastExportAt, setLastExportAt] = useState(() => safeGet(LAST_EXPORT_KEY));
  const [todayVersion, setTodayVersion] = useState(0);
  const [printCases, setPrintCases] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [published, setPublished] = useState(readPublished);
  const storePublished = (next) => {
    savePublished(next);
    setPublished(next);
  };
  const [homeScreenHidden, setHomeScreenHidden] = useState(() => {
    const at = safeGet(HOME_SCREEN_KEY);
    return Boolean(at) && daysSince(at) < WEEK_DAYS;
  });

  const labels = facilityLabels(book);
  const placeFilter = activeFacility && labels.includes(activeFacility) ? activeFacility : null;
  const filtered = useMemo(
    () => filterBook(book, search, placeFilter),
    [book, search, placeFilter],
  );
  const archivedCount = book.surgeons.filter(s => !s.demo && s.archived).length;
  const q = search.trim().toLowerCase();
  const vendorHits = q
    ? SURGICAL_VENDORS.filter(v => v.name.toLowerCase().includes(q) || v.blurb.toLowerCase().includes(q))
    : [];
  const showVendorHits = q && vendorHits.length > 0 && vendorHits.length < SURGICAL_VENDORS.length;

  const hasOwnCards = book.surgeons.some(s => !s.demo);
  const changesSinceExport = Number(safeGet(CHANGES_KEY, '0')) || 0;
  const showBackupReminder = hasOwnCards
    && (!lastExportAt || daysSince(lastExportAt) > WEEK_DAYS || changesSinceExport >= CHANGES_BEFORE_REMINDER);
  const backupReminderText = !lastExportAt
    ? 'Your book lives only on this phone. Export a backup and keep the file somewhere safe.'
    : changesSinceExport >= CHANGES_BEFORE_REMINDER
      ? `${changesSinceExport} changes since your last backup. Export a fresh one.`
      : `Your last backup is ${Math.floor(daysSince(lastExportAt))} days old. Export a fresh one.`;
  const showHomeScreen = !homeScreenHidden && needsHomeScreen();

  const trustFor = useCallback(
    (procedure) => trustOptionsFor(procedure, book.surgeons.find(surgeon => surgeon.id === procedure.surgeonId), published),
    [book.surgeons, published],
  );

  const bySurgeon = useMemo(() => {
    const all = new Map();
    const shown = new Map();
    const push = (map, procedure) => {
      if (!map.has(procedure.surgeonId)) map.set(procedure.surgeonId, []);
      map.get(procedure.surgeonId).push(procedure);
    };
    book.procedures.forEach(procedure => push(all, procedure));
    filtered.procedures.forEach(procedure => push(shown, procedure));
    return { all, shown };
  }, [book.procedures, filtered.procedures]);

  const sortedSurgeons = useMemo(
    () => sortSurgeons(filtered.surgeons, book.procedures, sortMode, surgeon => rowTrust(bySurgeon.all.get(surgeon.id) || [], {}, trustFor)?.status),
    [filtered.surgeons, book.procedures, sortMode, bySurgeon, trustFor],
  );

  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), 20000);
    return () => clearTimeout(timer);
  }, [undo]);

  const updateSuggestions = (change) => {
    setSuggestions(prev => {
      const next = change(prev);
      saveSuggestions(next);
      return next;
    });
  };

  const offerUndo = (text, removed) => {
    if (removed?.surgeons?.length || removed?.procedures?.length) setUndo({ text, removed });
  };

  const undoDelete = () => {
    if (!undo) return;
    const result = bookApi.restoreRemoved(undo.removed);
    addAudit({ action: 'Delete undone', surgeonName: undo.removed.surgeons[0]?.name || '', note: `${result.surgeons} surgeons, ${result.procedures} procedures back` });
    setUndo(null);
  };

  const confirmCard = (procedure, name, surgeonName) => {
    const options = trustFor(procedure);
    const tech = bookApi.confirmProcedure(procedure.id, name, { mode: options.mode });
    addAudit({ action: 'Case confirmed', surgeonName, user: name, note: procedure.name });
    if (options.mode !== 'facility') return {};
    const after = trustState(withConfirmation(procedure, { name: tech, userId: personId(tech), mode: 'facility' }), options);
    const message = after.status === CARD_STATUS.CONFIRMED
      ? `Confirmed by ${tech}. Two people have now matched this card.`
      : `Confirmed by ${tech}. This unit asks a second person to confirm before it shows as matched.`;
    setNotice(message);
    return { message };
  };

  const placePhi = (place, archived) => findPhiInBook(
    book,
    book.surgeons.filter(surgeon => inPlaceGroup(surgeon, place, archived)).map(surgeon => surgeon.id),
  );

  const handOffPlace = async (place, { archived = false } = {}) => {
    const found = placePhi(place, archived);
    if (found.length) return { message: `${place} was not handed off. ${phiFoundText(found)}` };
    const pack = toPlacePack(book, place, readTechName() || 'A tech', new Date().toISOString(), { archived });
    const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';
    const outcome = await shareFile(`scrubplaybook-${slug}-${new Date().toISOString().slice(0, 10)}.json`, pack);
    if (outcome === 'cancelled') return { message: `${place} was not handed off.` };
    addAudit({ action: 'Place handed off', surgeonName: place, note: `${pack.book.surgeons.length} surgeons, ${pack.book.procedures.length} procedures` });
    return { message: `Hand-off file for ${place} is ready. The cards arrive unconfirmed for the next tech.` };
  };

  const publishPlace = async (place) => {
    const found = placePhi(place, false);
    if (found.length) return { message: `${place} was not published. ${phiFoundText(found)}` };
    let signed;
    try {
      signed = await publishUnitBook(book, place, readTechName() || 'A tech', { published });
    } catch (err) {
      if (err?.message === 'no-key') return { message: `This phone does not hold the publishing key for ${place}. Restore your locked backup with its passphrase, or ask the unit who publishes ${place} now.` };
      throw err;
    }
    const { file, published: next } = signed;
    const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';
    const outcome = await shareFile(`scrubplaybook-unit-${slug}-r${file.revision}.json`, file);
    if (outcome === 'cancelled') return { message: `${place} was not published. The next file is still revision ${file.revision}.` };
    storePublished(next);
    addAudit({ action: 'Unit book published', surgeonName: place, note: `Revision ${file.revision}` });
    setNotice(`Published ${place} as unit book revision ${file.revision}.`);
    return { message: `Published ${place} as unit book revision ${file.revision}.` };
  };

  const handOverPlace = async (place) => {
    const found = placePhi(place, false);
    if (found.length) return { message: `Publishing for ${place} was not handed over. ${phiFoundText(found)}` };
    const result = await handOverPublishing(book, place, readTechName() || 'A tech', { published });
    if (result.error) return { message: `This phone does not publish ${place}.` };
    const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';
    const outcome = await shareFile(`scrubplaybook-publisher-${slug}-r${result.revision}.json`, result.file);
    if (outcome === 'cancelled') return { message: `Publishing for ${place} was not handed over. This phone still publishes it.` };
    storePublished(result.published);
    const handedOver = safeJson(HANDED_OVER_KEY, {});
    safeSet(HANDED_OVER_KEY, JSON.stringify({
      ...(handedOver && typeof handedOver === 'object' ? handedOver : {}),
      [place]: { unitBookId: result.file.unitFile.unitBookId, revision: result.revision, at: new Date().toISOString() },
    }));
    addAudit({ action: 'Publishing handed over', surgeonName: place, note: `Revision ${result.revision}` });
    return {
      message: `Hand-over file for ${place} is ready with revision ${result.revision}. Send it only to the next publisher. This phone no longer publishes ${place}; your cards stay as your notes.`,
    };
  };

  const saveUnitSettings = (place, settings) => {
    storePublished(withUnitSettings(published, place, settings));
  };

  const saveBackup = (publishedInBackup) => {
    const data = toBackup(book, {
      today: loadToday(),
      log: auditLog,
      published: publishedInBackup,
      suggestions,
    });
    downloadText(`scrubplaybook-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    const now = new Date().toISOString();
    safeSet(LAST_EXPORT_KEY, now);
    safeSet(CHANGES_KEY, '0');
    setLastExportAt(now);
    const found = findPhiInBook(book);
    if (found.length) setNotice(`Backup saved. Keep the file on your own phone. ${phiFoundText(found)}`);
  };

  const exportPlaybook = () => {
    if (!book.surgeons.some(surgeon => !surgeon.demo)) {
      setNotice('Samples stay on this device. Add your own surgeon before you export a backup.');
      return;
    }
    if (keyPlaces(published).length) {
      setBackupKey(true);
      return;
    }
    saveBackup(published);
  };

  const shareFile = async (filename, data) => {
    const body = JSON.stringify(data, null, 2);
    const file = new File([body], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
      }
    }
    downloadText(filename, body);
    return 'saved';
  };

  const onImport = (incoming, options = {}) => {
    try {
      if (options.handover) {
        const result = takeOverPublishing(book, options.handover, { fingerprint: options.fingerprint });
        if (!result.entry) return { success: false, error: unitResultText(result.place, result) };
        bookApi.replaceBook(result.book);
        storePublished({ ...published, [result.place]: result.entry });
        addAudit({ action: 'Publishing taken over', surgeonName: result.place, note: `Revision ${result.entry.revision}` });
        setNotice(`You now publish the unit book for ${result.place}. Its cards are your notes. Delete the hand-over file.`);
        return { success: true, imported: 0, skipped: 0 };
      }
      if (options.unitFile) {
        const result = bookApi.importUnitBook(options.unitFile, { adopt: Boolean(options.adopt), published, fingerprint: options.fingerprint });
        const text = unitResultText(options.unitFile.place, result);
        if (result.status !== 'updated') return { success: false, error: text };
        addAudit({ action: 'Unit book updated', surgeonName: options.unitFile.place, note: `Revision ${result.revision}` });
        setNotice(text);
        return { success: true, imported: result.counts.added, skipped: 0 };
      }
      if (options.restore) {
        const backup = options.restore;
        const result = bookApi.restoreOwnBackup(backup.full);
        const handedOver = safeJson(HANDED_OVER_KEY, {});
        const merged = restoreExtras(
          { published, today: loadToday(), log: auditLog, suggestions },
          backup.extras || {},
          { today: localDay(), handedOver: handedOver && typeof handedOver === 'object' ? handedOver : {} },
        );
        storePublished(merged.published);
        saveToday(merged.today);
        saveSuggestions(merged.suggestions);
        setSuggestions(merged.suggestions);
        mergeLog(backup.extras?.log || []);
        setTodayVersion(v => v + 1);
        if (backup.exportedAt && (!lastExportAt || backup.exportedAt > lastExportAt)) {
          safeSet(LAST_EXPORT_KEY, backup.exportedAt);
          safeSet(CHANGES_KEY, '0');
          setLastExportAt(backup.exportedAt);
        }
        addAudit({ action: 'Backup restored', surgeonName: `${result.added} added`, note: `${result.updated} updated, ${result.kept} kept` });
        const publishing = keyPlaces(merged.published).filter(place => !published[place]?.privateKey);
        setNotice(`Backup restored: ${result.added} added, ${result.updated} updated from the backup, ${result.kept} already current. Confirmations, the board, and activity came back with it.${publishing.length ? ` This phone publishes ${publishing.join(', ')} again.` : ''}`);
        return { success: true, imported: result.added, skipped: result.kept };
      }
      const parsed = incoming?.surgeons ? { book: incoming } : parseImport(incoming);
      const result = bookApi.importIncoming(parsed.book, options);
      addAudit({ action: 'Backup imported', surgeonName: `${result.imported} added`, note: `${result.skipped} skipped` });
      setNotice(`${result.imported} added, ${result.skipped} skipped. Imported cards are unconfirmed.`);
      return { success: true, imported: result.imported, skipped: result.skipped };
    } catch {
      return { success: false, error: 'That is not a Scrub Playbook card or backup.' };
    }
  };

  const saveSurgeon = (partial, procedureName = '') => {
    const surgeon = bookApi.addSurgeon(partial);
    if (!surgeon) return;
    addAudit({ action: 'Surgeon created', surgeonName: surgeon.name, user: partial.addedBy });
    setEditor({
      surgeon,
      procedure: emptyProcedure(surgeon.id, { name: procedureName || '' }),
    });
  };

  const openCase = (surgeon, procedure) => {
    setCaseView({ queue: [procedure.id], index: 0 });
  };

  const openTodayCase = (procedure) => {
    clearSearch();
    setActiveFacility(null);
    setCaseView({ queue: [procedure.id], index: 0, returnTo: true });
  };

  const openTodayAll = (ready) => {
    clearSearch();
    setActiveFacility(null);
    setCaseView({ queue: ready.map(entry => entry.procedure.id), index: 0, returnTo: true });
  };

  const printToday = (ready) => setPrintCases(ready.map(entry => entry.procedure.id));
  const donePrinting = useCallback(() => setPrintCases(null), []);

  const caseProcedureId = caseView ? caseView.queue[caseView.index] : null;
  const caseProcedure = caseProcedureId ? book.procedures.find(item => item.id === caseProcedureId) : null;
  const caseSurgeon = caseProcedure ? book.surgeons.find(item => item.id === caseProcedure.surgeonId) : null;

  const closeCase = () => {
    if (caseView?.returnTo && caseProcedureId) flashProcedure(caseProcedureId);
    setCaseView(null);
  };

  const stepCase = (delta) => setCaseView(current => (current
    ? { ...current, index: Math.min(current.queue.length - 1, Math.max(0, current.index + delta)) }
    : current));

  const busy = Boolean(caseView || editor || addDraft || showImport || share || showPlaces || confirmTarget || showDisclaimer || printCases);

  useEffect(() => onUpdateReady(setUpdateReady), []);

  useEffect(() => {
    if (!updateReady || busy) return undefined;
    const onHide = () => {
      if (document.visibilityState === 'hidden') applyUpdate();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [updateReady, busy]);

  useEffect(() => {
    if (!highlight) return undefined;
    const el = document.getElementById(`procedure-${highlight.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(timer);
  }, [highlight]);

  const saveProcedure = (procedure) => {
    bookApi.saveProcedure(procedure);
    const surgeon = book.surgeons.find(s => s.id === procedure.surgeonId);
    addAudit({ action: 'Procedure saved', surgeonName: surgeon?.name || '', note: procedure.name });
  };

  const downloadUnreadable = () => {
    downloadText(`scrubplaybook-unreadable-${new Date().toISOString().slice(0, 10)}.json`, safeGet(UNREADABLE_KEY, ''));
  };

  if (!bookApi.loaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50" role="status">
        <p className="text-sm font-semibold text-slate-600">Opening your book…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden max-[379px]:flex sm:flex shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-medical-600 to-medical-800 items-center justify-center shadow-lg shadow-medical-600/20">
                <BookOpen size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="max-[379px]:sr-only text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-none truncate">ScrubPlaybook</h1>
                  {!isOnline && <span className={`hidden sm:inline-flex ${offlineBadge}`}><WifiOff size={12} aria-hidden="true" /> Offline</span>}
                </div>
                <p className="hidden sm:block text-xs text-slate-600 tracking-wide truncate">Your notes. The official card still wins.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <button type="button" onClick={exportPlaybook} className={headerButton} title="Export backup" aria-label="Export backup">
                <Download size={20} />
              </button>
              <button type="button" onClick={() => setShowPlaces(true)} className={`${headerButton} gap-1 sm:px-2.5 text-xs font-bold`} title="Places" aria-label="Places">
                <MapPin size={20} className="sm:hidden" />
                <span className="hidden sm:inline">Places</span>
              </button>
              <button type="button" onClick={() => setShowImport(true)} className={headerButton} title="Import" aria-label="Import">
                <Upload size={20} />
              </button>
              <button type="button" onClick={() => setShowVendors(v => !v)} className={headerButton} title="Company pages" aria-label="Company pages" aria-expanded={showVendors}>
                <Menu size={20} />
              </button>
              <button type="button" onClick={() => setAddDraft({})} aria-label="Add surgeon" className="sm:ml-1 min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl bg-medical-600 text-white font-semibold text-sm cursor-pointer">
                <Plus size={16} />
                <span className="hidden sm:inline">Add surgeon</span>
              </button>
            </div>
          </div>
          <p className="sm:hidden -mt-2 mb-2 flex items-center gap-2 text-xs text-slate-600">
            {!isOnline && <span className={offlineBadge}><WifiOff size={12} aria-hidden="true" /> Offline</span>}
            Your notes. The official card still wins.
          </p>
          <p role="status" className="sr-only">{isOnline ? '' : 'Offline. Your book still works on this phone.'}</p>
          <SearchBox key={searchKey} initialValue={search} onChange={setSearch} />
          {labels.length > 1 && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
              <button onClick={() => setActiveFacility(null)} aria-pressed={!placeFilter} className={`shrink-0 min-h-11 px-3 rounded-full text-xs font-bold cursor-pointer ${!placeFilter ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-700'}`}>All places</button>
              {labels.map(label => (
                <button key={label} onClick={() => setActiveFacility(placeFilter === label ? null : label)} aria-pressed={placeFilter === label} className={`shrink-0 min-h-11 px-3 rounded-full text-xs font-bold cursor-pointer ${placeFilter === label ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {showVendorHits && <VendorResults vendors={vendorHits} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {updateReady && !busy && (
          <div className="bg-medical-50 border border-medical-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-medical-900">A new version is ready. It installs the next time you leave the app, never during a case.</p>
            <button onClick={applyUpdate} className="shrink-0 min-h-11 px-4 rounded-xl bg-medical-700 text-white text-sm font-bold cursor-pointer">Update now</button>
          </div>
        )}
        {!bookApi.saveState.ok && (
          <div role="alert" className="bg-rose-50 border border-rose-300 rounded-2xl px-4 py-3 mb-4 space-y-2">
            <p className="text-sm font-bold text-rose-900">
              {bookApi.saveState.reason === 'full'
                ? 'This phone is out of room for your book. Your last change is still on screen but is not saved yet.'
                : 'This browser is not letting the app save. Your last change is still on screen but is not saved yet.'}
            </p>
            <p className="text-xs text-rose-800">Export a backup now. Then free space or leave private browsing, and try again.</p>
            <div className="flex gap-2">
              <button onClick={exportPlaybook} className="min-h-11 px-4 rounded-xl bg-rose-700 text-white text-sm font-bold cursor-pointer">Export backup</button>
              <button onClick={bookApi.retrySave} className="min-h-11 px-4 rounded-xl border border-rose-300 text-rose-800 text-sm font-bold cursor-pointer">Try again</button>
            </div>
          </div>
        )}
        {bookApi.unreadable && (
          <div role="alert" className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 space-y-2">
            <p className="text-sm font-bold text-amber-900">Your saved book could not be opened. A copy of it is kept on this phone.</p>
            <p className="text-xs text-amber-800">Download that copy and keep it. You can restore from your last backup with Import.</p>
            <button onClick={downloadUnreadable} className="min-h-11 px-4 rounded-xl bg-amber-700 text-white text-sm font-bold cursor-pointer">Download the copy</button>
          </div>
        )}
        {notice && (
          <div className="bg-medical-50 border border-medical-200 rounded-2xl px-4 py-3 mb-4 flex items-start justify-between gap-3">
            <p role="status" className="text-sm text-medical-900">{notice}</p>
            <button type="button" onClick={() => setNotice('')} className="shrink-0 min-h-11 px-2 text-xs font-bold text-medical-700 cursor-pointer">Dismiss</button>
          </div>
        )}
        {showBackupReminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-900">{backupReminderText}</p>
            <button onClick={exportPlaybook} className="shrink-0 min-h-11 text-sm font-bold text-white bg-amber-700 rounded-xl px-4 cursor-pointer">Back up</button>
          </div>
        )}
        {showHomeScreen && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 mb-4 space-y-2">
            <p className="text-sm font-bold text-sky-900">Add Scrub Playbook to your Home Screen</p>
            <p className="text-sm text-sky-900">Safari can clear a website’s saved data after 7 days without a visit. The Home Screen app keeps your book. Tap Share, then Add to Home Screen, and open it from there.</p>
            <button
              onClick={() => { safeSet(HOME_SCREEN_KEY, new Date().toISOString()); setHomeScreenHidden(true); }}
              className="min-h-11 px-4 rounded-xl border border-sky-300 text-sky-900 text-sm font-bold cursor-pointer"
            >
              Remind me next week
            </button>
          </div>
        )}

        <TodayList
          key={todayVersion}
          book={book}
          onOpen={openTodayCase}
          onOpenAll={openTodayAll}
          onPrintAll={printToday}
          onStartProcedure={(surgeon, procedureName) => setEditor({
            surgeon,
            procedure: emptyProcedure(surgeon.id, { name: procedureName }),
          })}
          onStartSurgeon={(surgeonName, procedureName) => setAddDraft({ name: surgeonName, procedureName })}
        />

        {filtered.surgeons.length > 1 && (
          <div className="flex justify-end mb-3">
            <label htmlFor="home-sort" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Sort
              <select
                id="home-sort"
                value={sortMode}
                onChange={e => { setSortMode(e.target.value); safeSet(SORT_KEY, e.target.value); }}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {SORT_CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}

        {filtered.surgeons.length === 0 ? (
          <EmptyState
            hasQuery={!!q}
            searchTerm={search}
            archivedCount={book.surgeons.some(s => !s.archived) ? 0 : archivedCount}
            onAddSurgeon={() => setAddDraft({})}
            onPreview={!q ? () => bookApi.loadSamples(buildSampleBook()) : null}
            onOpenPlaces={() => setShowPlaces(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedSurgeons.map(surgeon => (
              <SurgeonCard
                key={surgeon.id}
                surgeon={surgeon}
                procedures={bySurgeon.shown.get(surgeon.id) || []}
                trustProcedures={bySurgeon.all.get(surgeon.id) || []}
                staleDays={STALE_AFTER_DAYS}
                trustFor={trustFor}
                highlightId={highlight?.id}
                autoOpen={Boolean(q)}
                onDeleteSurgeon={(id) => {
                  const removed = bookApi.deleteSurgeon(id);
                  addAudit({ action: 'Surgeon deleted', surgeonName: surgeon.name, note: `${removed.procedures.length} procedures` });
                  if (!surgeon.demo) offerUndo(`Deleted ${surgeon.name} and ${removed.procedures.length} ${removed.procedures.length === 1 ? 'procedure' : 'procedures'}.`, removed);
                }}
                onDeleteProcedure={(id) => {
                  const removed = bookApi.deleteProcedure(id);
                  const name = removed.procedures[0]?.name || '';
                  addAudit({ action: 'Procedure deleted', surgeonName: surgeon.name, note: name });
                  if (!surgeon.demo) offerUndo(`Deleted ${name || 'the procedure'} for ${surgeon.name}.`, removed);
                }}
                onEdit={(procedure) => setEditor({ surgeon, procedure })}
                onDuplicate={(procedure) => setEditor({ surgeon, procedure: duplicateProcedure(procedure), copyOf: procedure.name })}
                onAddProcedure={() => setEditor({ surgeon, procedure: emptyProcedure(surgeon.id, { name: '' }) })}
                onConfirm={(procedure) => setConfirmTarget(procedure)}
                onDispute={(procedure, reason) => {
                  bookApi.disputeProcedure(procedure.id, reason);
                  addAudit({ action: 'Card flagged', surgeonName: surgeon.name, note: [procedure.name, reason].filter(Boolean).join(': ') });
                }}
                onClearDispute={(id) => {
                  const procedure = book.procedures.find(item => item.id === id);
                  bookApi.clearDispute(id);
                  addAudit({ action: 'Flag cleared', surgeonName: surgeon.name, note: [procedure?.name, procedure?.reportNote].filter(Boolean).join(': ') });
                }}
                suggestionFor={(id) => openSuggestion(suggestions, id)}
                onCloseSuggestion={(suggestion, status) => {
                  updateSuggestions(prev => closeSuggestion(prev, suggestion.id, status));
                  const procedure = book.procedures.find(item => item.id === suggestion.procedureId);
                  addAudit({ action: status === 'made' ? 'Suggestion made on the card' : 'Suggestion closed', surgeonName: surgeon.name, note: procedure?.name || '' });
                }}
                onShare={(s, procedure) => setShare({ surgeon: s, procedure })}
                onUpdateSurgeon={(id, details) => {
                  bookApi.updateSurgeon(id, details);
                  addAudit({ action: 'Surgeon details edited', surgeonName: details.name || surgeon.name, note: details.facility || '' });
                }}
                onSaveFirstCase={(id, lines) => {
                  bookApi.saveFirstCase(id, lines);
                  addAudit({ action: 'First-case notes edited', surgeonName: surgeon.name });
                }}
                onCaseView={openCase}
                onCopyToNotes={(id) => {
                  const result = bookApi.copyToNotes(id);
                  if (result.status === 'missing') return;
                  flashProcedure(result.procedureId);
                  setNotice(result.status === 'already'
                    ? 'This card is already in your notes. Your copy is highlighted.'
                    : 'Copied into your notes under the same surgeon. It is unconfirmed until you are in that case.');
                }}
                onCopySample={(id) => {
                  bookApi.copySample(id);
                  setNotice('Copied into your book. It is unconfirmed until you were in that case.');
                }}
              />
            ))}
          </div>
        )}

        {auditLog.length > 0 && (
          <div className="mt-8"><RecentActivity log={auditLog} /></div>
        )}
      </main>

      <footer className="border-t border-slate-200/60 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl mx-auto">
            Scrub Playbook is staff memory, not the medical record, not an order, and not an Instructions for Use.
            The surgeon and the hospital’s official preference card win when they disagree.
            Product names such as DePuy, Cardinal Health, Stryker, Ethicon, and Mölnlycke belong to their owners.
            This app is not those companies. Links open their pages. Their documents stay on their sites.
            Nothing in this book is uploaded.
          </p>
        </div>
      </footer>

      {addDraft && (
        <Suspense fallback={null}>
          <AddSurgeonModal
            initialName={addDraft.name || ''}
            onClose={() => setAddDraft(null)}
            onSave={(partial) => {
              saveSurgeon(partial, addDraft.procedureName || '');
              setAddDraft(null);
            }}
          />
        </Suspense>
      )}
      {editor && (
        <Suspense fallback={null}>
          <ProcedureEditor
            surgeon={editor.surgeon}
            procedure={editor.procedure}
            copyOf={editor.copyOf || ''}
            allowSpeech={!dictationOff(book, published)}
            allowOfficial
            onClose={() => setEditor(null)}
            onSave={saveProcedure}
          />
        </Suspense>
      )}
      {share && (
        <Suspense fallback={null}>
          <ShareCardModal surgeon={share.surgeon} procedure={share.procedure} onClose={() => setShare(null)} />
        </Suspense>
      )}
      {showPlaces && (
        <Suspense fallback={null}>
          <PlacesSheet
            book={book}
            published={published}
            onSettings={saveUnitSettings}
            onHandOverPublishing={handOverPlace}
            onClose={() => setShowPlaces(false)}
            onHandOff={handOffPlace}
            onArchive={(place, archived) => bookApi.setPlaceArchived(place, archived)}
            onDelete={(place, options) => {
              const removed = bookApi.removePlace(place, options);
              addAudit({ action: 'Place deleted', surgeonName: place, note: `${removed.surgeons.length} surgeons, ${removed.procedures.length} procedures` });
              offerUndo(`Deleted ${removed.surgeons.length} ${removed.surgeons.length === 1 ? 'surgeon' : 'surgeons'} at ${place}.`, removed);
            }}
            onPublish={publishPlace}
          />
        </Suspense>
      )}
      {backupKey && (
        <Suspense fallback={null}>
          <BackupKeyPrompt
            places={keyPlaces(published)}
            onClose={() => setBackupKey(false)}
            onWithout={() => {
              saveBackup(leaveKeysOut(published));
              setBackupKey(false);
              addAudit({ action: 'Backup saved without publishing key', surgeonName: keyPlaces(published).join(', ') });
            }}
            onLock={async (passphrase) => {
              const locked = await lockPublished(published, passphrase);
              saveBackup(locked);
              setBackupKey(false);
              addAudit({ action: 'Backup saved with locked publishing key', surgeonName: keyPlaces(published).join(', ') });
            }}
          />
        </Suspense>
      )}
      {showImport && (
        <Suspense fallback={null}>
          <ImportCardModal book={book} onClose={() => setShowImport(false)} onImport={onImport} />
        </Suspense>
      )}
      {confirmTarget && (
        <ConfirmNameModal
          title="I was in this case"
          subtitle="Your name and the time are the confirmation. It goes stale. It is not an order."
          onClose={() => setConfirmTarget(null)}
          onSubmit={(name) => confirmCard(confirmTarget, name, book.surgeons.find(s => s.id === confirmTarget.surgeonId)?.name || '')}
        />
      )}
      {caseView && (
        <Suspense fallback={null}>
          <CaseView
            key={caseProcedureId}
            surgeon={caseSurgeon}
            procedure={caseProcedure}
            staleDays={STALE_AFTER_DAYS}
            trust={caseProcedure ? trustFor(caseProcedure) : undefined}
            position={{ index: caseView.index, total: caseView.queue.length, onNext: () => stepCase(1), onPrev: () => stepCase(-1) }}
            onClose={closeCase}
            onConfirm={(name) => confirmCard(caseProcedure, name, caseSurgeon?.name || '')}
            onFlag={(reason) => {
              bookApi.disputeProcedure(caseProcedure.id, reason);
              addAudit({ action: 'Card flagged', surgeonName: caseSurgeon?.name || '', note: `${caseProcedure.name}: ${reason}` });
            }}
            onSuggested={(sent) => {
              updateSuggestions(prev => recordSuggestion(prev, caseProcedure, sent));
              addAudit({ action: 'Card change suggested', surgeonName: caseSurgeon?.name || '', note: caseProcedure?.name || '' });
            }}
          />
        </Suspense>
      )}
      {printCases && (
        <Suspense fallback={null}>
          <PrintDay
            cases={printCases
              .map(id => book.procedures.find(item => item.id === id))
              .filter(Boolean)
              .map(procedure => ({ procedure, surgeon: book.surgeons.find(item => item.id === procedure.surgeonId) }))
              .filter(entry => entry.surgeon)}
            staleDays={STALE_AFTER_DAYS}
            trustFor={trustFor}
            onDone={donePrinting}
          />
        </Suspense>
      )}
      {undo && (
        <div role="status" className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md w-full rounded-2xl bg-slate-900 text-white shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm">{undo.text}</p>
            <button type="button" onClick={undoDelete} className="shrink-0 min-h-11 px-4 rounded-xl bg-white text-slate-900 text-sm font-bold cursor-pointer">Undo</button>
          </div>
        </div>
      )}
      {showDisclaimer && (
        <Disclaimer onAccept={() => { safeSet('scrubplaybook_disclaimer_seen', 'true'); setShowDisclaimer(false); }} />
      )}
    </div>
  );
}

const offlineBadge = 'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50';
const headerButton = 'tap-icon rounded-xl text-slate-600 hover:text-medical-600 hover:bg-medical-50 cursor-pointer';

function Disclaimer({ onAccept }) {
  const dialogRef = useDialog();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="disclaimer-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto focus:outline-none">
        <h2 id="disclaimer-title" className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white font-extrabold">Before you write anything down</h2>
        <div className="p-6 space-y-3 text-sm text-slate-700">
          <p>These are staff notes about how a room runs. They are not the chart, not a medication order, and not the manufacturer’s instructions.</p>
          <p>Do not enter a patient name, medical record number, date of birth, implant lot, or serial number.</p>
          <p>Write what you observed. Do not copy or photograph the facility’s official card.</p>
          <p>When a note and the official preference card disagree, the official card and the surgeon win. These notes stay on this device unless you export or share them yourself.</p>
          <button type="button" onClick={onAccept} className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
