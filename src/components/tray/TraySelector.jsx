import { useMemo } from 'react';
import { Download, CheckCircle2, Package } from 'lucide-react';
import { MASTER_TRAYS } from '../../data/trays';

export default function TraySelector({ hospitalTrays, onImport, onOpen, onClose, hospitalName }) {
  const importedIds = useMemo(() => new Set((hospitalTrays || []).map(t => t.importedFrom)), [hospitalTrays]);

  const importTray = (master) => {
    if (importedIds.has(master.id)) return;
    const instance = {
      id: crypto.randomUUID(),
      importedFrom: master.id,
      name: master.name,
      category: master.category,
      location: '',
      instruments: master.instruments.map(i => ({ ...i, id: crypto.randomUUID(), missing: false })),
    };
    onImport(instance);
  };

  return (
    <div className="fixed inset-0 z-50 slide-over-backdrop" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="slide-over-panel absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <Package size={18} /> Instrument Trays
            </h2>
            <button onClick={onClose} className="text-medical-200 hover:text-white transition-colors cursor-pointer text-sm font-medium">Close</button>
          </div>
          <p className="text-medical-300 text-xs mt-1">AST National Master Registry · Import to {hospitalName || 'facility'}</p>
        </div>

        {/* Hospital trays */}
        {(hospitalTrays || []).length > 0 && (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Your Facility Trays</p>
            <div className="space-y-1">
              {hospitalTrays.map(t => (
                <button key={t.id} onClick={() => { onOpen(t); onClose(); }}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.category} · {t.instruments.length} instruments{t.location ? ` · ${t.location}` : ''}</p>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Open</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Master templates */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Master Templates</p>
          <div className="space-y-2">
            {MASTER_TRAYS.map(master => {
              const alreadyImported = importedIds.has(master.id);
              return (
                <div key={master.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{master.name}</p>
                    <p className="text-xs text-slate-400">{master.category} · {master.instruments.length} instruments</p>
                  </div>
                  {alreadyImported ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 size={14} /> Imported
                    </span>
                  ) : (
                    <button onClick={() => importTray(master)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer">
                      <Download size={12} /> Import
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
