import { useState } from 'react';
import { Plus, Share2, Stethoscope, Trash2 } from 'lucide-react';
import ProcedureGlance from './ProcedureGlance';

export default function SurgeonCard({
  surgeon,
  procedures,
  staleDays,
  onDeleteSurgeon,
  onDeleteProcedure,
  onEdit,
  onAddProcedure,
  onConfirm,
  onDispute,
  onClearDispute,
  onShare,
  onRename,
  onCopySample,
}) {
  const [confirming, setConfirming] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(surgeon.name);

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white flex items-start justify-between gap-3">
        <div className="min-w-0">
          {renaming ? (
            <form onSubmit={(e) => { e.preventDefault(); onRename(surgeon.id, name); setRenaming(false); }} className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)} className="min-w-0 rounded-lg bg-white/15 text-white text-sm px-2 py-1 border border-white/20" />
              <button className="text-xs font-bold text-white cursor-pointer">Save</button>
            </form>
          ) : (
            <h3 className="text-lg font-bold tracking-tight">{surgeon.name}</h3>
          )}
          <p className="text-medical-200 text-sm flex items-center gap-1.5 mt-0.5"><Stethoscope size={14} /> {surgeon.specialty}</p>
          {surgeon.demo && <p className="text-[10px] uppercase tracking-widest text-medical-300 mt-1">Sample · not your hospital</p>}
          {!surgeon.demo && !renaming && (
            <button type="button" onClick={() => { setName(surgeon.name); setRenaming(true); }} className="text-[10px] font-bold text-medical-200 mt-1 cursor-pointer">Rename</button>
          )}
        </div>
        <button
          onClick={() => setConfirming(confirming === 'surgeon' ? null : 'surgeon')}
          className="text-medical-300 hover:text-rose-300 p-1 cursor-pointer"
          aria-label={`Delete ${surgeon.name}`}
        >
          <Trash2 size={16} />
        </button>
      </header>
      {confirming === 'surgeon' && (
        <div className="px-5 py-3 bg-rose-50 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>Delete {surgeon.name} and every procedure?</span>
          <span className="flex gap-2">
            <button onClick={() => setConfirming(null)} className="font-semibold cursor-pointer">Cancel</button>
            <button onClick={() => onDeleteSurgeon(surgeon.id)} className="font-bold cursor-pointer">Delete</button>
          </span>
        </div>
      )}

      {procedures.length === 0 && (
        <p className="px-5 py-6 text-sm text-slate-400">No procedure yet. Add the case the way the board writes it.</p>
      )}

      {procedures.map(procedure => (
        <div key={procedure.id}>
          <ProcedureGlance procedure={procedure} surgeon={surgeon} staleDays={staleDays} />
          <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-slate-100">
            {surgeon.demo ? (
              <button type="button" onClick={() => onCopySample(surgeon.id)} className="text-[11px] font-bold text-medical-700 bg-medical-50 rounded-lg px-2.5 py-1 cursor-pointer">Copy into my book</button>
            ) : (
              <>
                <button type="button" onClick={() => onEdit(procedure)} className="text-[11px] font-bold text-medical-700 bg-medical-50 rounded-lg px-2.5 py-1 cursor-pointer">Edit</button>
                <button type="button" onClick={() => onConfirm(procedure)} className="text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 cursor-pointer">I was in this case</button>
                {procedure.disputed ? (
                  <button type="button" onClick={() => onClearDispute(procedure.id)} className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1 cursor-pointer">Clear flag</button>
                ) : (
                  <button type="button" onClick={() => onDispute(procedure)} className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1 cursor-pointer">Flag</button>
                )}
                <button type="button" onClick={() => onShare(surgeon, procedure)} className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1 cursor-pointer inline-flex items-center gap-1"><Share2 size={11} /> Share</button>
                <button type="button" onClick={() => setConfirming(procedure.id)} className="text-[11px] font-bold text-slate-500 cursor-pointer">Delete case</button>
              </>
            )}
          </div>
          {confirming === procedure.id && (
            <div className="px-5 py-2 text-xs text-rose-700 flex gap-3">
              <span>Delete this procedure?</span>
              <button onClick={() => onDeleteProcedure(procedure.id)} className="font-bold cursor-pointer">Delete</button>
              <button onClick={() => setConfirming(null)} className="cursor-pointer">Cancel</button>
            </div>
          )}
        </div>
      ))}

      {!surgeon.demo && (
        <button type="button" onClick={onAddProcedure} className="w-full px-5 py-3 text-xs font-bold text-medical-700 hover:bg-medical-50 cursor-pointer inline-flex items-center justify-center gap-1 border-t border-slate-100">
          <Plus size={14} /> Add procedure
        </button>
      )}
    </article>
  );
}
