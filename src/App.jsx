import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Search, Plus, BookOpen, X, Menu, Wifi, WifiOff } from 'lucide-react';
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

function resolveVendorLinks(vendorNames) {
  return vendorNames
    .map(name => SURGICAL_VENDORS.find(v => v.name.toLowerCase().includes(name.toLowerCase())))
    .filter(Boolean);
}

export default function App() {
  const [surgeons, setSurgeons] = useLocalStorage(STORAGE_KEY, DEMO_SURGEONS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const { isOnline } = useNetworkStatus();
  const { log: auditLog, addEntry: addAudit } = useAuditLog();
  const searchDebounce = useRef(null);

  const { q, filteredSurgeons, filteredVendors, hasVendorResults } = useSearch(surgeons, SURGICAL_VENDORS, search);

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
                      {isOnline ? 'Synced — data saved locally' : 'Offline — using cached data'}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide">YOUR SURGEONS. YOUR RULES.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* ═══ VENDOR PANELS ═══ */}
      {hasVendorResults && <VendorResults vendors={filteredVendors} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      {/* ═══ BENTO GRID ═══ */}
      <main className="max-w-5xl mx-auto px-4 py-6">
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

      {/* ═══ MODAL ═══ */}
      {showModal && (
        <Suspense fallback={null}>
          <AddSurgeonModal onClose={() => setShowModal(false)} onSave={addSurgeon} />
        </Suspense>
      )}
    </div>
  );
}
