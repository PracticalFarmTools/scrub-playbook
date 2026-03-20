import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { SURGICAL_VENDORS } from './data/vendors';
import { DEMO_SURGEONS, migrateSurgeonData } from './data/defaults';
import { DEFAULT_HOSPITAL, HOSPITALS } from './data/hospitals';
import { makeStorageKey, makeAuditKey, makeOrderKey, makeLatexKey, makeTrayKey } from './data/constants';
import { useLocalStorage, useSearch } from './hooks/usePlaybook';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useAuditLog } from './hooks/useAuditLog';
import { useImagePreloader } from './hooks/useImagePreloader';
import { hapticLight, hapticSuccess } from './utils/haptics';
import SurgeonCard from './components/SurgeonCard';
import EmptyState from './components/EmptyState';
import RecentActivity from './components/RecentActivity';
import AppHeader from './components/AppHeader';
import { VendorResults, VendorLibrary, TrayResults } from './components/VendorPanels';

const AddSurgeonModal = lazy(() => import('./components/AddSurgeonModal'));
const HospitalSelector = lazy(() => import('./components/HospitalSelector'));
const TraySelector = lazy(() => import('./components/tray/TraySelector'));
const TrayCountSheet = lazy(() => import('./components/tray/TrayCountSheet'));

/** Pure helper — resolve vendor name strings to vendor objects. */
function resolveVendorLinks(vendorNames) {
  return vendorNames
    .map(name => SURGICAL_VENDORS.find(v => v.name.toLowerCase().includes(name.toLowerCase())))
    .filter(Boolean);
}

/** Pure helper — sort surgeons: on-call first, then custom order, then alphabetical by last name. */
function sortSurgeons(list, customOrder) {
  return [...list].sort((a, b) => {
    if (a.onCall && !b.onCall) return -1;
    if (!a.onCall && b.onCall) return 1;
    const idxA = customOrder.indexOf(a.id);
    const idxB = customOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    const lastA = a.name.split(' ').pop().toLowerCase();
    const lastB = b.name.split(' ').pop().toLowerCase();
    return lastA.localeCompare(lastB);
  });
}

