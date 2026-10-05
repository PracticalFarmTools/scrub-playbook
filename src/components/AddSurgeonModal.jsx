import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SPECIALTIES } from '../data/constants';
import { readTechName } from '../hooks/useBook';

export default function AddSurgeonModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [facility, setFacility] = useState('');
  const [addedBy, setAddedBy] = useState(readTechName);
  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50';
  const label = 'block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

  const save = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), specialty, facility: facility.trim(), addedBy: addedBy.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1 text-medical-200 hover:text-white text-sm cursor-pointer"><ChevronLeft size={18} /> Cancel</button>
          <h2 className="text-white font-bold">New surgeon</h2>
          <button onClick={save} className="text-white text-sm font-bold cursor-pointer">Save</button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <div>
            <label className={label}>Surgeon name</label>
            <input required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Smith" className={input} />
          </div>
          <div>
            <label className={label}>Specialty</label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} className={input}>
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Place</label>
            <input value={facility} onChange={e => setFacility(e.target.value)} placeholder="A label on your private book" className={input} />
          </div>
          <div>
            <label className={label}>Your name</label>
            <input value={addedBy} onChange={e => setAddedBy(e.target.value)} placeholder="How coworkers know you" className={input} />
          </div>
          <p className="text-[11px] text-slate-400">Next you’ll add a procedure. A surgeon without a case is just a name.</p>
          <button className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Save and add a procedure</button>
        </form>
      </div>
    </div>
  );
}
