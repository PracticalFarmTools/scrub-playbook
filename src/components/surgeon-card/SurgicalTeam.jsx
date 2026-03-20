import { useState } from 'react';
import { Trash2, User, Check, Plus, UserPlus } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../../data/gloves';
import { ASSIST_ROLES } from '../../data/constants';
import { getGloveOptions, EMPTY_ASSIST, INPUT_CLASS, GLOVE_COLORS } from './helpers';
import SearchableDropdown from '../SearchableDropdown';

export default function SurgicalTeam({ surgeon, onUpdate, onAudit, latexFree }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_ASSIST });
  const [note, setNote] = useState('');

  const GLOVE_OPTIONS = getGloveOptions(latexFree);
  const assists = surgeon.assists || [];

  const saveAssist = () => {
    if (!draft.name.trim()) return;
    const glove = SURGICAL_GLOVES.find(g => g.id === draft.gloveId);
    const newAssist = {
      name: draft.name.trim(), role: draft.role,
      gloveModel: glove?.model || '', gloveBrand: glove?.brand || '', gloveSize: draft.gloveSize,
      addedBy: surgeon.addedBy || 'Kyle', addedOn: new Date().toISOString(),
    };
    onUpdate({ ...surgeon, assists: [...assists, newAssist] });
    if (onAudit) onAudit({ action: `Assist Added: ${newAssist.name} (${newAssist.role})`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle', note: note || null });
    setDraft({ ...EMPTY_ASSIST }); setNote(''); setShowForm(false);
  };

  const removeAssist = (idx) => {
    const removed = assists[idx];
    onUpdate({ ...surgeon, assists: assists.filter((_, i) => i !== idx) });
    if (onAudit) onAudit({ action: `Assist Removed: ${removed.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  return (
    <div className="px-5 py-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <User size={12} /> Surgical Team
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-medical-600 hover:text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-lg px-2.5 py-1 transition-all cursor-pointer">
            <Plus size={12} /> Add Assist
          </button>
        )}
      </div>

      {assists.length > 0 && (
        <div className="space-y-2 mb-3">
          {assists.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 group">
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-400">{a.role}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-medium text-medical-600">{a.gloveModel}</p>
                  <p className="text-xs text-slate-400">Size {a.gloveSize}</p>
                </div>
                <button onClick={() => removeAssist(i)} className="text-transparent group-hover:text-slate-300 hover:!text-rose-500 transition-colors cursor-pointer p-0.5" aria-label="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assists.length === 0 && !showForm && (
        <p className="text-sm text-slate-300 italic">No assists yet — tap "Add Assist"</p>
      )}

      {showForm && (
        <div className="bg-medical-50 border border-medical-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={14} className="text-medical-600" />
            <p className="text-xs font-bold text-medical-700 uppercase tracking-wider">Quick-Add Assist</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Assistant name" className={INPUT_CLASS} autoFocus />
            </div>
            <div className="col-span-2">
              <select value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value }))} className={INPUT_CLASS}>
                {ASSIST_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <SearchableDropdown options={GLOVE_OPTIONS} value={draft.gloveId} onChange={(val) => setDraft(d => ({ ...d, gloveId: val }))} placeholder="Search gloves…"
                renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
            </div>
            <div className="col-span-2">
              <select value={draft.gloveSize} onChange={e => setDraft(d => ({ ...d, gloveSize: e.target.value }))} className={INPUT_CLASS}>
                {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Change note / reason (optional)"
            className="w-full rounded-lg bg-white border border-medical-200 text-slate-600 text-xs px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-medical-400/40" />
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowForm(false); setDraft({ ...EMPTY_ASSIST }); setNote(''); }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">Cancel</button>
            <button type="button" onClick={saveAssist} disabled={!draft.name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              <Check size={13} /> Add to Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