export default function App() {
  // ── Hospital workspace ──
  const [hospital, setHospital] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('scrubplaybook_hospital'));
      return saved && HOSPITALS.find(h => h.id === saved.id) ? saved : DEFAULT_HOSPITAL;
    } catch { return DEFAULT_HOSPITAL; }
  });
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);

  useEffect(() => {
    localStorage.setItem('scrubplaybook_hospital', JSON.stringify(hospital));
  }, [hospital]);

  // ── Per-hospital storage keys ──
  const storageKey = useMemo(() => makeStorageKey(hospital.id), [hospital.id]);
  const auditKey = useMemo(() => makeAuditKey(hospital.id), [hospital.id]);
  const orderKey = useMemo(() => makeOrderKey(hospital.id), [hospital.id]);
  const latexKey = useMemo(() => makeLatexKey(hospital.id), [hospital.id]);
  const trayKey = useMemo(() => makeTrayKey(hospital.id), [hospital.id]);

  // ── Core state (isolated per hospital) ──
  const [surgeons, setSurgeons] = useLocalStorage(storageKey, DEMO_SURGEONS);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showVendors, setShowVendors] = useState(false);
  const [latexFree, setLatexFree] = useLocalStorage(latexKey, false);
  const [customOrder, setCustomOrder] = useLocalStorage(orderKey, []);
  const [hospitalTrays, setHospitalTrays] = useLocalStorage(trayKey, []);
  const [draggedId, setDraggedId] = useState(null);
  const [showTraySelector, setShowTraySelector] = useState(false);
  const [openTray, setOpenTray] = useState(null);
  const { isOnline } = useNetworkStatus();
  const { log: auditLog, addEntry: addAudit } = useAuditLog(auditKey);
  const searchDebounce = useRef(null);

  // Pre-fetch instrument photos for active hospital trays
  useImagePreloader(hospitalTrays);

  const specialties = useMemo(() => {
    const set = new Set(surgeons.map(s => s.specialty).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [surgeons]);

  const vendorLinkMap = useMemo(() => {
    const map = new Map();
    surgeons.forEach(s => map.set(s.id, resolveVendorLinks(s.vendorLinks || [])));
    return map;
  }, [surgeons]);

  useEffect(() => {
    const needsMigration = surgeons.some(s => !s.procedures);
    if (needsMigration) setSurgeons(migrateSurgeonData(surgeons));
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { q, filteredSurgeons: searchedSurgeons, filteredVendors, hasVendorResults, filteredTrays, hasTrayResults } = useSearch(surgeons, SURGICAL_VENDORS, search);

  const filteredSurgeons = useMemo(() => {
    const afterFilter = specialty === 'All' ? searchedSurgeons : searchedSurgeons.filter(s => s.specialty === specialty);
    return sortSurgeons(afterFilter, customOrder);
  }, [searchedSurgeons, specialty, customOrder]);

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

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      if (e.target.value.trim()) hapticLight();
    }, 300);
  }, []);

  const handleDragStart = useCallback((id) => { setDraggedId(id); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((targetId) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    const ids = filteredSurgeons.map(s => s.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); return; }
    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);
    setCustomOrder(newOrder);
    setDraggedId(null);
    hapticLight();
  }, [draggedId, filteredSurgeons]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100">
      <AppHeader
        search={search} onSearch={handleSearch} specialty={specialty} setSpecialty={setSpecialty} specialties={specialties}
        latexFree={latexFree} setLatexFree={setLatexFree} showVendors={showVendors} setShowVendors={setShowVendors}
        onAddSurgeon={openModal} isOnline={isOnline} hospital={hospital} onHospitalClick={() => setShowHospitalPicker(true)}
        onTraysClick={() => setShowTraySelector(true)}
      />

      {hasVendorResults && <VendorResults vendors={filteredVendors} />}
      {hasTrayResults && <TrayResults trays={filteredTrays} />}
      {showVendors && !q && <VendorLibrary onClose={() => setShowVendors(false)} />}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {filteredSurgeons.length === 0 ? (
          <EmptyState hasQuery={!!q} searchTerm={search} onAddSurgeon={openModal} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {filteredSurgeons.length} Surgeon{filteredSurgeons.length !== 1 ? 's' : ''}
                {specialty !== 'All' && ` — ${specialty}`}
                {q && ` matching "${search}"`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSurgeons.map((s, i) => (
                <SurgeonCard key={s.id} surgeon={s} vendorLinks={vendorLinkMap.get(s.id) || []} index={i}
                  onDelete={deleteSurgeon} onUpdate={updateSurgeon} onAudit={addAudit} auditLog={auditLog}
                  latexFree={latexFree} onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} isDragging={draggedId === s.id} />
              ))}
            </div>
          </>
        )}
        {auditLog.length > 0 && (
          <div className="mt-8"><RecentActivity log={auditLog} /></div>
        )}
      </main>

      <footer className="border-t border-slate-200/60 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center space-y-2">
          <p className="text-xs text-slate-400">ScrubPlaybook — Built by Scrub Techs, for Scrub Techs 🩺</p>
          <p className="text-[10px] text-slate-300 leading-relaxed max-w-lg mx-auto">
            This tool is a <strong>personal reference aid</strong> and is not a substitute for official manufacturer Instructions for Use (IFU), facility-specific policies, or surgeon-verified preference cards.
            Always confirm preferences directly with the surgical team before each procedure.
            No patient-identifiable information (PHI) should be entered.
            Aligned with{' '}
            <a href="https://www.ast.org" target="_blank" rel="noopener noreferrer" className="text-medical-500 hover:text-medical-600 underline">AST</a>{' '}
            standards of practice.
          </p>
        </div>
      </footer>

      {showModal && (
        <Suspense fallback={null}>
          <AddSurgeonModal onClose={() => setShowModal(false)} onSave={addSurgeon} />
        </Suspense>
      )}

      {showHospitalPicker && (
        <Suspense fallback={null}>
          <HospitalSelector current={hospital} onSelect={setHospital} onClose={() => setShowHospitalPicker(false)} />
        </Suspense>
      )}

      {showTraySelector && (
        <Suspense fallback={null}>
          <TraySelector
            hospitalTrays={hospitalTrays}
            hospitalName={hospital.name}
            onImport={(tray) => setHospitalTrays(prev => [...prev, tray])}
            onOpen={(tray) => setOpenTray(tray)}
            onClose={() => setShowTraySelector(false)}
          />
        </Suspense>
      )}

      {openTray && (
        <Suspense fallback={null}>
          <TrayCountSheet
            tray={openTray}
            onUpdate={(updated) => {
              setHospitalTrays(prev => prev.map(t => t.id === updated.id ? updated : t));
              setOpenTray(updated);
            }}
            onClose={() => setOpenTray(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
