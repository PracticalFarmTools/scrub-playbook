import { Search, Plus, BookOpen, X, Menu, Wifi, WifiOff, Filter, ShieldCheck, Building2, Package } from 'lucide-react';
import { hapticLight } from '../utils/haptics';

export default function AppHeader({
  search, onSearch, specialty, setSpecialty, specialties,
  latexFree, setLatexFree, showVendors, setShowVendors, onAddSurgeon, isOnline,
  hospital, onHospitalClick, onTraysClick,
}) {
  return (
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
              {/* Hospital badge */}
              <button onClick={onHospitalClick}
                className="flex items-center gap-1 mt-0.5 text-[11px] text-medical-600 font-semibold hover:text-medical-800 cursor-pointer transition-colors group">
                <Building2 size={11} className="shrink-0" />
                <span className="truncate max-w-[180px]">{hospital?.name || 'Select Facility'}</span>
                <span className="text-slate-400 group-hover:text-medical-600">›</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setLatexFree(v => !v); hapticLight(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                latexFree
                  ? 'latex-free-active'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200'
              }`}
              title={latexFree ? 'Latex-Free Room ACTIVE — latex gloves are flagged with ⚠️' : 'Enable Latex-Free Room'}>
              <ShieldCheck size={16} />
              <span className="hidden sm:inline">{latexFree ? '🚨 LATEX-FREE ROOM' : 'Latex-Free'}</span>
              <span className="sm:hidden">{latexFree ? '🔴 LF' : 'LF'}</span>
            </button>
            <button onClick={onTraysClick}
              className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all cursor-pointer" title="Instrument Trays">
              <Package size={20} />
            </button>
            <button onClick={() => setShowVendors(v => !v)}
              className="p-2 rounded-xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all cursor-pointer" title="Vendor Library">
              <Menu size={20} />
            </button>
            <button onClick={onAddSurgeon}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-medical-600 to-medical-700 text-white font-semibold text-sm shadow-lg shadow-medical-600/25 hover:from-medical-700 hover:to-medical-800 active:scale-[0.97] transition-all cursor-pointer">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Surgeon</span>
            </button>
          </div>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={onSearch}
            placeholder="Search Portal — surgeons, procedures, nicknames…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-400/40 focus:bg-white transition-all" />
          {search && (
            <button onClick={() => onSearch({ target: { value: '' } })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>

        {/* ═══ SPECIALTY FILTER BAR ═══ */}
        <div className="filter-bar mt-3">
          {specialties.map(s => (
            <button
              key={s}
              onClick={() => { setSpecialty(s); hapticLight(); }}
              className={`filter-pill ${specialty === s ? 'filter-pill-active' : ''}`}
            >
              {s === 'All' && <Filter size={13} className="inline -mt-px mr-1" />}
              {s}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
