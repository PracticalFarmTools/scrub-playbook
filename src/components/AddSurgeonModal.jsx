import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { SURGICAL_GLOVES } from '../data/gloves';
import { SUTURE_LIBRARY } from '../data/sutures';
import { NEEDLE_LIST } from '../data/needles';
import { SPECIALTIES } from '../data/constants';
import ModalHeader, { ModalFooter } from './add-surgeon/ModalHeader';
import ProcedureForm from './add-surgeon/ProcedureForm';
import AssistForm from './add-surgeon/AssistForm';

function makeProcedure(name = '') {
  return {
    id: crypto.randomUUID(), name,
    gloveId: SURGICAL_GLOVES[0]?.id || '', gloveSize: '7.0',
    doubleGlove: false, underGloveId: SURGICAL_GLOVES[0]?.id || '', underGloveSize: '7.5',
    gownSize: 'L', gownType: 'Standard',
    drapeType: '', drapingSequence: [], postDrapeGloveChange: false,
    sutures: [], equipment: '', tips: '', nicknames: [],
  };
}

export default function AddSurgeonModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', specialty: SPECIALTIES[0], addedBy: '', assists: [] });
  const [procedures, setProcedures] = useState([makeProcedure('General')]);
  const [expandedProc, setExpandedProc] = useState(0);
  const [changeNote, setChangeNote] = useState('');
  const [sutureState, setSutureState] = useState({});
  const [nickState, setNickState] = useState({});
  const [assistField, setAssistField] = useState({ name: '', role: 'PA', gloveModel: '', gloveSize: '7.0' });

  const getSutureDraft = (pi) => sutureState[pi] || { material: SUTURE_LIBRARY[0]?.name || '', size: '3-0', needle: NEEDLE_LIST[0]?.name || '' };
  const getNickDraft = (pi) => nickState[pi] || { nickname: '', actual: '' };
  const updateProc = (idx, updates) => setProcedures(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));

  const addSuture = (pi) => {
    const draft = getSutureDraft(pi);
    const found = SUTURE_LIBRARY.find(s => s.name === draft.material);
    if (found) updateProc(pi, { sutures: [...procedures[pi].sutures, { name: found.name, color: found.color, textColor: found.textColor, size: draft.size, needle: draft.needle }] });
  };
  const removeSuture = (pi, si) => updateProc(pi, { sutures: procedures[pi].sutures.filter((_, i) => i !== si) });

  const addAssist = () => {
    if (assistField.name) {
      setForm(f => ({ ...f, assists: [...f.assists, { ...assistField }] }));
      setAssistField({ name: '', role: 'PA', gloveModel: '', gloveSize: '7.0' });
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!form.name.trim() || procedures.length === 0) return;
    const builtProcedures = procedures.map(p => {
      const g = SURGICAL_GLOVES.find(x => x.id === p.gloveId);
      const u = p.doubleGlove ? SURGICAL_GLOVES.find(x => x.id === p.underGloveId) : null;
      return {
        id: p.id, name: p.name,
        glove: { id: p.gloveId, model: g?.model || '', brand: g?.brand || '', color: g?.color || '', size: p.gloveSize },
        doubleGlove: p.doubleGlove,
        underGlove: u ? { id: p.underGloveId, model: u.model, brand: u.brand, color: u.color, size: p.underGloveSize } : null,
        gown: { size: p.gownSize, type: p.gownType },
        draping: { drapeType: p.drapeType || '', sequence: p.drapingSequence || [], postDrapeGloveChange: p.postDrapeGloveChange || false },
        sutures: p.sutures, equipment: p.equipment, tips: p.tips, nicknames: p.nicknames,
      };
    });
    onSave({
      id: crypto.randomUUID(), name: form.name, specialty: form.specialty, addedBy: form.addedBy || 'Kyle',
      assists: form.assists, procedures: builtProcedures, vendorLinks: [],
      createdAt: new Date().toISOString(), changeNote: changeNote.trim() || null,
    });
    onClose();
  };

  const labelClass = "block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";
  const inputClass = "w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50 focus:border-medical-400 transition-all placeholder-slate-400";

  return (
    <div className="fixed inset-0 z-50 slide-over-backdrop" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="slide-over-panel absolute inset-y-0 right-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        <ModalHeader onClose={onClose} onSave={handleSubmit} canSave={!!form.name.trim()} />

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* ── Identity ── */}
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Surgeon Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Smith" className={inputClass} required autoFocus />
              </div>
              <div>
                <label className={labelClass}>Your Name</label>
                <input value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))} placeholder="Added by…" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Specialty</label>
              <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} className={inputClass}>
                {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* ═══ PROCEDURES ═══ */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-medical-700">📋 Procedures</p>
              <button type="button" onClick={() => { setProcedures(prev => [...prev, makeProcedure('')]); setExpandedProc(procedures.length); }}
                className="inline-flex items-center gap-1 text-xs font-bold text-medical-600 hover:text-medical-700 bg-medical-50 border border-medical-200 rounded-lg px-2.5 py-1 transition-all cursor-pointer">
                <Plus size={12} /> Add Procedure
              </button>
            </div>
            {procedures.map((proc, pi) => {
              const isOpen = expandedProc === pi;
              return (
                <div key={proc.id} className="border border-medical-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${isOpen ? 'bg-medical-50' : 'bg-white hover:bg-slate-50'}`}
                    onClick={() => setExpandedProc(isOpen ? -1 : pi)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-medical-500" />
                      {isOpen ? (
                        <input value={proc.name} onChange={e => updateProc(pi, { name: e.target.value })} placeholder="Procedure name…"
                          className="flex-1 bg-transparent text-sm font-bold text-medical-800 border-none focus:outline-none placeholder-slate-400"
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="text-sm font-bold text-medical-800 truncate">{proc.name || 'Untitled'}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {procedures.length > 1 && (
                        <button type="button" onClick={e => { e.stopPropagation(); setProcedures(prev => prev.filter((_, i) => i !== pi)); if (expandedProc >= pi) setExpandedProc(Math.max(0, expandedProc - 1)); }}
                          className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer p-0.5">
                          <Trash2 size={13} />
                        </button>
                      )}
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>
                  {isOpen && (
                    <ProcedureForm proc={proc} procIdx={pi} updateProc={updateProc}
                      getSutureDraft={getSutureDraft} setSutureState={setSutureState}
                      getNickDraft={getNickDraft} setNickState={setNickState}
                      addSuture={addSuture} removeSuture={removeSuture} />
                  )}
                </div>
              );
            })}
          </div>

          <AssistForm assists={form.assists} assistField={assistField} setAssistField={setAssistField} addAssist={addAssist}
            setAssists={(assists) => setForm(f => ({ ...f, assists }))} />

          {/* ── Change Note ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">📝 Change Note</p>
            <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why are you adding this card? (optional)" className={inputClass} />
            <p className="text-[10px] text-slate-400">Only saved to the audit trail if you type something.</p>
          </div>
          <div className="h-6" />
        </form>

        <ModalFooter onSave={handleSubmit} canSave={!!form.name.trim()} />
      </div>
    </div>
  );
}
