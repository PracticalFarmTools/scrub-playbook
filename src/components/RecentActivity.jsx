import { useState } from 'react';
import { Clock, FileText, ChevronDown } from 'lucide-react';
import { timeAgo } from '../utils/formatters';

/**
 * Recent Activity feed — collapsible.
 * Shows 3 most recent by default with a "See More" toggle.
 */
const COLLAPSED_COUNT = 3;

export default function RecentActivity({ log }) {
  const [expanded, setExpanded] = useState(false);

  if (!log || log.length === 0) return null;

  const items = expanded ? log : log.slice(0, COLLAPSED_COUNT);
  const hasMore = log.length > COLLAPSED_COUNT;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-medical-600" />
        <p className="text-sm font-bold text-slate-700">Recent Activity</p>
        <span className="text-[10px] text-slate-400 font-medium ml-auto">{log.length} total</span>
      </div>
      <div className="space-y-1">
        {items.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
            {/* Timeline dot */}
            <div className="mt-1.5 w-2 h-2 rounded-full bg-medical-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-slate-700 font-medium truncate">
                  <span className="font-semibold">{entry.action}</span>
                  {entry.surgeonName && (
                    <span className="text-slate-400"> · {entry.surgeonName}</span>
                  )}
                </p>
                <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{timeAgo(entry.timestamp)}</span>
              </div>
              {/* Note quote block */}
              {entry.note && (
                <div className="mt-1 flex items-start gap-1.5">
                  <FileText size={10} className="text-medical-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500 italic leading-snug line-clamp-2">
                    "{entry.note}"
                  </p>
                </div>
              )}
              <p className="text-[10px] text-slate-300 mt-0.5">by {entry.user}</p>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-medical-600 hover:bg-medical-50 transition-all cursor-pointer">
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show Less' : `See ${log.length - COLLAPSED_COUNT} More`}
        </button>
      )}
    </div>
  );
}
