/**
 * VerifiedByFooter — Signature Stamp / Chain of Custody
 *
 * Shows who last verified the procedure card and when.
 * Editable: tap to set verifier name and title.
 * Timestamp auto-updates on any Scout Sheet or inventory change.
 */
import { useState } from 'react';
import { ShieldCheck, Edit3, Check, X, Clock } from 'lucide-react';

const TITLES = ['CST', 'RN', 'PA', 'RNFA', 'NP', 'Fellow', 'Resident'];

function formatStamp(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function VerifiedByFooter({ proc, updateProcedure }) {
  const verified = proc.verifiedBy || {};
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('CST');

  const startEdit = () => {
    setName(verified.name || '');
    setTitle(verified.title || 'CST');
    setEditing(true);
  };

  const save = () => {
    if (!name.trim()) return;
    updateProcedure(proc.id, {
      verifiedBy: {
        name: name.trim(),
        title,
        timestamp: new Date().toISOString(),
      },
    });
    setEditing(false);
  };

  const INPUT = "rounded-md bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 placeholder-slate-400";

  return (
    <div className="verified-footer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chain of Custody</span>
        </div>
        {!editing && (
          <button onClick={startEdit}
            className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer p-0.5"
            title="Edit verifier">
            <Edit3 size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Verifier name"
                className={`w-full ${INPUT}`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && save()}
              />
            </div>
            <div className="col-span-2">
              <select value={title} onChange={e => setTitle(e.target.value)} className={`w-full ${INPUT}`}>
                {TITLES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"><X size={14} /></button>
            <button onClick={save} disabled={!name.trim()} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer disabled:opacity-40"><Check size={14} /></button>
          </div>
        </div>
      ) : verified.name ? (
        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-200">{verified.name}</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded uppercase">{verified.title}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock size={10} />
            <span className="text-[10px] font-medium">{formatStamp(verified.timestamp)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-slate-500 italic">Not verified — tap edit to sign</p>
      )}
    </div>
  );
}
