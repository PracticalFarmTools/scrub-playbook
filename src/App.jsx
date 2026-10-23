import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, Menu, Plus, Search, Upload, Wifi, WifiOff, X } from 'lucide-react';
import { SURGICAL_VENDORS } from './data/vendors';
import { buildSampleBook } from './data/defaults';
import { STALE_AFTER_DAYS, emptyProcedure } from './data/schema';
import { facilityLabels, filterBook } from './data/searchBook';
import { parseImport, toBackup, toPlacePack } from './data/share';
import { readTechName, useBook } from './hooks/useBook';
import { publishUnitBook, savePublished, unitResultText } from './data/unitBook';
import { useAuditLog } from './hooks/useAuditLog';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import SurgeonCard from './components/SurgeonCard';
import TodayList from './components/TodayList';
import EmptyState from './components/EmptyState';
import RecentActivity from './components/RecentActivity';
import { VendorLibrary, VendorResults } from './components/VendorPanels';
import ConfirmNameModal from './components/ConfirmNameModal';
import { safeGet, safeSet } from './data/storage';
import { downloadText } from './utils/download';
import { UNREADABLE_KEY } from './hooks/useBook';

const AddSurgeonModal = lazy(() => import('./components/AddSurgeonModal'));
const CaseView = lazy(() => import('./components/CaseView'));
const PlacesSheet = lazy(() => import('./components/PlacesSheet'));
const ImportCardModal = lazy(() => import('./components/ImportCardModal'));
const ProcedureEditor = lazy(() => import('./components/ProcedureEditor'));
const ShareCardModal = lazy(() => import('./components/ShareCardModal'));

