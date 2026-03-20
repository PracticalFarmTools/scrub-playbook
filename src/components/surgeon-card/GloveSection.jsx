import { Edit3, Shield, AlertTriangle } from 'lucide-react';
import { SURGICAL_GLOVES } from '../../data/gloves';
import { GLOVE_COLORS } from '../../data/constants';
import { isLatexType } from './helpers';
import InlineGloveEdit from './InlineGloveEdit';

export default function GloveSection({ proc, editing, setEditing, updateProcedure, latexFree }) {
  const gloveIsLatex = latexFree && isLatexType(proc.glove?.type || (SURGICAL_GLOVES.find(g => g.id === proc.glove?.id)?.type));

  return (
    <div className="px-5 py-4 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🧤 Glove</p>
        {editing !== 'glove' && <button onClick={() => setEditing('glove')} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer"><Edit3 size={13} /></button>}
      </div>
      {editing === 'glove' ? (
        <InlineGloveEdit procedure={proc} onCancel={() => setEditing(null)} onSave={(updates) => updateProcedure(proc.id, updates)} latexFree={latexFree} />
      ) : (
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${gloveIsLatex ? 'bg-red-50 border-2 border-red-300' : 'bg-medical-50 border border-medical-200'}`}>
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: GLOVE_COLORS[proc.glove?.color] || '#94a3b8' }} />
            <span className={`material-name ${gloveIsLatex ? 'text-red-700' : 'text-medical-800'}`}>{proc.glove?.model}</span>
            <span className={`text-sm ${gloveIsLatex ? 'text-red-400' : 'text-medical-500'}`}>·</span>
            <span className={`material-name ${gloveIsLatex ? 'text-red-600' : 'text-medical-700'}`}>Size {proc.glove?.size}</span>
          </div>
          {/* ⚠️ Latex Warning */}
          {gloveIsLatex && (
            <div className="latex-warning-pill">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <span className="text-xs font-black text-red-600 uppercase tracking-wider">Contains Latex</span>
              <span className="text-xs text-red-500">— swap to a latex-free glove</span>
            </div>
          )}
          {proc.doubleGlove && proc.underGlove && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Shield size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-600 uppercase">Double-Gloved</span>
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                <span className="font-bold text-amber-800 text-xs">Over:</span>
                <span className="material-name text-amber-700">{proc.glove?.model} · {proc.glove?.size}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-full px-3 py-1.5">
                <span className="font-bold text-slate-600 text-xs">Under:</span>
                <span className="material-name text-slate-500">{proc.underGlove.model} · {proc.underGlove.size}</span>
              </span>
            </div>
          )}
          {/* Draping Gloves Instruction */}
          {proc.requiresDrapingGloves && proc.drapingGloveId && (() => {
            const dg = SURGICAL_GLOVES.find(g => g.id === proc.drapingGloveId);
            return dg ? (
              <div className="draping-callout">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">🧤 Draping Layer</p>
                <p className="material-name text-amber-900">
                  {dg.model} <span className="text-amber-600">→</span> Change to Procedure Layer
                </p>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
