import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Search, Plus, BookOpen, X, Menu, Wifi, WifiOff, Download, Upload, ShieldAlert } from 'lucide-react';
import { SURGICAL_VENDORS } from './data/vendors';
import { DEMO_SURGEONS } from './data/defaults';
import { STORAGE_KEY } from './data/constants';
import { useLocalStorage, useSearch } from './hooks/usePlaybook';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useAuditLog } from './hooks/useAuditLog';
import { hapticLight, hapticSuccess } from './utils/haptics';
import SurgeonCard from './components/SurgeonCard';
import EmptyState from './components/EmptyState';
import RecentActivity from './components/RecentActivity';
import { VendorResults, VendorLibrary } from './components/VendorPanels';

const AddSurgeonModal = lazy(() => import('./components/AddSurgeonModal'));
const ImportCardModal = lazy(() => import('./components/ImportCardModal'));

const LAST_EXPORT_KEY = 'scrubplaybook_last_export';
const BACKUP_SNOOZE_KEY = 'scrubplaybook_backup_snooze_until';
const BACKUP_REMINDER_DAYS = 30;
const BACKUP_SNOOZE_DAYS = 14;

function resolveVendorLinks(vendorNames) {
  return vendorNames
    .map(name => SURGICAL_VENDORS.find(v => v.name.toLowerCase().includes(name.toLowerCase())))
    .filter(Boolean);
}

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export default function App() {
  const [surgeons, setSurgeons] = useLocalStorage(STORAGE_KEY, DEMO_SURGEONS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const [activeFacility, setActiveFacility] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return !localStorage.getItem('scrubplaybook_disclaimer_seen');
  });
  const [lastExportAt, setLastExportAt] = useState(() => localStorage.getItem(LAST_EXPORT_KEY));
  const [backupSnoozeUntil, setBackupSnoozeUntil] = useState(() => localStorage.getItem(BACKUP_SNOOZE_KEY));
  const { isOnline } = useNetworkStatus();
  const { log: auditLog, addEntry: addAudit } = useAuditLog();
  const searchDebounce = useRef(null);

  const { q, filteredSurgeons, filteredVendors, hasVendorResults, facilities } = useSearch(surgeons, SURGICAL_VENDORS, search, activeFacility);

  // ── Haptic + Audit-enhanced callbacks ──
  const addSurgeon = useCallback((data) => {
    setSurgeons(prev => [data, ...prev]);
    addAudit({ action: 'Surgeon Created', surgeonName: data.name, user: data.addedBy || 'Kyle', note: data.changeNote || null });
    hapticSuccess();
  }, [setSurgeons, addAudit]);

  const deleteSurgeon = useCallback((id) => {
    setSurgeons(prev => {
      const target = prev.find(s => s.id === id);
      if (target) addAudit({ action: 'Surgeon Deleted', surgeonName: target.name, user: target.addedBy || 'Kyle' });
      return prev.filter(s => s.id !== id);
    });
    hapticLight();
  }, [setSurgeons, addAudit]);

  const updateSurgeon = useCallback((updated) => {
    setSurgeons(prev => prev.map(s => s.id === updated.id ? updated : s));
    hapticLight();
  }, [setSurgeons]);

  const importSurgeon = useCallback((data) => {
    const { kind: _kind, ...card } = data;
    const surgeon = {
      ...card,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      addedBy: card.addedBy || 'Imported',
      status: 'unconfirmed', // re-verify locally before trusting an imported card
      lastVerifiedBy: null,
      lastVerifiedAt: null,
    };
    setSurgeons(prev => [surgeon, ...prev]);
    addAudit({ action: 'Surgeon Imported', surgeonName: surgeon.name, user: 'Kyle' });
    hapticSuccess();
  }, [setSurgeons, addAudit]);

  const exportPlaybook = useCallback(() => {
    const data = {
      kind: 'scrubplaybook-backup',
      v: 1,
      exportedAt: new Date().toISOString(),
      surgeons: surgeons,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrubplaybook-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_EXPORT_KEY, now);
    setLastExportAt(now);
    localStorage.removeItem(BACKUP_SNOOZE_KEY);
    setBackupSnoozeUntil(null);
    hapticLight();
  }, [surgeons]);

  const snoozeBackupReminder = useCallback(() => {
    const until = new Date(Date.now() + BACKUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(BACKUP_SNOOZE_KEY, until);
    setBackupSnoozeUntil(until);
  }, []);

  // Nudge, don't nag: only for real playbooks that have never been backed up
  // or haven't been in 30+ days, and never more than once per snooze window.
  const showBackupReminder = surgeons.length > 0
    && (!lastExportAt || daysSince(lastExportAt) > BACKUP_REMINDER_DAYS)
    && (!backupSnoozeUntil || Date.now() > new Date(backupSnoozeUntil).getTime());

  const importBackup = useCallback((backupData) => {
    if (!backupData || backupData.kind !== 'scrubplaybook-backup' || !Array.isArray(backupData.surgeons)) {
      return { success: false, error: 'Invalid backup format' };
    }

    let importedCount = 0;
    let skippedCount = 0;

    setSurgeons(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const newSurgeons = [];

      backupData.surgeons.forEach(card => {
        if (existingIds.has(card.id)) {
          skippedCount++;
        } else {
          newSurgeons.push(card);
          importedCount++;
        }
      });

      if (newSurgeons.length > 0) {
        return [...prev, ...newSurgeons];
      }
      return prev;
    });

    addAudit({
      action: 'Backup Imported',
      surgeonName: `${importedCount} card(s)`,
      user: 'Kyle',
      note: `${importedCount} imported, ${skippedCount} skipped as duplicates`
    });
    hapticSuccess();

    return { success: true, imported: importedCount, skipped: skippedCount };
  }, [setSurgeons, addAudit]);

  const openModal = useCallback(() => setShowModal(true), []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      if (e.target.value.trim()) hapticLight();
    }, 300);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-medical-600 to-medical-800 flex items-center justify-center shadow-lg shadow-medical-600/20">
                <BookOpen size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">ScrubPlaybook</h1>
                  <div className="relative group">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                      isOnline ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                    }`}>
                      {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {isOnline ? '' : 'Offline'}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {isOnline ? 'Online — app shell cached for offline use' : 'Offline — running from cache, data saved locally'}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide">YOUR SURGEONS. YOUR RULES.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportPlaybook}
                className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all cursor-pointer" title="Export All Cards (Backup)">
                <Download size={20} />
              </button>
              <button onClick={() => setShowImport(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all cursor-pointer" title="Import Card / Backup">
                <Upload size={20} />
              </button>
              <button onClick={() => setShowVendors(v => !v)}
                className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all cursor-pointer" title="Vendor Library">
                <Menu size={20} />
              </button>
              <button onClick={openModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-medical-600 to-medical-700 text-white font-semibold text-sm shadow-lg shadow-medical-600/25 hover:from-medical-700 hover:to-medical-800 active:scale-[0.97] transition-all cursor-pointer">
                <Plus size={16} />
                <span className="hidden sm:inline">Add Surgeon</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={handleSearch}
              placeholder="Search surgeons, instruments, vendors…"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-400/40 focus:bg-white transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>
          {/* ═══ FACILITY FILTER CHIPS (traveler tech: same surgeon, different site) ═══ */}
          {facilities.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setActiveFacility(null)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  !activeFacility ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                All Facilities
              </button>
              {facilities.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFacility(cur => cur === f ? null : f)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeFacility === f ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ═══ VENDOR PANELS ═══ */}
      {hasVendorResults && <VendorResults vendors={filteredVendors} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      {/* ═══ BENTO GRID ═══ */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* ═══ BACKUP REMINDER (data lives only on this device) ═══ */}
        {showBackupReminder && (
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                {lastExportAt
                  ? `It's been over ${BACKUP_REMINDER_DAYS} days since your last backup.`
                  : "Your cards only live on this device — back them up in case you lose your phone."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button onClick={snoozeBackupReminder}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 px-2 py-1 transition-colors cursor-pointer">
                Remind me later
              </button>
              <button onClick={exportPlaybook}
                className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3 py-1.5 transition-all cursor-pointer">
                Back Up Now
              </button>
            </div>
          </div>
        )}

        {filteredSurgeons.length === 0 ? (
          <EmptyState hasQuery={!!q} searchTerm={search} onAddSurgeon={openModal} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {filteredSurgeons.length} Surgeon{filteredSurgeons.length !== 1 ? 's' : ''}
                {q && ` matching "${search}"`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSurgeons.map((s, i) => (
                <SurgeonCard
                  key={s.id}
                  surgeon={s}
                  vendorLinks={resolveVendorLinks(s.vendorLinks || [])}
                  index={i}
                  onDelete={deleteSurgeon}
                  onUpdate={updateSurgeon}
                  onAudit={addAudit}
                  auditLog={auditLog}
                />
              ))}
            </div>
          </>
        )}

        {/* ═══ RECENT ACTIVITY FEED ═══ */}
        {auditLog.length > 0 && (
          <div className="mt-8">
            <RecentActivity log={auditLog} maxItems={10} />
          </div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200/60 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-2">
          <p className="text-xs text-slate-400">ScrubPlaybook — Built by Scrub Techs, for Scrub Techs 🩺</p>
          <p className="text-[10px] text-slate-300 leading-relaxed max-w-lg mx-auto">
            This tool is a <strong>personal reference aid</strong> and is not a substitute for official manufacturer Instructions for Use (IFU), facility-specific policies, or surgeon-verified preference cards.
            Always confirm preferences directly with the surgical team before each procedure.
            No patient-identifiable information (PHI) should be entered.
            Aligned with{' '}
            <a href="https://www.ast.org" target="_blank" rel="noopener noreferrer" className="text-medical-500 hover:text-medical-600 underline">
              AST
            </a>{' '}
            standards of practice.
          </p>
        </div>
      </footer>

      {/* ═══ MODALS ═══ */}
      {showModal && (
        <Suspense fallback={null}>
          <AddSurgeonModal onClose={() => setShowModal(false)} onSave={addSurgeon} />
        </Suspense>
      )}
      {showImport && (
        <Suspense fallback={null}>
          <ImportCardModal onClose={() => setShowImport(false)} onImport={importSurgeon} onImportBackup={importBackup} />
        </Suspense>
      )}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white">
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                🩺 ScrubPlaybook Disclaimer
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-slate-800">
                Please read and accept the following guidelines before using ScrubPlaybook:
              </p>
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-3 max-h-60 overflow-y-auto">
                <p>
                  This tool is a <strong>personal reference aid</strong> and is not a substitute for official manufacturer Instructions for Use (IFU), facility-specific policies, or surgeon-verified preference cards.
                </p>
                <p>
                  Always confirm preferences directly with the surgical team before each procedure.
                </p>
                <p className="font-semibold text-rose-600">
                  Strictly NO patient-identifiable information (PHI) should be entered into this application under any circumstances.
                </p>
                <p>
                  This application is aligned with AST standards of practice.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('scrubplaybook_disclaimer_seen', 'true');
                  setShowDisclaimer(false);
                  hapticSuccess();
                }}
                className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 active:scale-[0.98] transition-all shadow-lg shadow-medical-600/20 cursor-pointer"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
