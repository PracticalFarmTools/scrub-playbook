import { useState } from 'react';
import { Plus, Share2, Stethoscope, Trash2 } from 'lucide-react';
import { findPhiInSurgeon } from '../data/phi';
import { rowTrust, timeAgo } from '../data/trust';
import ProcedureGlance from './ProcedureGlance';
import PhiPause from './PhiPause';
import { STATUS_CLASS } from './statusStyle';

function formatUpdated(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SurgeonCard({
  surgeon,
  procedures,
  trustProcedures,
  staleDays,
  highlightId,
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
  onCaseView,
  onSaveFirstCase,
}) {
  const [confirming, setConfirming] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(surgeon.name);
  const [editingFirst, setEditingFirst] = useState(false);
  const [firstDraft, setFirstDraft] = useState(['', '', '']);
  const [phi, setPhi] = useState([]);
  const firstLines = (surgeon.firstCase || []).map(line => String(line || '').trim()).filter(Boolean).slice(0, 3);
  const updated = formatUpdated(surgeon.firstCaseAt);
  const updatedBy = (surgeon.firstCaseBy || '').trim();
  const updatedLine = updated && updatedBy
    ? `Updated ${updated} by ${updatedBy}.`
    : updated
      ? `Updated ${updated}.`
      : updatedBy
        ? `Updated by ${updatedBy}.`
        : '';
  const row = surgeon.demo ? null : rowTrust(trustProcedures || procedures, { staleDays });
  const rowLabel = row?.status === 'confirmed'
    ? (row.at ? `Matched a case · ${timeAgo(row.at)}` : 'Matched a case')
    : row?.label;

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

      {row && (
        <div className="px-5 pt-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[row.status]}`}>
            {rowLabel}
          </span>
        </div>
      )}

      {(firstLines.length > 0 || editingFirst) && (
        <div className="px-5 pt-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">New to {surgeon.name}</p>
              {!surgeon.demo && !editingFirst && (
                <button type="button" onClick={() => {
                  setFirstDraft([firstLines[0] || '', firstLines[1] || '', firstLines[2] || '']);
                  setEditingFirst(true);
                }} className="text-[10px] font-bold text-medical-700 cursor-pointer">Edit</button>
              )}
            </div>
            {editingFirst ? (
              <form className="mt-2 space-y-2" onSubmit={(e) => {
                e.preventDefault();
                const next = { ...surgeon, firstCase: firstDraft };
                const hits = findPhiInSurgeon(next);
                if (hits.length) { setPhi(hits); return; }
                onSaveFirstCase?.(surgeon.id, firstDraft);
                setEditingFirst(false);
              }}>
                {firstDraft.map((line, index) => (
                  <input key={index} value={line} maxLength={140} placeholder={`Line ${index + 1}`} onChange={e => setFirstDraft(firstDraft.map((item, i) => i === index ? e.target.value : item))} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
                ))}
                <div className="flex gap-3 text-xs font-bold">
                  <button type="submit" className="text-medical-700 cursor-pointer">Save</button>
                  <button type="button" onClick={() => setEditingFirst(false)} className="text-slate-500 cursor-pointer">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <ul className="mt-1.5 space-y-1">
                  {firstLines.map(line => <li key={line} className="text-sm text-slate-700">• {line}</li>)}
                </ul>
                {updatedLine && <p className="text-[11px] text-slate-400 mt-1.5">{updatedLine}</p>}
              </>
            )}
          </div>
        </div>
      )}
      {!surgeon.demo && firstLines.length === 0 && !editingFirst && (
        <div className="px-5 pt-3">
          <button type="button" onClick={() => { setFirstDraft(['', '', '']); setEditingFirst(true); }} className="text-[11px] font-bold text-medical-700 cursor-pointer">Add first-case notes</button>
        </div>
      )}
      {phi.length > 0 && <PhiPause signals={phi} onEdit={() => setPhi([])} />}

      {procedures.length === 0 && (
        <p className="px-5 py-6 text-sm text-slate-400">No procedure yet. Add the case the way the board writes it.</p>
      )}

      {procedures.map(procedure => (
        <div
          key={procedure.id}
          id={`procedure-${procedure.id}`}
          className={`scroll-mt-28 ${highlightId === procedure.id ? 'ring-2 ring-medical-500 ring-offset-2' : ''}`}
        >
          <ProcedureGlance procedure={procedure} surgeon={surgeon} staleDays={staleDays} onCaseView={onCaseView ? () => onCaseView(surgeon, procedure) : null} />
          <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-slate-100">
            <button type="button" onClick={() => onCaseView?.(surgeon, procedure)} className="text-[11px] font-bold text-medical-700 bg-medical-50 rounded-lg px-2.5 py-1 cursor-pointer">Case view</button>
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
