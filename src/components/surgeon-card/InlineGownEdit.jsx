import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { GOWN_SIZES, GOWN_TYPES } from '../../data/constants';

export default function InlineGownEdit({ procedure, onSave, onCancel }) {
  const [size, setSize] = useState(procedure.gown?.size || 'L');
  const [type, setType] = useState(procedure.gown?.type || 'Standard');
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";
  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Gown</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
          {GOWN_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
          {GOWN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={() => onSave({ gown: { size, type } })} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}
