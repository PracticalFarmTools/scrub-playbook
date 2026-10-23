import { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { findPhiSignals } from '../data/phi';
import { boardProblemText, parseBoard } from '../data/boardMatch';
import { loadToday, localDay, resolveTodayTap, saveToday, todayItem, visibleDay } from '../data/today';
import { sourceLabel } from '../data/unitBook';
import PhiPause from './PhiPause';

const field = 'w-full rounded-lg bg-slate-50 border border-slate-200 text-sm px-2 py-2';

export default function TodayList({ book, onOpen, onOpenAll, onPrintAll, onStartProcedure, onStartSurgeon }) {
  const [stored, setStored] = useState(loadToday);
  const [today, setToday] = useState(localDay);
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState({ startsAt: '', room: '', surgeonName: '', procedureName: '' });
  const [editing, setEditing] = useState(null);
  const [phi, setPhi] = useState([]);
  const [choice, setChoice] = useState(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteLines, setPasteLines] = useState(null);
  const activeDay = localDay(offset);
  const items = visibleDay(stored, activeDay);
  const ready = items
    .map(item => ({ item, result: resolveTodayTap(book, item) }))
    .filter(entry => entry.result.action === 'open')
    .map(entry => ({ item: entry.item, procedure: entry.result.procedure }));

  useEffect(() => {
    saveToday(stored);
  }, [stored]);

  useEffect(() => {
    const timer = setInterval(() => setToday(localDay()), 60000);
    return () => clearInterval(timer);
  }, []);

  const keepCurrent = (items) => items.filter(item => item.day >= today);

  const addItem = (event) => {
    event.preventDefault();
    const hits = findPhiSignals([draft.room, draft.surgeonName, draft.procedureName].join('\n'));
    if (hits.length) {
      setPhi(hits);
      return;
    }
    const item = todayItem({ ...draft, day: activeDay });
    setStored(prev => ({ v: 2, items: [...keepCurrent(prev.items || []), item] }));
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
      v: 2,
      items: keepCurrent(prev.items || []).map(item => item.id === editing.id
        ? { ...item, ...todayItem({ ...editing, day: item.day }), id: item.id, day: item.day }
        : item),
    }));
    setEditing(null);
  };

  const readBoard = () => {
    setPasteLines(parseBoard(pasteText, (book?.surgeons || []).filter(surgeon => !surgeon.demo && !surgeon.archived)));
  };
  const usableLines = (pasteLines || []).filter(line => line.problems.length === 0);
  const closePaste = () => {
    setPasting(false);
    setPasteText('');
    setPasteLines(null);
  };
  const addPasted = () => {
    const added = usableLines.map(line => todayItem({ ...line.item, day: activeDay }));
    setStored(prev => ({ v: 2, items: [...keepCurrent(prev.items || []), ...added] }));
    closePaste();
  };
  const lineStatus = (item) => {
    const result = resolveTodayTap(book, item);
    if (result.action === 'open') return `Opens ${result.procedure.name}`;
    if (result.action === 'choose') return 'You choose the card';
    return 'No card yet';
  };

  const removeItem = (id) => {
    setStored(prev => ({ v: 2, items: keepCurrent(prev.items || []).filter(item => item.id !== id) }));
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
        <div className="flex gap-2">
          <button type="button" onClick={() => setOffset(0)} className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${offset === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Today</button>
          <button type="button" onClick={() => setOffset(1)} className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${offset === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Tomorrow</button>
          <button type="button" aria-expanded={pasting} onClick={() => (pasting ? closePaste() : setPasting(true))} className="ml-auto px-3 py-1 rounded-full text-xs font-bold cursor-pointer bg-medical-50 text-medical-700">Paste the board</button>
        </div>
        {pasting && (
          <div className="mt-3 space-y-2">
            <label htmlFor="paste-board" className="block text-xs font-semibold text-slate-700">
              Paste time, room, surgeon, and procedure, one case per line. Leave out patient names and numbers. Lines that look like they carry a patient detail are left out.
            </label>
            <textarea
              id="paste-board"
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteLines(null); }}
              rows={4}
              placeholder={'07:30  OR 4  Chen  R TKA\n09:15  OR 4  Chen  L TKA'}
              className={`${field} font-mono`}
            />
            {!pasteLines && (
              <button type="button" onClick={readBoard} disabled={!pasteText.trim()} className="min-h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40 cursor-pointer">Read the lines</button>
            )}
            {pasteLines && (
              <>
                <ul className="space-y-1" aria-label="Lines read from the board">
                  {pasteLines.map((line, index) => (
                    <li key={index} className={`rounded-lg px-3 py-2 text-sm ${line.problems.length ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-800'}`}>
                      {line.problems.length ? (
                        <>
                          Line {index + 1}: {boardProblemText(line.problems)}
                          {!line.problems.includes('phi') && !line.problems.includes('patient') && <span className="block text-xs opacity-80">{line.line}</span>}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{[line.item.startsAt, line.item.room && `Rm ${line.item.room}`, line.item.surgeonName, line.item.procedureName].filter(Boolean).join(' · ')}</span>
                          <span className="block text-xs text-slate-600">{lineStatus(line.item)}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={addPasted} disabled={!usableLines.length} className="min-h-11 px-4 rounded-xl bg-medical-600 text-white text-sm font-bold disabled:opacity-40 cursor-pointer">
                    Add {usableLines.length} {usableLines.length === 1 ? 'line' : 'lines'} to {offset === 0 ? 'today' : 'tomorrow'}
                  </button>
                  <button type="button" onClick={closePaste} className="min-h-11 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer">Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
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
      {ready.length > 0 && (onOpenAll || onPrintAll) && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-slate-100">
          {ready.length > 1 && onOpenAll && (
            <button type="button" onClick={() => onOpenAll(ready)} className="min-h-11 px-4 rounded-xl bg-medical-600 text-white text-sm font-bold cursor-pointer">Open all {ready.length} cases</button>
          )}
          {onPrintAll && (
            <button type="button" onClick={() => onPrintAll(ready)} className="min-h-11 px-4 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold cursor-pointer">Print the day</button>
          )}
          {ready.length < items.length && (
            <p className="text-xs text-slate-600 self-center">{items.length - ready.length} not matched to one card yet. Tap {items.length - ready.length === 1 ? 'it' : 'each'} to choose.</p>
          )}
        </div>
      )}
      {choice?.surgeons && !choice.procedures && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500">Which surgeon?</p>
          {choice.surgeons.map(surgeon => (
            <button type="button" key={surgeon.id} onClick={() => pickSurgeon(surgeon)} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
              {[surgeon.name, surgeon.specialty, surgeon.facility, surgeon.unitBook?.id ? 'Unit book' : ''].filter(Boolean).join(' · ')}
            </button>
          ))}
          <button type="button" onClick={() => setChoice(null)} className="text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
        </div>
      )}
      {choice?.procedures && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500">
            {choice.closest ? 'Closest cards. Check the side and the procedure before you open one.' : 'Which procedure?'}
          </p>
          {choice.procedures.map(procedure => (
            <button type="button" key={procedure.id} onClick={() => { setChoice(null); onOpen(procedure); }} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
              {[procedure.name, procedure.approach, sourceLabel(procedure)].filter(Boolean).join(' · ')}
            </button>
          ))}
          {choice.closest && choice.item && (
            <button type="button" onClick={() => { const { item } = choice; setChoice(null); onStartProcedure(choice.surgeons[0], item.procedureName); }} className="block w-full text-left text-sm font-semibold rounded-lg bg-white border border-slate-200 px-3 py-2 cursor-pointer">
              None of these. Start a card for {choice.item.procedureName}
            </button>
          )}
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
      {phi.length > 0 && <PhiPause signals={phi} next="Take that detail out, then add the line." onEdit={() => setPhi([])} />}
    </section>
  );
}
