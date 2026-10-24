import { useState } from 'react';
import { X } from 'lucide-react';
import { countLine, placeKey } from '../data/places';
import { STALE_DAY_CHOICES, cleanSettings } from '../data/unitBook';
import { useDialog } from '../hooks/useDialog';

function groupsFor(book, archived) {
  const surgeons = (book?.surgeons || []).filter(surgeon => !surgeon.demo && Boolean(surgeon.archived) === archived);
  const byPlace = new Map();
  surgeons.forEach(surgeon => {
    const place = placeKey(surgeon);
    if (!byPlace.has(place)) byPlace.set(place, []);
    byPlace.get(place).push(surgeon);
  });
  return [...byPlace.entries()]
    .map(([place, list]) => ({
      place,
      archived,
      label: place || 'No place',
      surgeons: list,
      procedures: (book.procedures || []).filter(procedure => !procedure.demo && list.some(surgeon => surgeon.id === procedure.surgeonId)),
    }))
    .sort((a, b) => {
      if (!a.place) return 1;
      if (!b.place) return -1;
      return a.label.localeCompare(b.label);
    });
}

const primary = 'text-xs font-bold text-white bg-medical-600 rounded-lg px-3 min-h-11 cursor-pointer';
const secondary = 'text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer';
const plain = 'text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-3 min-h-11 cursor-pointer';
const danger = 'text-xs font-bold text-rose-700 bg-rose-50 rounded-lg px-3 min-h-11 cursor-pointer';

function UnitRules({ place, entry, onSettings, onHandOverPublishing, onReplaceKey, run }) {
  const settings = cleanSettings(entry?.settings);
  const [replacing, setReplacing] = useState(false);
  const change = (patch) => onSettings(place, { ...settings, ...patch });
  const id = `unit-rules-${place.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <details className="rounded-lg bg-slate-50 px-3">
      <summary className="text-xs font-bold text-slate-700 cursor-pointer min-h-11 flex items-center">
        Unit rules{entry?.revision ? ` · published revision ${entry.revision}` : ''}
      </summary>
      <div className="space-y-3 pb-3">
        <label htmlFor={`${id}-stale`} className="block text-xs font-semibold text-slate-700">
          A confirmation goes stale after
          <select
            id={`${id}-stale`}
            value={settings.staleDays}
            onChange={e => change({ staleDays: Number(e.target.value) })}
            className="mt-1 block w-full min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          >
            {STALE_DAY_CHOICES.map(days => <option key={days} value={days}>{days} days</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 min-h-11 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={settings.dictation} onChange={e => change({ dictation: e.target.checked })} className="w-5 h-5 shrink-0" />
          Allow dictation in the editor
        </label>
        <label className="flex items-center gap-2 min-h-11 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={settings.twoPerson} onChange={e => change({ twoPerson: e.target.checked })} className="w-5 h-5 shrink-0" />
          Two different people confirm a card before it shows as matched
        </label>
        <p className="text-xs text-slate-600">These rules apply on this phone now and go out with the next revision you publish.</p>
        {entry?.fingerprint && <p className="text-xs text-slate-600">Publisher key {entry.fingerprint}</p>}
        {entry?.privateKey && (
          <>
            <button type="button" onClick={() => run(() => onHandOverPublishing(place))} className={plain}>Hand over publishing</button>
            <p className="text-xs text-slate-600">
              Makes one file for the person who publishes {place} next. It publishes a final revision from this phone, then this phone stops publishing. Send it only to that person.
            </p>
          </>
        )}
        {entry?.unitBookId && onReplaceKey && !replacing && (
          <button type="button" onClick={() => setReplacing(true)} className={danger}>Replace the publishing key</button>
        )}
        {entry?.unitBookId && onReplaceKey && replacing && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900 space-y-2">
            <p>Use this only if the key may have reached someone else, such as a hand-over file or a backup sent to the wrong person, or if this phone lost the key.</p>
            <p>Your next publish starts a new unit book for {place} under a new key. Each staff phone is asked to switch to it, and after switching it refuses the old unit book.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setReplacing(false); run(() => onReplaceKey(place)); }} className={danger}>Replace the key</button>
              <button type="button" onClick={() => setReplacing(false)} className={plain}>Keep the key</button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

export default function PlacesSheet({ book, published = {}, onClose, onHandOff, onArchive, onDelete, onPublish, onSettings, onHandOverPublishing, onReplaceKey }) {
  const groups = groupsFor(book, false);
  const archived = groupsFor(book, true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [message, setMessage] = useState('');
  const dialogRef = useDialog({ onClose });
  const run = async (action) => {
    setMessage('');
    const result = await action();
    if (result?.message) setMessage(result.message);
  };

  const renderGroup = (group) => {
    const pending = pendingDelete && pendingDelete.place === group.place && pendingDelete.archived === group.archived;
    return (
      <section key={`${group.archived ? 'archived' : 'active'}-${group.label}`} className="rounded-xl border border-slate-200 p-4 space-y-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">{group.label}</h2>
          <p className="text-xs text-slate-500">{countLine(group.surgeons.length, group.procedures.length)}</p>
          {!group.place && <p className="text-xs text-slate-500 mt-1">Give these surgeons a place to hand them off.</p>}
          {!group.archived && (
            <p className="text-xs text-slate-500 mt-2">Leaving {group.label}? Hand off your notes to whoever comes next, then archive or delete them. Check your contract and the facility’s policy on keeping notes.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {group.place && (
            <button type="button" onClick={() => run(() => onHandOff(group.place, { archived: group.archived }))} className={group.archived ? secondary : primary}>Hand off</button>
          )}
          {group.place && !group.archived && (
            <button type="button" onClick={() => run(() => onPublish(group.place))} className={secondary}>Publish as unit book</button>
          )}
          {group.archived ? (
            <button type="button" onClick={() => onArchive(group.place, false)} className={plain}>Restore</button>
          ) : (
            <button type="button" onClick={() => onArchive(group.place, true)} className={plain}>Archive</button>
          )}
          <button type="button" onClick={() => setPendingDelete({ place: group.place, archived: group.archived })} className={danger}>Delete</button>
        </div>
        {group.place && !group.archived && onSettings && (
          <UnitRules place={group.place} entry={published[group.place]} onSettings={onSettings} onHandOverPublishing={onHandOverPublishing} onReplaceKey={onReplaceKey} run={run} />
        )}
        {pending && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 space-y-2">
            <p>Delete {countLine(group.surgeons.length, group.procedures.length, ' and ')}{group.archived ? ' archived' : ''} at {group.label}? Hand them off first if someone needs them.</p>
            <div className="flex gap-3 font-bold">
              <button type="button" onClick={() => { onDelete(group.place, { archived: group.archived }); setPendingDelete(null); }} className="min-h-11 px-2 cursor-pointer">Delete</button>
              <button type="button" onClick={() => setPendingDelete(null)} className="min-h-11 px-2 cursor-pointer">Cancel</button>
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Places" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col focus:outline-none">
        <div className="flex items-center justify-between px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm">Places</p>
          <button type="button" onClick={onClose} className="tap-icon text-medical-100 hover:text-white cursor-pointer" aria-label="Close places"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {message && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{message}</p>}
          {groups.length === 0 && archived.length === 0 && <p className="text-sm text-slate-500">No places yet. Add a place when you edit a surgeon.</p>}
          {groups.map(renderGroup)}
          {archived.length > 0 && <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 pt-2">Archived</h2>}
          {archived.map(renderGroup)}
        </div>
      </div>
    </div>
  );
}
