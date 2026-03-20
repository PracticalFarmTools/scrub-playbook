import { Edit3 } from 'lucide-react';
import { getSimilarNeedles } from '../../data/needles';
import InlineSutureEdit from './InlineSutureEdit';

export default function SutureSection({ proc, editing, setEditing, updateProcedure }) {
  const toggleSutureStatus = (idx) => {
    const sutures = proc.sutures.map((s, i) =>
      i === idx ? { ...s, itemStatus: s.itemStatus === 'OPEN' ? 'HOLD' : 'OPEN' } : s
    );
    updateProcedure(proc.id, { sutures });
  };

  return (
    <div className="px-5 py-4 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🧵 Sutures</p>
        {editing !== 'sutures' && <button onClick={() => setEditing('sutures')} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer"><Edit3 size={13} /></button>}
      </div>
      {editing === 'sutures' ? (
        <InlineSutureEdit procedure={proc} onCancel={() => setEditing(null)} onSave={(updates) => updateProcedure(proc.id, updates)} />
      ) : proc.sutures?.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {proc.sutures.map((s, i) => {
              const isOpen = s.itemStatus === 'OPEN';
              return (
                <div key={i} className={`suture-pill relative rounded-full shadow-sm transition-all ${isOpen ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2"
                    style={{ backgroundColor: s.color, color: s.textColor, borderRadius: 'inherit' }}>
                    <span className="needle-label">{s.size}</span>
                    <span className="material-name">{s.name}</span>
                    {s.needle && <span className="needle-label opacity-80">· {s.needle}</span>}
                  </span>
                  <button onClick={() => toggleSutureStatus(i)}
                    className={`absolute -top-1 -right-1 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full cursor-pointer transition-all shadow-sm border ${
                      isOpen
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300'
                    }`} title={isOpen ? 'Set HOLD' : 'Set OPEN'}>
                    {isOpen ? 'OPEN' : 'HOLD'}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Needle equivalency labels */}
          {proc.sutures.filter(s => s.needle).map((s, i) => {
            const similar = getSimilarNeedles(s.needle);
            if (!similar.equivalents) return null;
            return (
              <div key={`eq-${i}`} className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-400 uppercase">Alt for <span className="needle-label">{s.needle}</span>:</span>
                <span className="needle-label text-medical-600">{similar.equivalents}</span>
              </div>
            );
          })}
        </div>
      ) : <p className="text-sm text-slate-300 italic">No sutures — tap edit to add</p>}
    </div>
  );
}
