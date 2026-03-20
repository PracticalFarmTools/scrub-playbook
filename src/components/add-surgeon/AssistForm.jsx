import { Plus, Trash2 } from 'lucide-react';
import { GLOVE_SIZES } from '../../data/gloves';
import { ASSIST_ROLES } from '../../data/constants';

const inputClass = "w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50 focus:border-medical-400 transition-all placeholder-slate-400";

export default function AssistForm({ assists, assistField, setAssistField, addAssist, setAssists }) {
  const removeAssist = (idx) => {
    setAssists(assists.filter((_, i) => i !== idx));
  };

  return (
    <div className="border-t border-slate-100 px-5 py-5 space-y-3">
      <p className="text-sm font-bold text-medical-700 flex items-center gap-2">👥 Common Assists</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={assistField.name} onChange={e => setAssistField(f => ({ ...f, name: e.target.value }))} placeholder="Name" className={inputClass} />
        <select value={assistField.role} onChange={e => setAssistField(f => ({ ...f, role: e.target.value }))} className={inputClass}>
          {ASSIST_ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <input value={assistField.gloveModel} onChange={e => setAssistField(f => ({ ...f, gloveModel: e.target.value }))} placeholder="Their glove model" className={inputClass} />
        <div className="flex gap-2">
          <select value={assistField.gloveSize} onChange={e => setAssistField(f => ({ ...f, gloveSize: e.target.value }))} className={inputClass + " flex-1"}>
            {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="button" onClick={addAssist} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
            <Plus size={18} />
          </button>
        </div>
      </div>
      {assists.length > 0 && (
        <div className="space-y-1.5">
          {assists.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-slate-700">{a.name}</span>
                <span className="text-slate-400 ml-1">({a.role})</span>
              </div>
              <div className="flex items-center gap-3">
                {a.gloveModel && <span className="text-xs text-medical-600">{a.gloveModel} · {a.gloveSize}</span>}
                <button type="button" onClick={() => removeAssist(i)} className="text-slate-300 hover:text-rose-500 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
