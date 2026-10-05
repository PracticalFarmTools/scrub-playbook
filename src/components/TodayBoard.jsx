import { useState } from 'react';

export default function TodayBoard({ items, canEdit, onAdd }) {
  const [room, setRoom] = useState('');
  const [surgeon, setSurgeon] = useState('');
  const [procedure, setProcedure] = useState('');
  const [time, setTime] = useState('');
  const input = 'rounded-lg bg-white border border-slate-200 text-sm px-2 py-1.5';

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Today</p>
      {items.length === 0 && <p className="text-sm text-slate-400 mb-3">The charge nurse types the board. No patient names.</p>}
      <ul className="space-y-2 mb-3">
        {items.map(item => (
          <li key={item.id} className="text-sm text-slate-800">
            <span className="font-semibold">{item.starts_at ? new Date(item.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
            {' · '}{item.room && `Rm ${item.room} · `}{item.surgeon_name} · {item.procedure_text}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!surgeon.trim() || !procedure.trim()) return;
          onAdd({
            room,
            surgeon_name: surgeon.trim(),
            procedure_text: procedure.trim(),
            starts_at: time ? new Date(`${new Date().toISOString().slice(0, 10)}T${time}`).toISOString() : null,
          });
          setRoom(''); setSurgeon(''); setProcedure(''); setTime('');
        }} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input value={time} onChange={e => setTime(e.target.value)} type="time" className={input} />
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room" className={input} />
          <input value={surgeon} onChange={e => setSurgeon(e.target.value)} placeholder="Surgeon" className={input} />
          <input value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="Procedure" className={`${input} sm:col-span-1`} />
          <button className="rounded-lg bg-medical-600 text-white text-xs font-bold cursor-pointer">Add</button>
        </form>
      )}
    </section>
  );
}
