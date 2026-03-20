import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { timeAgo } from '../../utils/formatters';

export default function CardHistory({ surgeonName, auditLog }) {
  const [show, setShow] = useState(false);

  const history = auditLog.filter(e => e.surgeonName === surgeonName);
  if (history.length === 0) return null;

  return (
    <div className="border-t border-slate-100">
      <button onClick={() => setShow(h => !h)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer">
        <span className="flex items-center gap-1.5"><Clock size={12} /> History ({history.length})</span>
        {show ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {show && (
        <div className="px-5 pb-4 space-y-1.5">
          {history.slice(0, 15).map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5 py-1.5">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-medical-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600 truncate">{entry.action}</p>
                  <span className="text-[10px] text-slate-300 whitespace-nowrap shrink-0">{timeAgo(entry.timestamp)}</span>
                </div>
                {entry.note && (
                  <div className="mt-0.5 border-l-2 border-medical-200 pl-2">
                    <p className="text-[11px] text-slate-400 italic leading-snug">"{entry.note}"</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-300">by {entry.user}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
