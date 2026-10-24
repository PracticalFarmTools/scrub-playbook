import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SPECIALTIES } from '../data/constants';
import { readTechName } from '../hooks/useBook';
import { useDialog } from '../hooks/useDialog';

export default function AddSurgeonModal({ onClose, onSave, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [facility, setFacility] = useState('');
  const [addedBy, setAddedBy] = useState(readTechName);
  const dialogRef = useDialog({ onClose });
  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50';
  const label = 'block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5';

  const save = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), specialty, facility: facility.trim(), addedBy: addedBy.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-surgeon-title" className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col focus:outline-none">
        <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-3 py-1 flex items-center justify-between">
          <button type="button" onClick={onClose} className="tap-icon gap-1 px-2 text-medical-100 hover:text-white text-sm cursor-pointer"><ChevronLeft size={18} /> Cancel</button>
          <h2 id="add-surgeon-title" className="text-white font-bold">New surgeon</h2>
          <button type="button" onClick={save} className="tap-icon px-2 text-white text-sm font-bold cursor-pointer">Save</button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="add-surgeon-name" className={label}>Surgeon name</label>
            <input id="add-surgeon-name" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Smith" className={input} />
          </div>
          <div>
            <label htmlFor="add-surgeon-specialty" className={label}>Specialty</label>
            <select id="add-surgeon-specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} className={input}>
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="add-surgeon-place" className={label}>Place</label>
            <input id="add-surgeon-place" value={facility} onChange={e => setFacility(e.target.value)} placeholder="A label on your private book" className={input} />
          </div>
          <div>
            <label htmlFor="add-surgeon-by" className={label}>Your name</label>
            <input id="add-surgeon-by" value={addedBy} onChange={e => setAddedBy(e.target.value)} placeholder="How coworkers know you" className={input} />
          </div>
          <p className="text-xs text-slate-600">Next you’ll add a procedure. A surgeon without a case is just a name.</p>
          <button type="submit" className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Save and add a procedure</button>
        </form>
      </div>
    </div>
  );
}
