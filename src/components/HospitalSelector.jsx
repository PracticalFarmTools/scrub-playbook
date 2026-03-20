import { useState, useMemo } from 'react';
import { Search, X, MapPin, Building2, ChevronRight } from 'lucide-react';
import { getHospitalsByState } from '../data/hospitals';

export default function HospitalSelector({ current, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => getHospitalsByState(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map(g => ({
        state: g.state,
        hospitals: g.hospitals.filter(h =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.state.toLowerCase().includes(q) ||
          h.stateCode.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.hospitals.length > 0);
  }, [groups, query]);

  return (
    <div className="fixed inset-0 z-50 slide-over-backdrop" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="slide-over-panel absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <Building2 size={18} /> Select Facility
            </h2>
            <button onClick={onClose} className="text-medical-200 hover:text-white transition-colors cursor-pointer text-sm font-medium">
              Close
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medical-300" />
            <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
              placeholder="Search hospitals, cities, states…"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-medical-300 focus:outline-none focus:ring-1 focus:ring-white/40" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-medical-300 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Current */}
        {current && (
          <div className="px-5 py-3 bg-medical-50 border-b border-medical-100">
            <p className="text-[10px] font-bold text-medical-500 uppercase tracking-widest mb-1">Current Facility</p>
            <p className="text-sm font-bold text-medical-800">{current.name}</p>
            <p className="text-xs text-medical-500">{current.city}, {current.stateCode}</p>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">No hospitals match "{query}"</p>
          ) : (
            filtered.map(group => (
              <div key={group.state}>
                <div className="sticky top-0 bg-slate-50 px-5 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={11} /> {group.state}
                  </p>
                </div>
                {group.hospitals.map(h => {
                  const isActive = current?.id === h.id;
                  return (
                    <button key={h.id} onClick={() => { onSelect(h); onClose(); }}
                      className={`w-full text-left px-5 py-3 flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-medical-50 border-l-3 border-medical-500'
                          : 'hover:bg-slate-50 border-l-3 border-transparent'
                      }`}>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-medical-700' : 'text-slate-700'}`}>{h.name}</p>
                        <p className="text-xs text-slate-400">{h.city}, {h.stateCode}</p>
                      </div>
                      {isActive && <span className="text-[9px] font-bold text-medical-600 bg-medical-100 px-2 py-0.5 rounded-full uppercase">Active</span>}
                      {!isActive && <ChevronRight size={14} className="text-slate-300" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
