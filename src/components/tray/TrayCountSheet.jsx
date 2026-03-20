import { useState, useMemo } from 'react';
import { X, Check, MapPin, AlertTriangle, ExternalLink } from 'lucide-react';
import { SORT_GROUPS, sortByStringerLogic } from '../../data/trays';
import InstrumentPhoto from './InstrumentPhoto';
import InstrumentInspector from '../surgeon-card/InstrumentInspector';

const GROUP_COLORS = {
  1: 'bg-rose-50 text-rose-700 border-rose-200',
  2: 'bg-amber-50 text-amber-700 border-amber-200',
  3: 'bg-sky-50 text-sky-700 border-sky-200',
  4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  5: 'bg-violet-50 text-violet-700 border-violet-200',
};

const GROUP_LABELS = { 1: 'Cut', 2: 'Clamp', 3: 'Grasp', 4: 'Retract', 5: 'Specialty' };

/** Fallback IFU URLs by category keyword (used when tray has no ifuUrl) */
const CATEGORY_IFU = {
  'orthopedics':              'https://ifu.stryker.com',
  'general surgery':          'https://www.e-ifu.com',
  'gyn / ob':                 'https://www.e-ifu.com',
  'ophthalmology':            'https://ifu.alcon.com',
  'neurosurgery':             'https://manuals.medtronic.com',
  'ent':                      'https://www.karlstorz.com/us/en/media-library.htm',
  'vascular':                 'https://www.e-ifu.com',
  'plastics / reconstructive':'https://www.e-ifu.com',
  'plastic / hand':           'https://www.e-ifu.com',
  'cardiothoracic':           'https://eifu.getinge.com',
  'genitourinary':            'https://www.richard-wolf.com/en-us/download-center',
};

function getIfuUrl(tray) {
  if (tray.ifuUrl) return tray.ifuUrl;
  const cat = (tray.category || '').toLowerCase();
  return CATEGORY_IFU[cat] || 'https://www.e-ifu.com';
}

