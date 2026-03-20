import { useState } from 'react';
import { X, Check, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { DRAPE_TYPES, DEFAULT_SEQUENCES } from '../../data/draping';

const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all placeholder-slate-400";

export default function InlineDrapingEdit({ procedure, onSave, onCancel }) {
  const existing = procedure.draping || {};
  const [drapeType, setDrapeType] = useState(existing.drapeType || '');
  const [sequence, setSequence] = useState([...(existing.sequence || [])]);
  const [gloveChange, setGloveChange] = useState(existing.postDrapeGloveChange || false);
  const [newStep, setNewStep] = useState('');

  const handleTypeChange = (type) => {
    setDrapeType(type);
    // Auto-populate sequence from template if empty or switching types
    if (DEFAULT_SEQUENCES[type]) {
      setSequence([...DEFAULT_SEQUENCES[type]]);
    }
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setSequence(prev => [...prev, newStep.trim()]);
    setNewStep('');
  };

  const removeStep = (idx) => setSequence(prev => prev.filter((_, i) => i !== idx));

  const moveStep = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= sequence.length) return;
    const arr = [...sequence];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setSequence(arr);
  };

  const save = () => {
    onSave({
      draping: {
        drapeType, sequence,
        postDrapeGloveChange: gloveChange,
      },
    });
  };

  return (
    <div className="space-y-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
      <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Edit Draping</p>

      {/* Drape Type */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Drape Type</label>
        <select value={drapeType} onChange={e => handleTypeChange(e.target.value)} className={inputClass}>
          <option value="">— Select —</option>
          {DRAPE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Sequence Builder */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-slate-400 uppercase">Draping Sequence</label>
        {sequence.length > 0 && (
          <div className="space-y-1">
            {sequence.map((step, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-medical-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm text-slate-700 flex-1">{step}</span>
                <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}
                  className="text-slate-300 hover:text-medical-600 disabled:opacity-30 cursor-pointer p-0.5"><ArrowUp size={12} /></button>
                <button type="button" onClick={() => moveStep(i, 1)} disabled={i === sequence.length - 1}
                  className="text-slate-300 hover:text-medical-600 disabled:opacity-30 cursor-pointer p-0.5"><ArrowDown size={12} /></button>
                <button type="button" onClick={() => removeStep(i)}
                  className="text-slate-300 hover:text-rose-500 cursor-pointer p-0.5"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Add step…"
            className={inputClass + " flex-1"}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStep())} />
          <button type="button" onClick={addStep}
            className="shrink-0 w-9 h-9 rounded-lg bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Glove Change Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={`relative w-10 h-5 rounded-full transition-colors ${gloveChange ? 'bg-amber-500' : 'bg-slate-300'}`}
          onClick={() => setGloveChange(!gloveChange)}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${gloveChange ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600">Post-Drape Glove Change Required</span>
      </label>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={save} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}
