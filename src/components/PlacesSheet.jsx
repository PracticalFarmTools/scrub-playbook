import { useState } from 'react';
import { X } from 'lucide-react';
import { countLine, placeKey } from '../data/places';

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

const primary = 'text-xs font-bold text-white bg-medical-600 rounded-lg px-3 py-2 cursor-pointer';
const secondary = 'text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 py-2 cursor-pointer';
const plain = 'text-xs font-bold text-slate-700 bg-slate-100 rounded-lg px-3 py-2 cursor-pointer';
const danger = 'text-xs font-bold text-rose-700 bg-rose-50 rounded-lg px-3 py-2 cursor-pointer';

export default function PlacesSheet({ book, onClose, onHandOff, onArchive, onDelete, onPublish }) {
  const groups = groupsFor(book, false);
  const archived = groupsFor(book, true);
  const [pendingDelete, setPendingDelete] = useState(null);

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
            <button type="button" onClick={() => onHandOff(group.place, { archived: group.archived })} className={group.archived ? secondary : primary}>Hand off</button>
          )}
          {group.place && !group.archived && (
            <button type="button" onClick={() => onPublish(group.place)} className={secondary}>Publish as unit book</button>
          )}
          {group.archived ? (
            <button type="button" onClick={() => onArchive(group.place, false)} className={plain}>Restore</button>
          ) : (
            <button type="button" onClick={() => onArchive(group.place, true)} className={plain}>Archive</button>
          )}
          <button type="button" onClick={() => setPendingDelete({ place: group.place, archived: group.archived })} className={danger}>Delete</button>
        </div>
        {pending && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 space-y-2">
            <p>Delete {countLine(group.surgeons.length, group.procedures.length, ' and ')}{group.archived ? ' archived' : ''} at {group.label}? Hand them off first if someone needs them.</p>
            <div className="flex gap-3 font-bold">
              <button type="button" onClick={() => { onDelete(group.place, { archived: group.archived }); setPendingDelete(null); }} className="cursor-pointer">Delete</button>
              <button type="button" onClick={() => setPendingDelete(null)} className="cursor-pointer">Cancel</button>
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div role="dialog" aria-modal="true" aria-label="Places" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm">Places</p>
          <button type="button" onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer" aria-label="Close places"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {groups.length === 0 && archived.length === 0 && <p className="text-sm text-slate-500">No places yet. Add a place when you edit a surgeon.</p>}
          {groups.map(renderGroup)}
          {archived.length > 0 && <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 pt-2">Archived</h2>}
          {archived.map(renderGroup)}
        </div>
      </div>
    </div>
  );
}
