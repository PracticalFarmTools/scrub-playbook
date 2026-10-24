import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { DELETED_KEEP_DAYS, DELETED_MAX, asEarlier, removedText, versionTime } from '../data/history';
import { useDialog } from '../hooks/useDialog';
import ProcedureGlance from './ProcedureGlance';

/**
 * @param {{
 *   history: import('../data/history').History | null,
 *   onBringBack: (entry: import('../data/history').CardVersion) => void,
 *   onRemove: (entry: import('../data/history').CardVersion) => void,
 *   onClose: () => void,
 * }} props
 */
export default function DeletedCardsSheet({ history, onBringBack, onRemove, onClose }) {
  const dialogRef = useDialog({ onClose });
  const [viewing, setViewing] = useState(/** @type {string | null} */ (null));
  const [removing, setRemoving] = useState(/** @type {string | null} */ (null));
  const deleted = history?.deleted || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deleted-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90dvh] flex flex-col focus:outline-none">
        <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <p id="deleted-title" className="text-white font-bold text-sm flex items-center gap-2"><Trash2 size={16} /> Recently deleted cards</p>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-icon text-medical-100 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <p className="text-sm text-slate-600">
            Deleted cards stay on this phone for {DELETED_KEEP_DAYS} days, up to {DELETED_MAX} cards. They are not shared or put in backups.
            A card comes back unconfirmed.
          </p>
          {!history && <p role="status" className="text-sm text-slate-500">Reading deleted cards…</p>}
          {history && deleted.length === 0 && <p className="text-sm text-slate-500">No deleted cards.</p>}
          {deleted.length > 0 && (
            <ul className="space-y-3">
              {deleted.map(entry => {
                const title = `${entry.procedure.name} · ${entry.surgeonName || 'Unknown surgeon'}`;
                const fromUnit = Boolean(entry.procedure.unitBook?.id);
                return (
                  <li key={entry.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2.5 space-y-1">
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-600">{removedText(entry)} · {versionTime(entry.replacedAt)}</p>
                      {fromUnit && <p className="text-xs text-slate-600">It comes back as your own notes, not the unit book’s card.</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          aria-expanded={viewing === entry.id}
                          aria-label={`${viewing === entry.id ? 'Hide' : 'View'} ${title}`}
                          onClick={() => setViewing(viewing === entry.id ? null : entry.id)}
                          className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer"
                        >
                          {viewing === entry.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Bring back ${title}`}
                          onClick={() => onBringBack(entry)}
                          className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-3 min-h-11 cursor-pointer"
                        >
                          Bring back
                        </button>
                        <button
                          type="button"
                          aria-expanded={removing === entry.id}
                          aria-label={`Remove ${title} for good`}
                          onClick={() => setRemoving(removing === entry.id ? null : entry.id)}
                          className="min-h-11 px-2 text-xs font-bold text-slate-600 cursor-pointer"
                        >
                          Remove for good
                        </button>
                      </div>
                    </div>
                    {removing === entry.id && (
                      <div role="alert" className="px-3 py-2.5 bg-rose-50 border-t border-rose-100 text-sm text-rose-900 space-y-2">
                        <p>Remove this card and its earlier versions from this phone? This cannot be undone.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setRemoving(null); onRemove(entry); }} className="min-h-11 px-4 rounded-xl bg-rose-700 text-white text-sm font-bold cursor-pointer">Remove</button>
                          <button type="button" onClick={() => setRemoving(null)} className="min-h-11 px-4 rounded-xl bg-white border border-rose-200 text-rose-800 text-sm font-bold cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                    {viewing === entry.id && (
                      <div className="border-t border-slate-100">
                        <p className="px-3 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">Deleted card · not in your book</p>
                        <ProcedureGlance procedure={asEarlier(entry.procedure)} surgeon={entry.surgeon} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
