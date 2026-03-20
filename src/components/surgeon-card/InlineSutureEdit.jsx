import { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { SUTURE_LIBRARY, SUTURE_SIZES } from '../../data/sutures';
import { SURGICAL_NEEDLES, NEEDLE_LIST } from '../../data/needles';
import { SUTURE_OPTIONS } from './helpers';
import SearchableDropdown from '../SearchableDropdown';

export default function InlineSutureEdit({ procedure, onSave, onCancel }) {
  const [sutures, setSutures] = useState([...(procedure.sutures || [])]);
  const [material, setMaterial] = useState(SUTURE_LIBRARY[0]?.name || '');
  const [size, setSize] = useState('3-0');
  const [needle, setNeedle] = useState(NEEDLE_LIST[0]?.name || '');
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";

  const addSuture = () => {
    const found = SUTURE_LIBRARY.find(s => s.name === material);
    if (found) setSutures(prev => [...prev, { name: found.name, color: found.color, textColor: found.textColor, size, needle }]);
  };
  const removeSuture = (i) => setSutures(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Sutures</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Material</p>
          <SearchableDropdown options={SUTURE_OPTIONS} value={material} onChange={setMaterial} placeholder="Suture…"
            renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}</span>} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Size</p>
          <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
            {SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Needle</p>
          <select value={needle} onChange={e => setNeedle(e.target.value)} className={inputClass}>
            {SURGICAL_NEEDLES.map(cat => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.items.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <button type="button" onClick={addSuture} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-sm">
        <Plus size={13} /> Add Suture
      </button>
      {sutures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sutures.map((s, i) => (
            <button key={i} type="button" onClick={() => removeSuture(i)} title="Click to remove"
              className="suture-pill inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: s.color, color: s.textColor }}>
              {s.size} {s.name} {s.needle && `· ${s.needle}`}
              <X size={11} className="opacity-60" />
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={() => onSave({ sutures })} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}
