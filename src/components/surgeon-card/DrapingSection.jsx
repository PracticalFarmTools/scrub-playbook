import { useState, useMemo } from 'react';
import { Edit3, AlertTriangle, Check } from 'lucide-react';
import { resolveTokens } from '../../utils/mirrorLogic';
import InlineDrapingEdit from './InlineDrapingEdit';

export default function DrapingSection({ proc, editing, setEditing, updateProcedure, opSide }) {
  const draping = proc.draping;
  const hasDraping = draping && draping.drapeType;

  // Track completed steps locally per card — persists via proc.draping.completedSteps
  const completed = useMemo(() => new Set(draping?.completedSteps || []), [draping?.completedSteps]);
  const allDone = hasDraping && draping.sequence?.length > 0 && draping.sequence.every((_, i) => completed.has(i));

  const toggleStep = (stepIdx) => {
    const next = new Set(completed);
    if (next.has(stepIdx)) next.delete(stepIdx);
    else next.add(stepIdx);
    updateProcedure(proc.id, {
      draping: { ...draping, completedSteps: Array.from(next) },
    });
  };

  return (
    <div className="px-5 py-3 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🩹 Prep / Draping</p>
        {editing !== 'draping' && (
          <button onClick={() => setEditing('draping')} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer">
            <Edit3 size={13} />
          </button>
        )}
      </div>

      {editing === 'draping' ? (
        <InlineDrapingEdit
          procedure={proc}
          onCancel={() => setEditing(null)}
          onSave={(updates) => updateProcedure(proc.id, updates)}
        />
      ) : hasDraping ? (
        <div className="space-y-3">
          {/* Glove Peel Alert — shown when toggle is on OR all steps completed */}
          {(draping.postDrapeGloveChange || allDone) && allDone && (
            <div className="glove-peel-alert flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border-2 border-amber-400 animate-pulse-subtle">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm font-extrabold text-amber-700 uppercase tracking-wide">
                ⚠️ Peel Outer Gloves Now
              </p>
            </div>
          )}

          {/* Static alert when toggle on but steps not all done */}
          {draping.postDrapeGloveChange && !allDone && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-600 uppercase">
                Glove change required after draping
              </p>
            </div>
          )}

          {/* Drape Type Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5">
            <span className="text-sm font-semibold text-indigo-700">{draping.drapeType}</span>
            {allDone && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase">Done</span>}
          </div>

          {/* Interactive Stepper */}
          {draping.sequence?.length > 0 && (
            <div className="space-y-0">
              {draping.sequence.map((step, i) => {
                const isDone = completed.has(i);
                return (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="flex flex-col items-center">
                      <button onClick={() => toggleStep(i)}
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm shrink-0 cursor-pointer transition-all active:scale-90 ${
                          isDone
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                            : 'bg-medical-600 text-white hover:bg-medical-700'
                        }`} title={isDone ? 'Mark incomplete' : 'Mark complete'}>
                        {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </button>
                      {i < draping.sequence.length - 1 && (
                        <div className={`w-0.5 h-5 transition-colors ${isDone ? 'bg-emerald-300' : 'bg-medical-200'}`} />
                      )}
                    </div>
                    <p className={`text-sm font-medium pt-1 transition-colors ${isDone ? 'text-emerald-600 line-through' : 'text-slate-700'}`}>
                      {resolveTokens(step, opSide)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-300 italic">No draping set — tap edit to configure</p>
      )}
    </div>
  );
}
