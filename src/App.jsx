import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { SURGICAL_VENDORS } from './data/vendors';
import { buildSampleBook } from './data/defaults';
import {
  CARD_STATUS, DISCLAIMER_KEY, HOME_SCREEN_KEY, SORT_KEY, STALE_AFTER_DAYS, SUGGESTIONS_KEY, duplicateProcedure, emptyProcedure,
} from './data/schema';
import { personId, rowTrust, trustState, withConfirmation } from './data/trust';
import { SORT_CHOICES, facilityLabels, filterBook, sortSurgeons } from './data/searchBook';
import { parseImport } from './data/incoming';
import { dictationOff, takeOverPublishing, trustOptionsFor, unitResultText } from './data/unitBook';
import { closeSuggestion, loadSuggestions, openSuggestion, recordSuggestion, saveSuggestions } from './data/suggestions';
import { needsHomeScreen, safeGet, safeSet } from './data/storage';
import { UNREADABLE_KEY, useBook } from './hooks/useBook';
import { useAuditLog } from './hooks/useAuditLog';
import { daysSince, useBackup } from './hooks/useBackup';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { CANNOT_SAVE, usePublishing } from './hooks/usePublishing';
import { useStoredState } from './hooks/useStoredState';
import { useCardHistory } from './hooks/useCardHistory';
import { deletedToRestore, forgetCard, updateHistory } from './data/history';
import AppHeader from './components/AppHeader';
import ConfirmNameModal from './components/ConfirmNameModal';
import Disclaimer from './components/Disclaimer';
import EmptyState from './components/EmptyState';
import HomeBanners from './components/HomeBanners';
import RecentActivity from './components/RecentActivity';
import SurgeonCard from './components/SurgeonCard';
import TodayList from './components/TodayList';
import { VendorLibrary, VendorResults } from './components/VendorPanels';
import { dayStamp, downloadText } from './utils/download';
import { applyUpdate, onUpdateReady } from './pwa';

const AddSurgeonModal = lazy(() => import('./components/AddSurgeonModal'));
const CaseView = lazy(() => import('./components/CaseView'));
const PlacesSheet = lazy(() => import('./components/PlacesSheet'));
const ImportCardModal = lazy(() => import('./components/ImportCardModal'));
const ProcedureEditor = lazy(() => import('./components/ProcedureEditor'));
const ShareCardModal = lazy(() => import('./components/ShareCardModal'));
const PrintDay = lazy(() => import('./components/PrintDay'));
const BackupKeyPrompt = lazy(() => import('./components/BackupKeyPrompt'));
const CardHistorySheet = lazy(() => import('./components/CardHistorySheet'));
const DeletedCardsSheet = lazy(() => import('./components/DeletedCardsSheet'));

const WEEK_DAYS = 7;
const UNDO_MS = 20000;
const HIGHLIGHT_MS = 2500;

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * One overlay at a time.
 * @typedef {import('./data/types').Surgeon} Surgeon
 * @typedef {import('./data/types').Procedure} Procedure
 * @typedef {{ kind: 'add', name?: string, procedureName?: string }
 *   | { kind: 'editor', surgeon: Surgeon, procedure: Procedure, copyOf?: string }
 *   | { kind: 'share', surgeon: Surgeon, procedure: Procedure }
 *   | { kind: 'confirm', procedure: Procedure }
 *   | { kind: 'case', queue: string[], index: number, returnTo?: boolean }
 *   | { kind: 'print', ids: string[] }
 *   | { kind: 'import' }
 *   | { kind: 'places' }
 *   | { kind: 'history', procedureId: string }
 *   | { kind: 'deleted' }} Overlay
 */
