import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../../data/gloves';
import { getGloveOptions, GLOVE_COLORS } from './helpers';
import SearchableDropdown from '../SearchableDropdown';

export default function InlineGloveEdit({ procedure, onSave, onCancel, latexFree = false }) {
  const GLOVE_OPTIONS = getGloveOptions(latexFree);
  const [gloveId, setGloveId] = useState(
    SURGICAL_GLOVES.find(g => g.model === procedure.glove?.model)?.id || SURGICAL_GLOVES[0]?.id
  );
  const [size, setSize] = useState(procedure.glove?.size || '7.0');
  const [dg, setDg] = useState(procedure.doubleGlove || false);
  const [underId, setUnderId] = useState(
    SURGICAL_GLOVES.find(g => g.model === procedure.underGlove?.model)?.id || SURGICAL_GLOVES[0]?.id
  );
  const [underSize, setUnderSize] = useState(procedure.underGlove?.size || '7.5');
  const [draping, setDraping] = useState(procedure.requiresDrapingGloves || false);
  const [drapingGloveId, setDrapingGloveId] = useState(procedure.drapingGloveId || SURGICAL_GLOVES[0]?.id);
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";

  const save = () => {
    const g = SURGICAL_GLOVES.find(x => x.id === gloveId);
    const u = dg ? SURGICAL_GLOVES.find(x => x.id === underId) : null;
    onSave({
      glove: { id: gloveId, model: g?.model || '', brand: g?.brand || '', color: g?.color || '', size },
      doubleGlove: dg,
      underGlove: u ? { id: underId, model: u.model, brand: u.brand, color: u.color, size: underSize } : null,
      requiresDrapingGloves: draping,
      drapingGloveId: draping ? drapingGloveId : null,
    });
  };

  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Glove</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <SearchableDropdown options={GLOVE_OPTIONS} value={gloveId} onChange={setGloveId} placeholder="Search gloves…"
            renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
        </div>
        <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
          {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {/* Draping Gloves Toggle */}
      <label className="flex items-center gap-2 cursor-pointer mt-1">
        <div className={`relative w-10 h-5 rounded-full transition-colors ${draping ? 'bg-amber-500' : 'bg-slate-300'}`} onClick={() => setDraping(!draping)}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draping ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600">Requires Draping Gloves</span>
      </label>
      {draping && (
        <div className="grid grid-cols-3 gap-2 pl-4 border-l-2 border-amber-300">
          <div className="col-span-3">
            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Draping Glove</p>
            <SearchableDropdown options={GLOVE_OPTIONS} value={drapingGloveId} onChange={setDrapingGloveId} placeholder="Draping glove…"
              renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2" style={{display:'none'}}>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={`relative w-10 h-5 rounded-full transition-colors ${dg ? 'bg-medical-600' : 'bg-slate-300'}`} onClick={() => setDg(!dg)}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dg ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600">Double-Glove</span>
      </label>
      {dg && (
        <div className="grid grid-cols-3 gap-2 pl-4 border-l-2 border-medical-300">
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Under Glove</p>
            <SearchableDropdown options={GLOVE_OPTIONS} value={underId} onChange={setUnderId} placeholder="Under glove…"
              renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Size</p>
            <select value={underSize} onChange={e => setUnderSize(e.target.value)} className={inputClass}>
              {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={save} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}
