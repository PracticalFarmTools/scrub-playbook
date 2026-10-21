import { X } from 'lucide-react';

function groupsFor(book) {
  const surgeons = (book?.surgeons || []).filter(surgeon => !surgeon.demo);
  const byPlace = new Map();
  surgeons.forEach(surgeon => {
    const place = (surgeon.facility || '').trim();
    if (!byPlace.has(place)) byPlace.set(place, []);
    byPlace.get(place).push(surgeon);
  });
  return [...byPlace.entries()]
    .map(([place, list]) => ({
      place,
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

export default function PlacesSheet({ book, onClose, onHandOff }) {
  const groups = groupsFor(book);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm">Places</p>
          <button type="button" onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer" aria-label="Close places"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {groups.length === 0 && <p className="text-sm text-slate-500">No places yet. Add a place when you edit a surgeon.</p>}
          {groups.map(group => (
            <section key={group.label} className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">{group.label}</h2>
                <p className="text-xs text-slate-500">{group.surgeons.length} surgeons · {group.procedures.length} procedures</p>
                {!group.place && <p className="text-xs text-slate-500 mt-1">Give these surgeons a place to hand them off.</p>}
              </div>
              {group.place && (
                <button type="button" onClick={() => onHandOff(group.place)} className="text-xs font-bold text-white bg-medical-600 rounded-lg px-3 py-2 cursor-pointer">Hand off</button>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
