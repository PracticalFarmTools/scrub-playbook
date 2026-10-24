import { useState } from 'react';
import { History, X } from 'lucide-react';
import { VERSIONS_PER_CARD, asEarlier, cardVersions, replacedText, versionTime } from '../data/history';
import { sameContent } from '../data/trust';
import { useDialog } from '../hooks/useDialog';
import ProcedureGlance from './ProcedureGlance';

/**
 * @param {{
 *   surgeon: import('../data/types').Surgeon,
 *   procedure: import('../data/types').Procedure,
 *   history: import('../data/history').History | null,
 *   onRestore: (version: import('../data/history').CardVersion) => void,
 *   onForget: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function CardHistorySheet({ surgeon, procedure, history, onRestore, onForget, onClose }) {
  const dialogRef = useDialog({ onClose });
  const [viewing, setViewing] = useState(/** @type {string | null} */ (null));
  const [restoring, setRestoring] = useState(/** @type {string | null} */ (null));
  const [clearing, setClearing] = useState(false);
  const versions = history ? cardVersions(history, procedure) : [];
  const fromUnit = Boolean(procedure.unitBook?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="history-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90dvh] flex flex-col focus:outline-none">
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <div className="min-w-0">
            <p id="history-title" className="text-white font-bold text-sm flex items-center gap-2"><History size={16} /> Earlier versions</p>
            <p className="text-medical-100 text-xs truncate">{surgeon.name} · {procedure.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-icon text-medical-100 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          <p className="text-sm text-slate-600">
            The last {VERSIONS_PER_CARD} versions of this card stay on this phone. They are not shared, published, or put in backups.
          </p>
          {fromUnit && (
            <p className="text-sm text-slate-600">
              The unit book decides this card, so its earlier versions are here to read. Use Copy to my notes for a card you can change.
            </p>
          )}
          {!history && <p role="status" className="text-sm text-slate-500">Reading earlier versions…</p>}
          {history && versions.length === 0 && (
            <p className="text-sm text-slate-500">No earlier versions yet. When this card changes, the version it replaced shows here.</p>
          )}
          {versions.length > 0 && (
            <ol className="space-y-3">
              {versions.map((version, index) => {
                const saved = versionTime(version.savedAt);
                const same = sameContent(version.procedure, procedure);
                const label = `version ${index + 1}`;
                return (
                  <li key={version.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2.5 space-y-1">
                      <p className="text-sm font-bold text-slate-900">{saved ? `Saved ${saved}` : 'Saved before this phone kept dates'}</p>
                      <p className="text-xs text-slate-600">Replaced {versionTime(version.replacedAt)} by {replacedText(version)}.</p>
                      {version.changes.length > 0 && (
                        <p className="text-xs text-slate-600">Changed after it: {version.changes.join(', ')}.</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          aria-expanded={viewing === version.id}
                          aria-label={`${viewing === version.id ? 'Hide' : 'View'} earlier ${label}`}
                          onClick={() => setViewing(viewing === version.id ? null : version.id)}
                          className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer"
                        >
                          {viewing === version.id ? 'Hide' : 'View'}
                        </button>
                        {!fromUnit && !same && (
                          <button
                            type="button"
                            aria-expanded={restoring === version.id}
                            aria-label={`Bring back earlier ${label}`}
                            onClick={() => setRestoring(restoring === version.id ? null : version.id)}
                            className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-3 min-h-11 cursor-pointer"
                          >
                            Bring back
                          </button>
                        )}
                        {same && <span className="self-center text-xs font-semibold text-slate-500">Same as the current card</span>}
                      </div>
                    </div>
                    {restoring === version.id && (
                      <div role="alert" className="px-3 py-2.5 bg-amber-50 border-t border-amber-100 text-sm text-amber-900 space-y-2">
                        <p>The current card becomes an earlier version, so you can switch back. The card is unconfirmed until someone is in that case again.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => onRestore(version)} className="min-h-11 px-4 rounded-xl bg-amber-700 text-white text-sm font-bold cursor-pointer">Bring this version back</button>
                          <button type="button" onClick={() => setRestoring(null)} className="min-h-11 px-4 rounded-xl bg-white border border-amber-200 text-amber-900 text-sm font-bold cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    )}
                    {viewing === version.id && (
                      <div className="border-t border-slate-100">
                        <p className="px-3 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">Earlier version · not the current card</p>
                        <ProcedureGlance procedure={asEarlier(version.procedure)} surgeon={surgeon} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {versions.length > 0 && (
            clearing ? (
              <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-900 space-y-2">
                <p>Clear {versions.length === 1 ? 'the earlier version' : `all ${versions.length} earlier versions`} of this card from this phone? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onForget} className="min-h-11 px-4 rounded-xl bg-rose-700 text-white text-sm font-bold cursor-pointer">Clear history</button>
                  <button type="button" onClick={() => setClearing(false)} className="min-h-11 px-4 rounded-xl bg-white border border-rose-200 text-rose-800 text-sm font-bold cursor-pointer">Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setClearing(true)} className="min-h-11 text-xs font-bold text-slate-600 cursor-pointer">Clear this card’s history</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
