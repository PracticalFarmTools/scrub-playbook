import { useState } from 'react';
import { Scissors, Edit3, Check, X } from 'lucide-react';
import { resolveTokens } from '../../utils/mirrorLogic';

export default function TipsSection({ proc, updateProcedure, opSide }) {
  const [editing, setEditing] = useState(false);
  const [tipDraft, setTipDraft] = useState('');

  const saveTips = () => {
    if (!proc) return;
    updateProcedure(proc.id, { tips: tipDraft });
    setEditing(false);
  };

  return (
    <div className="px-5 py-4 bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Scissors size={12} /> Tech-to-Tech Tips
        </p>
        {!editing && (
          <button onClick={() => { setTipDraft(proc.tips || ''); setEditing(true); }} className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">
            <Edit3 size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={tipDraft} onChange={e => setTipDraft(e.target.value)} rows={3} placeholder='e.g. "Bovie on {{OP_SIDE}} side. Nurse stands {{NON_OP}}."'
            className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none" />
          <p className="text-[10px] text-slate-500">💡 Use <code className="text-amber-400/70">{'{{OP_SIDE}}'}</code> and <code className="text-amber-400/70">{'{{NON_OP}}'}</code> for auto-mirroring</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X size={16} /></button>
            <button onClick={saveTips} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"><Check size={16} /></button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {proc.tips
            ? resolveTokens(proc.tips, opSide)
            : <span className="italic text-slate-500">No tips yet — tap edit to add.</span>
          }
        </p>
      )}
    </div>
  );
}
