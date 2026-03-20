import { ExternalLink, X, Package } from 'lucide-react';
import { SURGICAL_VENDORS } from '../data/vendors';
import { SORT_GROUPS } from '../data/trays';

const SORT_EMOJI = { 1: '✂️', 2: '🔒', 3: '🤏', 4: '📐', 5: '🪡' };

/**
 * Vendor search results — shown when user searches and matches vendors.
 */
export function VendorResults({ vendors }) {
  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <div className="bg-medical-50 border border-medical-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-medical-600 uppercase tracking-wider mb-3">
          Vendor Matches ({vendors.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {vendors.map((v, i) => (
            <a
              key={i}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:shadow-md transition-all group border border-transparent hover:border-medical-300"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 group-hover:text-medical-700">{v.name}</p>
                <p className="text-xs text-slate-400 truncate">{v.alias}</p>
              </div>
              <ExternalLink size={14} className="text-slate-300 group-hover:text-medical-500 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tray instrument search results — shown when user searches and matches instruments in trays.
 * Visually distinct from vendor results to avoid clutter.
 */
export function TrayResults({ trays }) {
  return (
    <div className="max-w-5xl mx-auto px-4 mt-3">
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Package size={13} /> Tray Instrument Matches ({trays.length} tray{trays.length !== 1 ? 's' : ''})
        </p>
        <div className="space-y-2">
          {trays.map(tray => (
            <div key={tray.id} className="bg-white rounded-xl px-4 py-3 border border-teal-100">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-sm font-bold text-slate-800">{tray.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {tray.category} · {tray.instruments.length} total instruments
                    {tray.hospital && <span className="text-teal-600 font-medium"> · {tray.hospital}</span>}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full uppercase shrink-0">
                  {tray.matchedInstruments.length} match{tray.matchedInstruments.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tray.matchedInstruments.map(inst => (
                  <span key={inst.id} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 border border-slate-200">
                    <span>{SORT_EMOJI[inst.sortGroup] || ''}</span>
                    {inst.name}
                    <span className="text-slate-400 font-normal">×{inst.qty}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Full vendor library panel — toggled from the header menu icon.
 */
export function VendorLibrary({ onClose }) {
  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-700">📋 Vendor IFU Library ({SURGICAL_VENDORS.length})</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
          {SURGICAL_VENDORS.map((v, i) => (
            <a
              key={i}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 hover:bg-medical-50 transition-all group"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-medical-700 truncate">{v.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{v.alias}</p>
              </div>
              <ExternalLink size={12} className="text-slate-300 group-hover:text-medical-500 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