export default function TrayCountSheet({ tray, onUpdate, onClose }) {
  const [editingLoc, setEditingLoc] = useState(false);
  const [locDraft, setLocDraft] = useState(tray.location || '');
  const [verifyInst, setVerifyInst] = useState(null);

  const sorted = sortByStringerLogic(tray.instruments);
  let lastGroup = 0;
  let rowIdx = 0;

  const toggleAmber = (instId) => {
    const instruments = tray.instruments.map(i =>
      i.id === instId ? { ...i, missing: !i.missing } : i
    );
    onUpdate({ ...tray, instruments });
  };

  const toggleItemStatus = (instId) => {
    const instruments = tray.instruments.map(i =>
      i.id === instId ? { ...i, itemStatus: i.itemStatus === 'OPEN' ? 'HOLD' : 'OPEN' } : i
    );
    onUpdate({ ...tray, instruments });
  };

  const updateQty = (instId, newQty) => {
    const instruments = tray.instruments.map(i =>
      i.id === instId ? { ...i, qty: Math.max(0, newQty) } : i
    );
    onUpdate({ ...tray, instruments });
  };

  const saveLoc = () => {
    onUpdate({ ...tray, location: locDraft.trim() });
    setEditingLoc(false);
  };

  const missingCount = tray.instruments.filter(i => i.missing).length;
  const totalQty = useMemo(() => tray.instruments.reduce((sum, i) => sum + (i.qty || 0), 0), [tray.instruments]);
  const ifuUrl = useMemo(() => getIfuUrl(tray), [tray]);

  return (
    <div className="fixed inset-0 z-50 slide-over-backdrop" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="slide-over-panel absolute inset-y-0 right-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-bold text-base">{tray.name}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium">Close</button>
          </div>
          <p className="text-slate-400 text-xs">{tray.category} · {tray.instruments.length} instruments</p>
          <div className="mt-2">
            {editingLoc ? (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <input value={locDraft} onChange={e => setLocDraft(e.target.value)} autoFocus placeholder="Core Shelf B-12"
                  className="flex-1 text-xs bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white placeholder-slate-500 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && saveLoc()} />
                <button onClick={saveLoc} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={12} /></button>
                <button onClick={() => setEditingLoc(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => { setLocDraft(tray.location || ''); setEditingLoc(true); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                <MapPin size={11} />
                {tray.location || 'Add location…'}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase w-14">Qty</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-slate-500 uppercase w-16">Cat</th>
                <th className="w-10 px-1 py-2 text-[10px] font-bold text-slate-500 uppercase">Img</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-slate-500 uppercase">Instrument</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-slate-500 uppercase w-24">Specs</th>
                <th className="w-10 px-1 py-2 text-[10px] font-bold text-slate-500 uppercase" title="Status">☐</th>
                <th className="w-9 px-1 py-2 text-[10px] font-bold text-slate-500 uppercase" title="Missing">⚠</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inst) => {
                const groupChanged = inst.sortGroup !== lastGroup;
                lastGroup = inst.sortGroup;
                const groupInfo = SORT_GROUPS.find(g => g.id === inst.sortGroup);
                if (groupChanged) rowIdx = 0;
                const isEven = rowIdx % 2 === 0;
                rowIdx++;
                const isOpen = inst.itemStatus === 'OPEN';

                return (
                  <>{groupChanged && (
                    <tr key={`grp-${inst.sortGroup}`}>
                      <td colSpan={7} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-y ${GROUP_COLORS[inst.sortGroup] || ''}`}>
                        {groupInfo?.emoji} {groupInfo?.label}
                      </td>
                    </tr>
                  )}
                  <tr key={inst.id} className={`border-b border-slate-100/50 transition-colors ${
                    inst.missing ? 'bg-amber-50' : isOpen ? 'bg-blue-50/50' : isEven ? 'bg-white' : 'bg-slate-50/60'
                  }`}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => updateQty(inst.id, inst.qty - 1)}
                          className="w-5 h-5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer">−</button>
                        <span className={`text-sm font-bold w-5 text-center ${inst.missing ? 'text-amber-700' : 'text-slate-800'}`}>{inst.qty}</span>
                        <button onClick={() => updateQty(inst.id, inst.qty + 1)}
                          className="w-5 h-5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center hover:bg-slate-300 cursor-pointer">+</button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${GROUP_COLORS[inst.sortGroup] || 'text-slate-500'}`}>
                        {GROUP_LABELS[inst.sortGroup] || ''}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <InstrumentPhoto instrumentName={inst.name} sortGroup={inst.sortGroup} size={28} />
                    </td>
                    <td className={`px-2 py-1.5 font-semibold ${inst.missing ? 'text-amber-700' : 'text-slate-800'}`}>
                      <button
                        onClick={() => setVerifyInst(inst)}
                        className="verify-name-btn"
                      >
                        {inst.name}
                      </button>
                      {inst.missing && <AlertTriangle size={11} className="inline ml-1 text-amber-500" />}
                    </td>
                    <td className="px-2 py-1.5 text-slate-500 text-[11px]">{inst.specs}</td>
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => toggleItemStatus(inst.id)}
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          isOpen ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}>{isOpen ? 'OPEN' : 'HOLD'}</button>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => toggleAmber(inst.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all text-[10px] ${
                          inst.missing ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-amber-100'
                        }`} title={inst.missing ? 'Found' : 'Missing'}>⚠</button>
                    </td>
                  </tr></>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer — Count Total + IFU Link + Missing status */}
        <div className="shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          {/* Count Total */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">
              📋 Total Instruments: <span className="text-medical-600">{totalQty}</span>
              <span className="text-slate-400 font-normal ml-1">({tray.instruments.length} unique)</span>
            </p>
          </div>

          {/* Missing / Status */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {missingCount > 0
                ? <span className="text-amber-600 font-bold">⚠ {missingCount} missing / repair</span>
                : '✅ All instruments accounted for'}
            </p>
            <p className="text-[10px] text-slate-400">AST Stringer Logic</p>
          </div>

          {/* Manufacturer IFU Link */}
          <a href={ifuUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 active:scale-[0.98] transition-all">
            <ExternalLink size={13} />
            Manufacturer IFU Lookup
          </a>
        </div>

        {/* Click-to-Verify Modal */}
        {verifyInst && (
          <InstrumentInspector
            instrument={verifyInst}
            tray={tray}
            onClose={() => setVerifyInst(null)}
          />
        )}
      </div>
    </div>
  );
}

