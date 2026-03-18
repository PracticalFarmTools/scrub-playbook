import { ExternalLink, X } from 'lucide-react';
import { SURGICAL_VENDORS } from '../data/vendors';

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
