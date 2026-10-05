import { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { findPhiSignals } from '../data/phi';
import { emptyToday, loadToday, localDay, resolveTodayTap, saveToday, todayItem, visibleToday } from '../data/today';
import PhiPause from './PhiPause';

const field = 'w-full rounded-lg bg-slate-50 border border-slate-200 text-sm px-2 py-2';

export default function TodayList({ book, onOpen, onStartProcedure, onStartSurgeon }) {
  const [stored, setStored] = useState(loadToday);
  const [clockDay, setClockDay] = useState(localDay);
  const [draft, setDraft] = useState({ startsAt: '', room: '', surgeonName: '', procedureName: '' });
  const [editing, setEditing] = useState(null);
  const [phi, setPhi] = useState([]);
  const [choice, setChoice] = useState(null);
  const items = visibleToday(stored, clockDay);

  useEffect(() => {
    saveToday(stored);
  }, [stored]);

  useEffect(() => {
    const timer = setInterval(() => setClockDay(localDay()), 60000);
    return () => clearInterval(timer);
  }, []);

  const baseForToday = (prev) => (prev.day === localDay() ? prev : emptyToday());

  const addItem = (event) => {
    event.preventDefault();
    const hits = findPhiSignals([draft.room, draft.surgeonName, draft.procedureName].join('\n'));
    if (hits.length) {
      setPhi(hits);
      return;
    }
    const item = todayItem(draft);
    setStored(prev => {
      const base = baseForToday(prev);
      return { day: localDay(), items: [...base.items, item] };
    });
    setDraft({ startsAt: '', room: '', surgeonName: '', procedureName: '' });
  };

  const saveEdit = (event) => {
    event.preventDefault();
    const hits = findPhiSignals([editing.room, editing.surgeonName, editing.procedureName].join('\n'));
    if (hits.length) {
      setPhi(hits);
      return;
    }
    setStored(prev => ({
      ...baseForToday(prev),
      items: baseForToday(prev).items.map(item => item.id === editing.id ? { ...item, ...todayItem(editing), id: item.id } : item),
    }));
    setEditing(null);
  };

  const removeItem = (id) => {
    setStored(prev => {
      const base = baseForToday(prev);
      return { day: localDay(), items: base.items.filter(item => item.id !== id) };
    });
  };

  const follow = (result) => {
    if (result.action === 'open') onOpen(result.procedure);
    else if (result.action === 'start-procedure') onStartProcedure(result.surgeon, result.procedureName);
    else if (result.action === 'start-surgeon') onStartSurgeon(result.surgeonName, result.procedureName);
    else setChoice({ item: choice?.item, ...result });
  };

  const tap = (item) => {
    const result = resolveTodayTap(book, item);
    if (result.action === 'choose') setChoice({ item, ...result });
    else {
      setChoice(null);
      follow(result);
    }
  };

  const pickSurgeon = (surgeon) => {
    const result = resolveTodayTap({ surgeons: [surgeon], procedures: book.procedures }, choice.item);
    if (result.action === 'choose') setChoice({ item: choice.item, ...result });
    else {
      setChoice(null);
      follow(result);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
      <div className="px-4 py-3">
        <h2 className="text-sm font-extrabold text-slate-800">Today</h2>
        {items.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">Add the board: time, room, surgeon, procedure.</p>
        )}
      </div>
      {items.length > 0 && (
        <ul>
          {items.map(item => (
            <li key={item.id} className="border-t border-slate-100">
              {editing?.id === item.id ? (
                <form onSubmit={saveEdit} className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3">
                  <input type="time" required value={editing.startsAt} onChange={e => setEditing({ ...editing, startsAt: e.target.value })} className={field} aria-label="Time" />
                  <input required value={editing.room} onChange={e => setEditing({ ...editing, room: e.target.value })} className={field} aria-label="Room" />
                  <input required value={editing.surgeonName} onChange={e => setEditing({ ...editing, surgeonName: e.target.value })} className={field} aria-label="Surgeon" />
                  <input required value={editing.procedureName} onChange={e => setEditing({ ...editing, procedureName: e.target.value })} className={field} aria-label="Procedure" />
                  <span className="flex gap-2">
                    <button type="submit" className="flex-1 rounded-lg bg-medical-600 text-white text-xs font-bold cursor-pointer">Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-slate-100 text-xs font-bold cursor-pointer">Cancel</button>
                  </span>
                </form>
              ) : (
                <div className="flex items-center gap-1 px-3 py-2">
                  <button type="button" onClick={() => tap(item)} className="flex-1 text-left text-sm font-semibold text-slate-800 cursor-pointer py-1">
                    {[item.startsAt, item.room && `Rm ${item.room}`, item.surgeonName, item.procedureName].filter(Boolean).join(' · ')}
                  </button>
                  <button type="button" aria-label={`Edit ${item.surgeonName}`} onClick={() => setEditing({ ...item })} className="p-2 text-slate-400 cursor-pointer"><Pencil size={14} /></button>
                  <button type="button" aria-label={`Remove ${item.surgeonName}`} onClick={() => removeItem(item.id)} className="p-2 text-slate-400 cursor-pointer"><X size={14} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {choice?.surgeons && !choice.procedures && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500">Which surgeon?</p>
          {choice.surgeons.map(surgeon => (
            <button type="button" key={surgeon.id} onClick={() => pickSurgeon(surgeon)} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
              {surgeon.name} · {surgeon.specialty}
            </button>
          ))}
          <button type="button" onClick={() => setChoice(null)} className="text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
        </div>
      )}
      {choice?.procedures && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500">Which procedure?</p>
          {choice.procedures.map(procedure => (
            <button type="button" key={procedure.id} onClick={() => { setChoice(null); onOpen(procedure); }} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
              {procedure.name}
            </button>
          ))}
          <button type="button" onClick={() => setChoice(null)} className="text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
        </div>
      )}
      <form onSubmit={addItem} className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 border-t border-slate-100">
        <input type="time" required value={draft.startsAt} onChange={e => setDraft({ ...draft, startsAt: e.target.value })} className={field} aria-label="Time" />
        <input required value={draft.room} onChange={e => setDraft({ ...draft, room: e.target.value })} placeholder="Room" className={field} aria-label="Room" />
        <input required value={draft.surgeonName} onChange={e => setDraft({ ...draft, surgeonName: e.target.value })} placeholder="Surgeon" className={field} aria-label="Surgeon" />
        <input required value={draft.procedureName} onChange={e => setDraft({ ...draft, procedureName: e.target.value })} placeholder="Procedure" className={field} aria-label="Procedure" />
        <button type="submit" className="col-span-2 sm:col-span-1 rounded-lg bg-slate-900 text-white text-sm font-bold cursor-pointer">Add</button>
      </form>
      {phi.length > 0 && <PhiPause signals={phi} onEdit={() => setPhi([])} />}
    </section>
  );
}