const LAST_EXPORT_KEY = 'scrubplaybook_last_export';

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export default function App() {
  const bookApi = useBook();
  const { book } = bookApi;
  const { log: auditLog, addEntry: addAudit } = useAuditLog();
  const { isOnline } = useNetworkStatus();

  const [search, setSearch] = useState('');
  const [activeFacility, setActiveFacility] = useState(null);
  const [addDraft, setAddDraft] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const flashProcedure = (id) => setHighlight({ id });
  const [showImport, setShowImport] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const [editor, setEditor] = useState(null);
  const [share, setShare] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(() => !safeGet('scrubplaybook_disclaimer_seen'));
  const [caseView, setCaseView] = useState(null);
  const [showPlaces, setShowPlaces] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastExportAt, setLastExportAt] = useState(() => safeGet(LAST_EXPORT_KEY));

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

  const showBackupReminder = book.surgeons.some(s => !s.demo)
    && (!lastExportAt || daysSince(lastExportAt) > 30);

  const handOffPlace = async (place, { archived = false } = {}) => {
    const pack = toPlacePack(book, place, readTechName() || 'A tech', new Date().toISOString(), { archived });
    const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';
    await shareFile(`scrubplaybook-${slug}-${new Date().toISOString().slice(0, 10)}.json`, pack);
  };

  const publishPlace = async (place) => {
    const { file, published } = publishUnitBook(book, place, readTechName() || 'A tech');
    const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';
    const outcome = await shareFile(`scrubplaybook-unit-${slug}-r${file.revision}.json`, file);
    if (outcome === 'cancelled') {
      setNotice(`${place} was not published. The next file is still revision ${file.revision}.`);
      return;
    }
    savePublished(published);
    setNotice(`Published ${place} as unit book revision ${file.revision}.`);
  };

  const exportPlaybook = () => {
    const data = toBackup(book);
    if (!data.book.surgeons.length) {
      setNotice('Samples stay on this device. Add your own surgeon before you export a backup.');
      return;
    }
    downloadText(`scrubplaybook-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    const now = new Date().toISOString();
    safeSet(LAST_EXPORT_KEY, now);
    setLastExportAt(now);
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
      if (options.unitFile) {
        const result = bookApi.importUnitBook(options.unitFile, { adopt: Boolean(options.adopt) });
        const text = unitResultText(options.unitFile.place, result);
        if (result.status !== 'updated') return { success: false, error: text };
        addAudit({ action: 'Unit book updated', surgeonName: options.unitFile.place, note: `Revision ${result.revision}` });
        setNotice(text);
        return { success: true, imported: result.counts.added, skipped: 0 };
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
    setCaseView({ surgeonId: surgeon.id, procedureId: procedure.id });
  };

  const openTodayCase = (procedure) => {
    setSearch('');
    setActiveFacility(null);
    setCaseView({ surgeonId: procedure.surgeonId, procedureId: procedure.id, returnTo: procedure.id });
  };

  const closeCase = () => {
    if (caseView?.returnTo) flashProcedure(caseView.returnTo);
    setCaseView(null);
  };

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
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-medical-600 to-medical-800 flex items-center justify-center shadow-lg shadow-medical-600/20">
                <BookOpen size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">ScrubPlaybook</h1>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                    {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {isOnline ? '' : 'Offline'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide truncate">Your notes. The official card still wins.</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={exportPlaybook} className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 cursor-pointer" title="Export backup">
                <Download size={20} />
              </button>
              <button onClick={() => setShowPlaces(true)} className="px-2.5 py-2 rounded-xl text-slate-500 hover:text-medical-600 hover:bg-medical-50 cursor-pointer text-xs font-bold" title="Places">Places</button>
              <button onClick={() => setShowImport(true)} className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 cursor-pointer" title="Import">
                <Upload size={20} />
              </button>
              <button onClick={() => setShowVendors(v => !v)} className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 cursor-pointer" title="Company pages">
                <Menu size={20} />
              </button>
              <button onClick={() => setAddDraft({})} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-medical-600 text-white font-semibold text-sm cursor-pointer">
                <Plus size={16} />
                <span className="hidden sm:inline">Add surgeon</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surgeons, sutures, trays, nicknames…" className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400/40 focus:bg-white" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"><X size={16} /></button>}
          </div>
          {labels.length > 1 && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
              <button onClick={() => setActiveFacility(null)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${!placeFilter ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-500'}`}>All places</button>
              {labels.map(label => (
                <button key={label} onClick={() => setActiveFacility(placeFilter === label ? null : label)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${placeFilter === label ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {showVendorHits && <VendorResults vendors={vendorHits} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      <main className="max-w-5xl mx-auto px-4 py-6">
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
            <p className="text-xs text-medical-900">{notice}</p>
            <button onClick={() => setNotice('')} className="text-[11px] font-bold text-medical-700 cursor-pointer">Dismiss</button>
          </div>
        )}
        {showBackupReminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-800">Your book lives on this device. Export a backup before you lose the phone.</p>
            <button onClick={exportPlaybook} className="text-[11px] font-bold text-white bg-amber-600 rounded-lg px-3 py-1.5 cursor-pointer">Back up</button>
          </div>
        )}

        <TodayList
          book={book}
          onOpen={openTodayCase}
          onStartProcedure={(surgeon, procedureName) => setEditor({
            surgeon,
            procedure: emptyProcedure(surgeon.id, { name: procedureName }),
          })}
          onStartSurgeon={(surgeonName, procedureName) => setAddDraft({ name: surgeonName, procedureName })}
        />

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
            {filtered.surgeons.map(surgeon => (
              <SurgeonCard
                key={surgeon.id}
                surgeon={surgeon}
                procedures={filtered.procedures.filter(p => p.surgeonId === surgeon.id)}
                trustProcedures={book.procedures.filter(p => p.surgeonId === surgeon.id)}
                staleDays={STALE_AFTER_DAYS}
                highlightId={highlight?.id}
                onDeleteSurgeon={(id) => {
                  bookApi.deleteSurgeon(id);
                  addAudit({ action: 'Surgeon deleted', surgeonName: surgeon.name });
                }}
                onDeleteProcedure={(id) => bookApi.deleteProcedure(id)}
                onEdit={(procedure) => setEditor({ surgeon, procedure })}
                onAddProcedure={() => setEditor({ surgeon, procedure: emptyProcedure(surgeon.id, { name: '' }) })}
                onConfirm={(procedure) => setConfirmTarget(procedure)}
                onDispute={(procedure) => bookApi.disputeProcedure(procedure.id)}
                onClearDispute={(id) => bookApi.clearDispute(id)}
                onShare={(s, procedure) => setShare({ surgeon: s, procedure })}
                onUpdateSurgeon={(id, details) => bookApi.updateSurgeon(id, details)}
                onSaveFirstCase={(id, lines) => bookApi.saveFirstCase(id, lines)}
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
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-xl mx-auto">
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
            allowSpeech
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
            onClose={() => setShowPlaces(false)}
            onHandOff={handOffPlace}
            onArchive={(place, archived) => bookApi.setPlaceArchived(place, archived)}
            onDelete={(place, options) => bookApi.removePlace(place, options)}
            onPublish={publishPlace}
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
          onSubmit={(name) => {
            bookApi.confirmProcedure(confirmTarget.id, name);
            addAudit({ action: 'Case confirmed', surgeonName: book.surgeons.find(s => s.id === confirmTarget.surgeonId)?.name || '', user: name });
            return {};
          }}
        />
      )}
      {caseView && (
        <Suspense fallback={null}>
          <CaseView
            surgeon={book.surgeons.find(item => item.id === caseView.surgeonId)}
            procedure={book.procedures.find(item => item.id === caseView.procedureId)}
            staleDays={STALE_AFTER_DAYS}
            onClose={closeCase}
            onSuggested={() => {
              const surgeon = book.surgeons.find(item => item.id === caseView.surgeonId);
              const procedure = book.procedures.find(item => item.id === caseView.procedureId);
              addAudit({ action: 'Card change suggested', surgeonName: surgeon?.name || '', note: procedure?.name || '' });
            }}
          />
        </Suspense>
      )}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white font-extrabold">Before you write anything down</div>
            <div className="p-6 space-y-3 text-sm text-slate-600">
              <p>These are staff notes about how a room runs. They are not the chart, not a medication order, and not the manufacturer’s instructions.</p>
              <p>Do not enter a patient name, medical record number, date of birth, implant lot, or serial number.</p>
              <p>Write what you observed. Do not copy or photograph the facility’s official card.</p>
              <p>When a note and the official preference card disagree, the official card and the surgeon win. These notes stay on this device unless you export or share them yourself.</p>
              <button
                onClick={() => { safeSet('scrubplaybook_disclaimer_seen', 'true'); setShowDisclaimer(false); }}
                className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer"
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
