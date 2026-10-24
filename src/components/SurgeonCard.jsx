import { useState } from 'react';
import { ChevronDown, History, Plus, Share2, Stethoscope, Trash2 } from 'lucide-react';
import { findPhiInSurgeon, findPhiSignals } from '../data/phi';
import { rowTrust, timeAgo, trustState } from '../data/trust';
import { sourceLabel } from '../data/unitBook';
import ProcedureGlance from './ProcedureGlance';
import PhiPause from './PhiPause';
import { STATUS_CLASS } from './statusStyle';

const SHORT_STATUS = {
  confirmed: 'Matched',
  noted: 'One person',
  stale: 'Stale',
  disputed: 'Flagged',
  unconfirmed: 'Unconfirmed',
};

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
  trustFor,
  highlightId,
  autoOpen = false,
  onDeleteSurgeon,
  onDeleteProcedure,
  onEdit,
  onDuplicate,
  suggestionFor,
  onCloseSuggestion,
  onAddProcedure,
  onConfirm,
  onDispute,
  onClearDispute,
  onShare,
  onUpdateSurgeon,
  onCopySample,
  onCopyToNotes,
  onCaseView,
  onSaveFirstCase,
  onHistory,
}) {
  const [confirming, setConfirming] = useState(/** @type {any} */ (null));
  const [editingDetails, setEditingDetails] = useState(false);
  const [name, setName] = useState(surgeon.name);
  const [place, setPlace] = useState(surgeon.facility || '');
  const [detailsError, setDetailsError] = useState('');
  const [editingFirst, setEditingFirst] = useState(false);
  const [firstDraft, setFirstDraft] = useState(['', '', '']);
  const [phi, setPhi] = useState(/** @type {Array<import('../data/types').PhiSignal>} */ ([]));
  const [phiNext, setPhiNext] = useState('Take that detail out, then save.');
  const [flagging, setFlagging] = useState(/** @type {any} */ (null));
  const [flagReason, setFlagReason] = useState('');
  const [openIds, setOpenIds] = useState(() => new Set());
  const isOpen = (id) => openIds.has(id) || highlightId === id || flagging === id || confirming === id || (autoOpen && procedures.length <= 3);
  const toggleOpen = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
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
  const unitOwned = Boolean(surgeon.unitBook?.id);
  const editable = !surgeon.demo && !unitOwned;
  const row = surgeon.demo ? null : rowTrust(trustProcedures || procedures, { staleDays }, trustFor);
  const rowLabel = row?.status === 'confirmed'
    ? (row.at ? `Matched a case · ${timeAgo(row.at)}` : 'Matched a case')
    : row?.label;

  return (
    <article className="surgeon-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editingDetails ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                setDetailsError('Add a name to save.');
                return;
              }
              setDetailsError('');
              const next = { ...surgeon, name, facility: place };
              const hits = findPhiInSurgeon(next);
              if (hits.length) { setPhiNext('Take that detail out, then save.'); setPhi(hits); return; }
              onUpdateSurgeon?.(surgeon.id, { name, facility: place });
              setEditingDetails(false);
            }} className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} aria-label="Name" className="w-full min-w-0 min-h-11 rounded-lg bg-white/15 text-white text-sm px-2 py-1 border border-white/20" />
              <input value={place} onChange={e => setPlace(e.target.value)} aria-label="Place" placeholder="Place" className="w-full min-w-0 min-h-11 rounded-lg bg-white/15 text-white text-sm px-2 py-1 border border-white/20 placeholder:text-medical-200" />
              {detailsError && <p role="alert" className="text-xs font-semibold text-rose-200">{detailsError}</p>}
              <div className="flex gap-1">
                <button type="submit" className="min-h-11 px-2 text-xs font-bold text-white cursor-pointer">Save</button>
                <button type="button" onClick={() => { setDetailsError(''); setEditingDetails(false); }} className="min-h-11 px-2 text-xs font-bold text-medical-100 cursor-pointer">Cancel</button>
              </div>
            </form>
          ) : (
            <h3 className="text-lg font-bold tracking-tight">{surgeon.name}</h3>
          )}
          <p className="text-medical-200 text-sm flex items-center gap-1.5 mt-0.5"><Stethoscope size={14} /> {surgeon.specialty}</p>
          {surgeon.demo && <p className="text-xs uppercase tracking-widest text-medical-300 mt-1">Sample · not your hospital</p>}
          {unitOwned && (
            <p className="text-xs uppercase tracking-widest text-medical-300 mt-1">Unit book · revision {surgeon.unitBook.revision}</p>
          )}
          {editable && !editingDetails && (
            <button type="button" onClick={() => { setName(surgeon.name); setPlace(surgeon.facility || ''); setEditingDetails(true); }} className="min-h-11 -ml-1 px-1 text-xs font-bold text-medical-100 cursor-pointer">Edit details</button>
          )}
        </div>
        <button
          type="button"
          aria-expanded={confirming === 'surgeon'}
          onClick={() => setConfirming(confirming === 'surgeon' ? null : 'surgeon')}
          className="tap-icon -mr-2 -mt-2 shrink-0 text-medical-200 hover:text-rose-200 cursor-pointer"
          aria-label={`Delete ${surgeon.name}`}
        >
          <Trash2 size={16} />
        </button>
      </header>
      {confirming === 'surgeon' && (
        <div role="alert" className="px-5 py-2 bg-rose-50 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>Delete {surgeon.name} and every procedure?</span>
          <span className="flex gap-1">
            <button type="button" onClick={() => setConfirming(null)} className="min-h-11 px-3 font-semibold cursor-pointer">Cancel</button>
            <button type="button" onClick={() => onDeleteSurgeon(surgeon.id)} className="min-h-11 px-3 font-bold cursor-pointer">Delete</button>
          </span>
        </div>
      )}

      {row && (
        <div className="px-5 pt-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[row.status]}`}>
            {rowLabel}
          </span>
        </div>
      )}

      {(firstLines.length > 0 || editingFirst) && (
        <div className="px-5 pt-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New to {surgeon.name}</p>
              {editable && !editingFirst && (
                <button type="button" onClick={() => {
                  setFirstDraft([firstLines[0] || '', firstLines[1] || '', firstLines[2] || '']);
                  setEditingFirst(true);
                }} aria-label={`Edit first-case notes for ${surgeon.name}`} className="min-h-11 min-w-11 px-2 -mr-2 text-xs font-bold text-medical-700 cursor-pointer">Edit</button>
              )}
            </div>
            {editingFirst ? (
              <form className="mt-2 space-y-2" onSubmit={(e) => {
                e.preventDefault();
                const next = { ...surgeon, firstCase: firstDraft };
                const hits = findPhiInSurgeon(next);
                if (hits.length) { setPhiNext('Take that detail out, then save.'); setPhi(hits); return; }
                onSaveFirstCase?.(surgeon.id, firstDraft);
                setEditingFirst(false);
              }}>
                {firstDraft.map((line, index) => (
                  <input key={index} value={line} maxLength={140} placeholder={`Line ${index + 1}`} aria-label={`First-case line ${index + 1}`} onChange={e => setFirstDraft(firstDraft.map((item, i) => i === index ? e.target.value : item))} className="w-full min-h-11 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
                ))}
                <div className="flex gap-1 text-xs font-bold">
                  <button type="submit" className="min-h-11 px-2 text-medical-700 cursor-pointer">Save</button>
                  <button type="button" onClick={() => setEditingFirst(false)} className="min-h-11 px-2 text-slate-600 cursor-pointer">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <ul className="mt-1.5 space-y-1">
                  {firstLines.map((line, index) => <li key={index} className="text-sm text-slate-700">• {line}</li>)}
                </ul>
                {updatedLine && <p className="text-xs text-slate-500 mt-1.5">{updatedLine}</p>}
              </>
            )}
          </div>
        </div>
      )}
      {unitOwned && (
        <p className="px-5 pt-3 text-xs text-slate-500">The unit book keeps this surgeon’s name, place, and first-case lines. Use Copy to my notes for a card you can edit.</p>
      )}
      {editable && firstLines.length === 0 && !editingFirst && (
        <div className="px-5 pt-3">
          <button type="button" onClick={() => { setFirstDraft(['', '', '']); setEditingFirst(true); }} className="min-h-11 text-xs font-bold text-medical-700 cursor-pointer">Add first-case notes</button>
        </div>
      )}
      {phi.length > 0 && <PhiPause signals={phi} next={phiNext} onEdit={() => setPhi([])} />}

      {procedures.length === 0 && (
        <p className="px-5 py-6 text-sm text-slate-500">No procedure yet. Add the case the way the board writes it.</p>
      )}

      {procedures.map(procedure => {
        const open = isOpen(procedure.id);
        const options = trustFor ? trustFor(procedure) : { staleDays };
        const state = trustState(procedure, options);
        const suggestion = suggestionFor?.(procedure.id) || null;
        return (
          <div
            key={procedure.id}
            id={`procedure-${procedure.id}`}
            className={`scroll-mt-28 transition-colors ${highlightId === procedure.id ? 'ring-4 ring-inset ring-medical-500 bg-medical-50/60' : ''}`}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`procedure-body-${procedure.id}`}
              onClick={() => toggleOpen(procedure.id)}
              className="w-full min-h-12 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block text-base font-bold text-slate-900 truncate">{procedure.name}{procedure.approach ? ` · ${procedure.approach}` : ''}</span>
                {sourceLabel(procedure) && <span className="block text-xs font-semibold text-medical-700">{sourceLabel(procedure)}</span>}
                {suggestion && <span className="block text-xs font-semibold text-amber-800">Your suggestion is open</span>}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {!surgeon.demo && (
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[state.status]}`}>{SHORT_STATUS[state.status]}</span>
                )}
                <ChevronDown size={18} aria-hidden="true" className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {open && (
              <div id={`procedure-body-${procedure.id}`}>
                <ProcedureGlance procedure={procedure} surgeon={surgeon} {...options} showTitle={false} suggestion={suggestion} onCloseSuggestion={onCloseSuggestion} onCaseView={onCaseView ? () => onCaseView(surgeon, procedure) : null} />
                <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => onCaseView?.(surgeon, procedure)} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">Case view</button>
                  {surgeon.demo ? (
                    <button type="button" onClick={() => onCopySample(surgeon.id)} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">Copy into my book</button>
                  ) : (
                    <>
                      {procedure.unitBook?.id ? (
                        <button type="button" onClick={() => onCopyToNotes(procedure.id)} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">
                          {(trustProcedures || procedures).some(item => item.copiedFrom === procedure.id && !item.unitBook) ? 'Go to my copy' : 'Copy to my notes'}
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => onEdit(procedure)} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">Edit</button>
                          {onDuplicate && (
                            <button type="button" onClick={() => onDuplicate(procedure)} aria-label={`Duplicate ${procedure.name}`} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">Duplicate</button>
                          )}
                        </>
                      )}
                      <button type="button" onClick={() => onConfirm(procedure)} className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 min-h-11 cursor-pointer">I was in this case</button>
                      {procedure.disputed ? (
                        <button type="button" onClick={() => onClearDispute(procedure.id)} className="text-xs font-bold text-rose-700 bg-rose-50 rounded-lg px-3 min-h-11 cursor-pointer">Clear flag</button>
                      ) : (
                        <button type="button" onClick={() => { setFlagReason(''); setFlagging(procedure.id); }} className="text-xs font-bold text-rose-700 bg-rose-50 rounded-lg px-3 min-h-11 cursor-pointer">Flag</button>
                      )}
                      <button type="button" onClick={() => onShare(surgeon, procedure)} className="text-xs font-bold text-slate-600 bg-slate-100 rounded-lg px-3 min-h-11 cursor-pointer inline-flex items-center gap-1"><Share2 size={12} /> Share</button>
                      {onHistory && (
                        <button type="button" onClick={() => onHistory(procedure)} aria-label={`Earlier versions of ${procedure.name}`} className="text-xs font-bold text-slate-600 bg-slate-100 rounded-lg px-3 min-h-11 cursor-pointer inline-flex items-center gap-1"><History size={12} /> Earlier versions</button>
                      )}
                      <button type="button" aria-expanded={confirming === procedure.id} onClick={() => setConfirming(procedure.id)} className="min-h-11 px-2 text-xs font-bold text-slate-600 cursor-pointer">Delete case</button>
                    </>
                  )}
                </div>
                {flagging === procedure.id && (
                  <form
                    className="px-5 py-3 space-y-2 border-t border-rose-100 bg-rose-50/40"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const reason = flagReason.trim();
                      if (!reason) return;
                      const hits = findPhiSignals(reason);
                      if (hits.length) {
                        setPhiNext('Take that detail out, then flag the card.');
                        setPhi(hits);
                        return;
                      }
                      onDispute(procedure, reason);
                      setFlagging(null);
                    }}
                  >
                    <label className="block text-sm font-semibold text-rose-900">
                      What did not match?
                      <textarea required value={flagReason} onChange={e => setFlagReason(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800" />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={!flagReason.trim()} className="min-h-11 px-4 rounded-xl bg-rose-700 text-white text-sm font-bold disabled:opacity-40 cursor-pointer">Flag</button>
                      <button type="button" onClick={() => setFlagging(null)} className="min-h-11 px-4 rounded-xl bg-white border border-rose-200 text-rose-800 text-sm font-bold cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}
                {confirming === procedure.id && (
                  <div role="alert" className="px-5 py-1 text-sm text-rose-800 flex items-center gap-1">
                    <span className="mr-2">Delete this procedure?</span>
                    <button type="button" onClick={() => { setConfirming(null); onDeleteProcedure(procedure.id); }} className="min-h-11 px-3 font-bold cursor-pointer">Delete</button>
                    <button type="button" onClick={() => setConfirming(null)} className="min-h-11 px-3 cursor-pointer">Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!surgeon.demo && (
        <button type="button" onClick={onAddProcedure} className="w-full min-h-12 px-5 py-3 text-sm font-bold text-medical-700 hover:bg-medical-50 cursor-pointer inline-flex items-center justify-center gap-1 border-t border-slate-100">
          <Plus size={14} /> Add procedure
        </button>
      )}
    </article>
  );
}
