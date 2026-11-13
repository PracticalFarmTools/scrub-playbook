import { BookOpen, Plus, WifiOff } from 'lucide-react';
import SearchBox from './SearchBox';

const offlineBadge = 'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50';
const action = 'shrink-0 min-h-11 px-3 rounded-full text-xs font-bold cursor-pointer bg-slate-100 text-slate-800';
const chip = (on) => `shrink-0 min-h-11 px-3 rounded-full text-xs font-bold cursor-pointer ${on ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-700'}`;

export default function AppHeader({
  isOnline, search, searchKey, onSearch, labels, placeFilter, onPlaceFilter,
  showVendors, onExport, onPlaces, onImport, onToggleVendors, onAddSurgeon,
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/60">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-medical-600 to-medical-800 items-center justify-center shadow-lg shadow-medical-600/20">
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-none truncate">ScrubPlaybook</h1>
                {!isOnline && <span className={`hidden sm:inline-flex ${offlineBadge}`}><WifiOff size={12} aria-hidden="true" /> Offline</span>}
              </div>
              <p className="hidden sm:block text-xs text-slate-600 tracking-wide truncate">Your notes. The official card still wins.</p>
            </div>
          </div>
          <button type="button" onClick={onAddSurgeon} className="shrink-0 min-h-11 flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl bg-medical-600 text-white font-semibold text-sm cursor-pointer">
            <Plus size={16} />
            Add surgeon
          </button>
        </div>
        <p className="sm:hidden mb-2 flex items-center gap-2 text-xs text-slate-600">
          {!isOnline && <span className={offlineBadge}><WifiOff size={12} aria-hidden="true" /> Offline</span>}
          Your notes. The official card still wins.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button type="button" onClick={onPlaces} className={action}>Places</button>
          <button type="button" onClick={onToggleVendors} className={action} aria-expanded={showVendors}>Systems and companies</button>
          <button type="button" onClick={onImport} className={action}>Import</button>
          <button type="button" onClick={onExport} className={action}>Export backup</button>
        </div>
        <p role="status" className="sr-only">{isOnline ? '' : 'Offline. Your book still works on this phone.'}</p>
        <SearchBox key={searchKey} initialValue={search} onChange={onSearch} />
        {labels.length > 1 && (
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
            <button type="button" onClick={() => onPlaceFilter(null)} aria-pressed={!placeFilter} className={chip(!placeFilter)}>All places</button>
            {labels.map(label => (
              <button type="button" key={label} onClick={() => onPlaceFilter(placeFilter === label ? null : label)} aria-pressed={placeFilter === label} className={chip(placeFilter === label)}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
