import { BookOpen, Download, MapPin, Menu, Plus, Upload, WifiOff } from 'lucide-react';
import SearchBox from './SearchBox';

const offlineBadge = 'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50';
const headerButton = 'tap-icon rounded-xl text-slate-600 hover:text-medical-600 hover:bg-medical-50 cursor-pointer';
const chip = (on) => `shrink-0 min-h-11 px-3 rounded-full text-xs font-bold cursor-pointer ${on ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-700'}`;

export default function AppHeader({
  isOnline, search, searchKey, onSearch, labels, placeFilter, onPlaceFilter,
  showVendors, onExport, onPlaces, onImport, onToggleVendors, onAddSurgeon,
}) {
  return (
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
            <button type="button" onClick={onExport} className={headerButton} title="Export backup" aria-label="Export backup">
              <Download size={20} />
            </button>
            <button type="button" onClick={onPlaces} className={`${headerButton} gap-1 sm:px-2.5 text-xs font-bold`} title="Places" aria-label="Places">
              <MapPin size={20} className="sm:hidden" />
              <span className="hidden sm:inline">Places</span>
            </button>
            <button type="button" onClick={onImport} className={headerButton} title="Import" aria-label="Import">
              <Upload size={20} />
            </button>
            <button type="button" onClick={onToggleVendors} className={headerButton} title="Company pages" aria-label="Company pages" aria-expanded={showVendors}>
              <Menu size={20} />
            </button>
            <button type="button" onClick={onAddSurgeon} aria-label="Add surgeon" className="sm:ml-1 min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl bg-medical-600 text-white font-semibold text-sm cursor-pointer">
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
