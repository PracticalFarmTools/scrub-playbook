import { useState } from 'react';
import { Edit3, Check, X, Plus, Trash2 } from 'lucide-react';

export default function NicknameSection({ proc, updateProcedure }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState({ nickname: '', actual: '' });
  const [showAdd, setShowAdd] = useState(false);

  const nicknames = proc?.nicknames || [];

  const saveNickname = (idx) => {
    const nicks = [...nicknames];
    nicks[idx] = draft;
    updateProcedure(proc.id, { nicknames: nicks });
    setEditingIdx(null);
  };

  const deleteNickname = (idx) => {
    updateProcedure(proc.id, { nicknames: nicknames.filter((_, i) => i !== idx) });
  };

  const addNickname = () => {
    if (!draft.nickname.trim() || !draft.actual.trim()) return;
    updateProcedure(proc.id, { nicknames: [...nicknames, { ...draft }] });
    setDraft({ nickname: '', actual: '' });
    setShowAdd(false);
  };

  const editRowClass = "flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2";
  const editInputClass = "flex-1 text-sm bg-transparent border-b border-slate-500 text-white focus:outline-none focus:border-emerald-400 px-1 py-0.5";

  return (
    <div className="px-5 py-4 bg-slate-800 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Instrument Nicknames</p>
        <button onClick={() => { setDraft({ nickname: '', actual: '' }); setShowAdd(true); }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer">
          <Plus size={12} /> Add
        </button>
      </div>

      {nicknames.length > 0 ? (
        <div className="space-y-1.5">
          {nicknames.map((n, i) =>
            editingIdx === i ? (
              <div key={i} className={editRowClass}>
                <input value={draft.nickname} onChange={e => setDraft(d => ({ ...d, nickname: e.target.value }))}
                  placeholder="Nickname…" autoFocus className={editInputClass} />
                <span className="text-slate-500 text-sm">→</span>
                <input value={draft.actual} onChange={e => setDraft(d => ({ ...d, actual: e.target.value }))}
                  placeholder="Actual instrument…"
                  className={editInputClass + " text-slate-300"}
                  onKeyDown={e => e.key === 'Enter' && saveNickname(i)} />
                <button onClick={() => saveNickname(i)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={14} /></button>
                <button onClick={() => setEditingIdx(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
              </div>
            ) : (
              <div key={i} className="nickname-row flex items-center gap-2 text-sm group/nick rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-700/50 transition-colors">
                <span className="text-white font-semibold">"{n.nickname}"</span>
                <span className="text-slate-500">→</span>
                <span className="text-slate-300 flex-1">{n.actual}</span>
                <button onClick={() => { setDraft({ ...n }); setEditingIdx(i); }}
                  className="nickname-action text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors"><Edit3 size={12} /></button>
                <button onClick={() => deleteNickname(i)}
                  className="nickname-action text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"><Trash2 size={12} /></button>
              </div>
            )
          )}
        </div>
      ) : !showAdd && (
        <p className="text-sm text-slate-500 italic">No nicknames — tap Add to create one.</p>
      )}

      {showAdd && (
        <div className={editRowClass + " mt-2"}>
          <input value={draft.nickname} onChange={e => setDraft(d => ({ ...d, nickname: e.target.value }))}
            placeholder='e.g. "The Cobb"' autoFocus
            className={editInputClass + " placeholder-slate-500"} />
          <span className="text-slate-500 text-sm">→</span>
          <input value={draft.actual} onChange={e => setDraft(d => ({ ...d, actual: e.target.value }))}
            placeholder="Cobb Elevator"
            className={editInputClass + " text-slate-300 placeholder-slate-500"}
            onKeyDown={e => e.key === 'Enter' && addNickname()} />
          <button onClick={addNickname} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={14} /></button>
          <button onClick={() => { setShowAdd(false); setDraft({ nickname: '', actual: '' }); }} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