export default function App() {
  const bookApi = useBook();
  const { book } = bookApi;
  const { log: auditLog, addEntry: addAudit, mergeLog } = useAuditLog();
  const { isOnline } = useNetworkStatus();
  const [suggestions, updateSuggestions] = useStoredState(SUGGESTIONS_KEY, loadSuggestions, saveSuggestions);
  const { history: cardHistory } = useCardHistory();

  const [overlay, setOverlay] = useState(/** @type {Overlay | null} */ (null));
  const closeOverlay = () => setOverlay(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0);
  const [sortMode, setSortMode] = useState(() => {
    const saved = safeGet(SORT_KEY) || 'attention';
    return SORT_CHOICES.some(([value]) => value === saved) ? saved : 'attention';
  });
  const [activeFacility, setActiveFacility] = useState(/** @type {string | null} */ (null));
  const [showVendors, setShowVendors] = useState(false);
  const [undo, setUndo] = useState(/** @type {{ text: string, removed: { surgeons: Surgeon[], procedures: Procedure[] } } | null} */ (null));
  const [highlight, setHighlight] = useState(/** @type {{ id: string } | null} */ (null));
  const [showDisclaimer, setShowDisclaimer] = useState(() => !safeGet(DISCLAIMER_KEY));
  const [todayVersion, setTodayVersion] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [homeScreenHidden, setHomeScreenHidden] = useState(() => {
    const at = safeGet(HOME_SCREEN_KEY);
    return Boolean(at) && daysSince(at) < WEEK_DAYS;
  });

  const publishing = usePublishing({ book, addAudit, setNotice });
  const { published } = publishing;
  const backup = useBackup({
    book, bookApi, auditLog, addAudit, mergeLog, suggestions, updateSuggestions,
    updatePublished: publishing.update, setNotice, onBoardRestored: () => setTodayVersion(v => v + 1),
  });

  const clearSearch = () => {
    setSearch('');
    setSearchKey(key => key + 1);
  };
  const flashProcedure = (id) => setHighlight({ id });

  const labels = facilityLabels(book);
  const placeFilter = activeFacility && labels.includes(activeFacility) ? activeFacility : null;
  const filtered = useMemo(() => filterBook(book, search, placeFilter), [book, search, placeFilter]);
  const archivedCount = book.surgeons.filter(s => !s.demo && s.archived).length;
  const q = search.trim().toLowerCase();
  const vendorHits = q
    ? SURGICAL_VENDORS.filter(v => v.name.toLowerCase().includes(q) || v.blurb.toLowerCase().includes(q))
    : [];
  const showVendorHits = q && vendorHits.length > 0 && vendorHits.length < SURGICAL_VENDORS.length;

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

  const busy = Boolean(overlay || backup.keyPrompt || showDisclaimer);

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
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    if (!highlight) return undefined;
    const el = document.getElementById(`procedure-${highlight.id}`);
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

  const offerUndo = (text, removed) => {
    if (removed?.surgeons?.length || removed?.procedures?.length) setUndo({ text, removed });
  };

  const undoDelete = () => {
    if (!undo) return;
    const result = bookApi.restoreRemoved(undo.removed);
    addAudit({ action: 'Delete undone', surgeonName: undo.removed.surgeons[0]?.name || '', note: `${result.surgeons} surgeons, ${result.procedures} procedures back` });
    setUndo(null);
  };

  const surgeonOf = (procedure) => book.surgeons.find(surgeon => surgeon.id === procedure?.surgeonId) || null;

  const restoreVersion = (procedure, version) => {
    if (!bookApi.restoreVersion(procedure.id, version)) return;
    addAudit({ action: 'Earlier version brought back', surgeonName: surgeonOf(procedure)?.name || '', note: procedure.name });
    setNotice(`The earlier version of ${procedure.name} is back. It is unconfirmed until someone is in that case.`);
    closeOverlay();
    flashProcedure(procedure.id);
  };

  const forgetHistory = (procedure) => {
    updateHistory(current => forgetCard(current, procedure.id));
    addAudit({ action: 'Card history cleared', surgeonName: surgeonOf(procedure)?.name || '', note: procedure.name });
    closeOverlay();
  };

  const bringBackDeleted = (entry) => {
    const result = bookApi.restoreRemoved(deletedToRestore(book, entry));
    if (!result.procedures) {
      setNotice(`${entry.procedure.name} could not come back. Its surgeon is no longer on this phone.`);
      return;
    }
    addAudit({ action: 'Deleted card brought back', surgeonName: entry.surgeonName, note: entry.procedure.name });
    setNotice(`${entry.procedure.name} is back in your book, unconfirmed.`);
    closeOverlay();
    setActiveFacility(null);
    clearSearch();
    flashProcedure(entry.procedure.id);
  };

  const confirmCard = (procedure, name) => {
    const options = trustFor(procedure);
    const tech = bookApi.confirmProcedure(procedure.id, name, { mode: options.mode });
    addAudit({ action: 'Case confirmed', surgeonName: surgeonOf(procedure)?.name || '', user: name, note: procedure.name });
    if (options.mode !== 'facility') return {};
    const after = trustState(withConfirmation(procedure, { name: tech, userId: personId(tech), mode: 'facility' }), options);
    const message = after.status === CARD_STATUS.CONFIRMED
      ? `Confirmed by ${tech}. Two people have now matched this card.`
      : `Confirmed by ${tech}. This unit asks a second person to confirm before it shows as matched.`;
    setNotice(message);
    return { message };
  };

  const flagCard = (procedure, reason) => {
    bookApi.disputeProcedure(procedure.id, reason);
    addAudit({ action: 'Card flagged', surgeonName: surgeonOf(procedure)?.name || '', note: [procedure.name, reason].filter(Boolean).join(': ') });
  };

  const onImport = (incoming, options = {}) => {
    try {
      if (options.handover) {
        const result = takeOverPublishing(book, options.handover, { fingerprint: options.fingerprint });
        if (!result.entry) return { success: false, error: unitResultText(result.place, result) };
        if (!publishing.update(current => ({ ...current, [result.place]: result.entry }))) {
          publishing.update(current => current);
          return { success: false, error: `Publishing for ${result.place} was not taken over. ${CANNOT_SAVE}` };
        }
        bookApi.replaceBook(result.book);
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
      if (options.restore) return backup.restore(options.restore);
      const parsed = incoming?.surgeons ? { book: incoming } : parseImport(incoming);
      const result = bookApi.importIncoming(parsed.book, options);
      addAudit({ action: 'Backup imported', surgeonName: `${result.imported} added`, note: `${result.skipped} skipped` });
      setNotice(`${result.imported} added, ${result.skipped} skipped. Imported cards are unconfirmed.`);
      return { success: true, imported: result.imported, skipped: result.skipped };
    } catch {
      return { success: false, error: 'That is not a Scrub Playbook card or backup.' };
    }
  };

  const addSurgeon = (partial, procedureName = '') => {
    const surgeon = bookApi.addSurgeon(partial);
    if (!surgeon) {
      closeOverlay();
      return;
    }
    addAudit({ action: 'Surgeon created', surgeonName: surgeon.name, user: partial.addedBy });
    setOverlay({ kind: 'editor', surgeon, procedure: emptyProcedure(surgeon.id, { name: procedureName || '' }) });
  };

  const saveProcedure = (procedure) => {
    bookApi.saveProcedure(procedure);
    addAudit({ action: 'Procedure saved', surgeonName: surgeonOf(procedure)?.name || '', note: procedure.name });
  };

  const openCases = (ids, returnTo) => {
    if (returnTo) {
      clearSearch();
      setActiveFacility(null);
    }
    setOverlay({ kind: 'case', queue: ids, index: 0, returnTo });
  };

  const caseProcedureId = overlay?.kind === 'case' ? overlay.queue[overlay.index] : null;
  const caseProcedure = caseProcedureId ? book.procedures.find(item => item.id === caseProcedureId) : null;
  const caseSurgeon = caseProcedure ? surgeonOf(caseProcedure) : null;
  const historyProcedure = overlay?.kind === 'history' ? book.procedures.find(item => item.id === overlay.procedureId) || null : null;

  const closeCase = () => {
    if (overlay?.kind === 'case' && overlay.returnTo && caseProcedureId) flashProcedure(caseProcedureId);
    closeOverlay();
  };

  const stepCase = (delta) => setOverlay(current => (current?.kind === 'case'
    ? { ...current, index: Math.min(current.queue.length - 1, Math.max(0, current.index + delta)) }
    : current));

  const donePrinting = useCallback(() => setOverlay(current => (current?.kind === 'print' ? null : current)), []);

  const cardActions = (surgeon) => ({
    onDeleteSurgeon: (id) => {
      const removed = bookApi.deleteSurgeon(id);
      addAudit({ action: 'Surgeon deleted', surgeonName: surgeon.name, note: `${removed.procedures.length} procedures` });
      if (!surgeon.demo) offerUndo(`Deleted ${surgeon.name} and ${plural(removed.procedures.length, 'procedure', 'procedures')}.`, removed);
    },
    onDeleteProcedure: (id) => {
      const removed = bookApi.deleteProcedure(id);
      const name = removed.procedures[0]?.name || '';
      addAudit({ action: 'Procedure deleted', surgeonName: surgeon.name, note: name });
      if (!surgeon.demo) offerUndo(`Deleted ${name || 'the procedure'} for ${surgeon.name}.`, removed);
    },
    onEdit: (procedure) => setOverlay({ kind: 'editor', surgeon, procedure }),
    onDuplicate: (procedure) => setOverlay({ kind: 'editor', surgeon, procedure: duplicateProcedure(procedure), copyOf: procedure.name }),
    onAddProcedure: () => setOverlay({ kind: 'editor', surgeon, procedure: emptyProcedure(surgeon.id, { name: '' }) }),
    onConfirm: (procedure) => setOverlay({ kind: 'confirm', procedure }),
    onDispute: flagCard,
    onClearDispute: (id) => {
      const procedure = book.procedures.find(item => item.id === id);
      bookApi.clearDispute(id);
      addAudit({ action: 'Flag cleared', surgeonName: surgeon.name, note: [procedure?.name, procedure?.reportNote].filter(Boolean).join(': ') });
    },
    suggestionFor: (id) => openSuggestion(suggestions, id),
    onCloseSuggestion: (suggestion, status) => {
      updateSuggestions(list => closeSuggestion(list, suggestion.id, status));
      const procedure = book.procedures.find(item => item.id === suggestion.procedureId);
      addAudit({ action: status === 'made' ? 'Suggestion made on the card' : 'Suggestion closed', surgeonName: surgeon.name, note: procedure?.name || '' });
    },
    onShare: (s, procedure) => setOverlay({ kind: 'share', surgeon: s, procedure }),
    onUpdateSurgeon: (id, details) => {
      bookApi.updateSurgeon(id, details);
      addAudit({ action: 'Surgeon details edited', surgeonName: details.name || surgeon.name, note: details.facility || '' });
    },
    onSaveFirstCase: (id, lines) => {
      bookApi.saveFirstCase(id, lines);
      addAudit({ action: 'First-case notes edited', surgeonName: surgeon.name });
    },
    onCaseView: (s, procedure) => openCases([procedure.id], false),
    onHistory: surgeon.demo ? undefined : (procedure) => setOverlay({ kind: 'history', procedureId: procedure.id }),
    onCopyToNotes: (id) => {
      const result = bookApi.copyToNotes(id);
      if (result.status === 'missing') return;
      flashProcedure(result.procedureId);
      setNotice(result.status === 'already'
        ? 'This card is already in your notes. Your copy is highlighted.'
        : 'Copied into your notes under the same surgeon. It is unconfirmed until you are in that case.');
    },
    onCopySample: (id) => {
      bookApi.copySample(id);
      setNotice('Copied into your book. It is unconfirmed until you were in that case.');
    },
  });

  if (!bookApi.loaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50" role="status">
        <p className="text-sm font-semibold text-slate-600">Opening your book…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
      <AppHeader
        isOnline={isOnline}
        search={search}
        searchKey={searchKey}
        onSearch={setSearch}
        labels={labels}
        placeFilter={placeFilter}
        onPlaceFilter={setActiveFacility}
        showVendors={showVendors}
        onExport={backup.exportBackup}
        onPlaces={() => setOverlay({ kind: 'places' })}
        onImport={() => setOverlay({ kind: 'import' })}
        onToggleVendors={() => setShowVendors(v => !v)}
        onAddSurgeon={() => setOverlay({ kind: 'add' })}
      />

      {showVendorHits && <VendorResults vendors={vendorHits} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      <main className="max-w-5xl mx-auto px-4 py-6">
        <HomeBanners
          updateReady={updateReady && !busy}
          onUpdate={applyUpdate}
          saveState={bookApi.saveState}
          onExport={backup.exportBackup}
          onRetrySave={bookApi.retrySave}
          unreadable={bookApi.unreadable}
          onDownloadUnreadable={() => downloadText(`scrubplaybook-unreadable-${dayStamp()}.json`, safeGet(UNREADABLE_KEY, ''))}
          notice={notice}
          onDismissNotice={() => setNotice('')}
          reminder={backup.reminder}
          showHomeScreen={!homeScreenHidden && needsHomeScreen()}
          onHideHomeScreen={() => { safeSet(HOME_SCREEN_KEY, new Date().toISOString()); setHomeScreenHidden(true); }}
        />

        <TodayList
          key={todayVersion}
          book={book}
          onOpen={(procedure) => openCases([procedure.id], true)}
          onOpenAll={(ready) => openCases(ready.map(entry => entry.procedure.id), true)}
          onPrintAll={(ready) => setOverlay({ kind: 'print', ids: ready.map(entry => entry.procedure.id) })}
          onStartProcedure={(surgeon, procedureName) => setOverlay({ kind: 'editor', surgeon, procedure: emptyProcedure(surgeon.id, { name: procedureName }) })}
          onStartSurgeon={(surgeonName, procedureName) => setOverlay({ kind: 'add', name: surgeonName, procedureName })}
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
            onAddSurgeon={() => setOverlay({ kind: 'add' })}
            onPreview={!q ? () => bookApi.loadSamples(buildSampleBook()) : null}
            onOpenPlaces={() => setOverlay({ kind: 'places' })}
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
                {...cardActions(surgeon)}
              />
            ))}
          </div>
        )}

        {cardHistory && cardHistory.deleted.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={() => setOverlay({ kind: 'deleted' })} className="min-h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 cursor-pointer">
              Recently deleted cards ({cardHistory.deleted.length})
            </button>
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
          <p className="mt-2 text-xs text-slate-500">Version {__APP_VERSION__} · built {__BUILD_DATE__}</p>
        </div>
      </footer>

      <Suspense fallback={null}>
        {overlay?.kind === 'add' && (
          <AddSurgeonModal
            initialName={overlay.name || ''}
            onClose={closeOverlay}
            onSave={(partial) => addSurgeon(partial, overlay.procedureName || '')}
          />
        )}
        {overlay?.kind === 'editor' && (
          <ProcedureEditor
            surgeon={overlay.surgeon}
            procedure={overlay.procedure}
            copyOf={overlay.copyOf || ''}
            allowSpeech={!dictationOff(book, published)}
            allowOfficial
            onClose={closeOverlay}
            onSave={saveProcedure}
          />
        )}
        {overlay?.kind === 'share' && (
          <ShareCardModal surgeon={overlay.surgeon} procedure={overlay.procedure} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'places' && (
          <PlacesSheet
            book={book}
            published={published}
            onSettings={publishing.saveUnitSettings}
            onHandOverPublishing={publishing.handOverPlace}
            onReplaceKey={publishing.replaceKey}
            onClose={closeOverlay}
            onHandOff={publishing.handOffPlace}
            onArchive={(place, archived) => bookApi.setPlaceArchived(place, archived)}
            onDelete={(place, options) => {
              const removed = bookApi.removePlace(place, options);
              addAudit({ action: 'Place deleted', surgeonName: place, note: `${removed.surgeons.length} surgeons, ${removed.procedures.length} procedures` });
              offerUndo(`Deleted ${plural(removed.surgeons.length, 'surgeon', 'surgeons')} at ${place}.`, removed);
            }}
            onPublish={publishing.publishPlace}
          />
        )}
        {overlay?.kind === 'import' && (
          <ImportCardModal book={book} onClose={closeOverlay} onImport={onImport} />
        )}
        {overlay?.kind === 'case' && (
          <CaseView
            key={caseProcedureId}
            surgeon={caseSurgeon}
            procedure={caseProcedure}
            staleDays={STALE_AFTER_DAYS}
            trust={caseProcedure ? trustFor(caseProcedure) : undefined}
            position={{ index: overlay.index, total: overlay.queue.length, onNext: () => stepCase(1), onPrev: () => stepCase(-1) }}
            onClose={closeCase}
            onConfirm={(name) => confirmCard(caseProcedure, name)}
            onFlag={(reason) => flagCard(caseProcedure, reason)}
            onSuggested={(sent) => {
              updateSuggestions(list => recordSuggestion(list, caseProcedure, sent));
              addAudit({ action: 'Card change suggested', surgeonName: caseSurgeon?.name || '', note: caseProcedure?.name || '' });
            }}
          />
        )}
        {overlay?.kind === 'print' && (
          <PrintDay
            cases={overlay.ids
              .map(id => book.procedures.find(item => item.id === id))
              .filter(Boolean)
              .map(procedure => ({ procedure, surgeon: surgeonOf(procedure) }))
              .filter(entry => entry.surgeon)}
            staleDays={STALE_AFTER_DAYS}
            trustFor={trustFor}
            onDone={donePrinting}
          />
        )}
        {overlay?.kind === 'history' && historyProcedure && surgeonOf(historyProcedure) && (
          <CardHistorySheet
            surgeon={/** @type {Surgeon} */ (surgeonOf(historyProcedure))}
            procedure={historyProcedure}
            history={cardHistory}
            onRestore={(version) => restoreVersion(historyProcedure, version)}
            onForget={() => forgetHistory(historyProcedure)}
            onClose={closeOverlay}
          />
        )}
        {overlay?.kind === 'deleted' && (
          <DeletedCardsSheet
            history={cardHistory}
            onBringBack={bringBackDeleted}
            onRemove={(entry) => {
              updateHistory(current => forgetCard(current, entry.procedure.id));
              addAudit({ action: 'Deleted card removed for good', surgeonName: entry.surgeonName, note: entry.procedure.name });
            }}
            onClose={closeOverlay}
          />
        )}
        {backup.keyPrompt && <BackupKeyPrompt {...backup.keyPrompt} />}
      </Suspense>
      {overlay?.kind === 'confirm' && (
        <ConfirmNameModal
          title="I was in this case"
          subtitle="Your name and the time are the confirmation. It goes stale. It is not an order."
          onClose={closeOverlay}
          onSubmit={(name) => confirmCard(overlay.procedure, name)}
        />
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
        <Disclaimer onAccept={() => { safeSet(DISCLAIMER_KEY, 'true'); setShowDisclaimer(false); }} />
      )}
    </div>
  );
}
