import { useState, useMemo } from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../data/gloves';
import { SUTURE_LIBRARY, SUTURE_SIZES } from '../data/sutures';
import { SURGICAL_NEEDLES, NEEDLE_LIST } from '../data/needles';
import { SPECIALTIES, ASSIST_ROLES, GOWN_SIZES, GOWN_TYPES } from '../data/constants';
import SearchableDropdown from './SearchableDropdown';

// ── Static dropdown options ──
const GLOVE_COLORS_MAP = {
  'Green': '#22c55e', 'Blue': '#3b82f6', 'White': '#e2e8f0',
  'Straw/Tan': '#d4a574', 'Ivory': '#f5f0e8', 'Brown/Green': '#6b7a3d',
  'Dark Brown': '#5c3a1e', 'Cream': '#f5e6c8', 'Straw': '#d4a574',
};

const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  value: g.id,
  label: `${g.model}`,
  sublabel: `${g.brand} · ${g.type} · ${g.alias}`,
  color: GLOVE_COLORS_MAP[g.color] || '#94a3b8',
}));

const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name,
  label: s.name,
  sublabel: `${s.type} · ${s.structure} · ${s.alias}`,
  color: s.color,
}));

function makeProcedure(name = '') {
  return {
    id: crypto.randomUUID(),
    name,
    gloveId: SURGICAL_GLOVES[0]?.id || '',
    gloveSize: '7.0',
    doubleGlove: false,
    underGloveId: SURGICAL_GLOVES[0]?.id || '',
    underGloveSize: '7.5',
    gownSize: 'L',
    gownType: 'Standard',
    sutures: [],
    equipment: '',
    tips: '',
    nicknames: [],
  };
}

export default function AddSurgeonModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', specialty: SPECIALTIES[0], addedBy: '',
    assists: [],
  });

  const [procedures, setProcedures] = useState([makeProcedure('General')]);
  const [expandedProc, setExpandedProc] = useState(0);
  const [changeNote, setChangeNote] = useState('');

  // Per-procedure suture builder
  const [sutureState, setSutureState] = useState({});
  const getSutureDraft = (procIdx) => sutureState[procIdx] || { material: SUTURE_LIBRARY[0]?.name || '', size: '3-0', needle: NEEDLE_LIST[0]?.name || '' };

  // Nickname builder per procedure
  const [nickState, setNickState] = useState({});
  const getNickDraft = (procIdx) => nickState[procIdx] || { nickname: '', actual: '' };

  // Assist builder
  const [assistField, setAssistField] = useState({ name: '', role: 'PA', gloveModel: '', gloveSize: '7.0' });

  const updateProc = (idx, updates) => {
    setProcedures(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const addSuture = (procIdx) => {
    const draft = getSutureDraft(procIdx);
    const found = SUTURE_LIBRARY.find(s => s.name === draft.material);
    if (found) {
      updateProc(procIdx, {
        sutures: [...procedures[procIdx].sutures, { name: found.name, color: found.color, textColor: found.textColor, size: draft.size, needle: draft.needle }],
      });
    }
  };

  const removeSuture = (procIdx, sutIdx) => {
    updateProc(procIdx, { sutures: procedures[procIdx].sutures.filter((_, i) => i !== sutIdx) });
  };

  const addNickname = (procIdx) => {
    const draft = getNickDraft(procIdx);
    if (draft.nickname && draft.actual) {
      updateProc(procIdx, { nicknames: [...procedures[procIdx].nicknames, { ...draft }] });
      setNickState(prev => ({ ...prev, [procIdx]: { nickname: '', actual: '' } }));
    }
  };

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
        id: p.id,
        name: p.name,
        glove: { id: p.gloveId, model: g?.model || '', brand: g?.brand || '', color: g?.color || '', size: p.gloveSize },
        doubleGlove: p.doubleGlove,
        underGlove: u ? { id: p.underGloveId, model: u.model, brand: u.brand, color: u.color, size: p.underGloveSize } : null,
        gown: { size: p.gownSize, type: p.gownType },
        sutures: p.sutures,
        equipment: p.equipment,
        tips: p.tips,
        nicknames: p.nicknames,
      };
    });

    onSave({
      id: crypto.randomUUID(),
      name: form.name,
      specialty: form.specialty,
      addedBy: form.addedBy || 'Kyle',
      assists: form.assists,
      procedures: builtProcedures,
      vendorLinks: [],
      createdAt: new Date().toISOString(),
      changeNote: changeNote.trim() || null,
    });
    onClose();
  };

  const labelClass = "block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";
  const inputClass = "w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50 focus:border-medical-400 transition-all placeholder-slate-400";

  return (
    <div className="fixed inset-0 z-50 slide-over-backdrop" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="slide-over-panel absolute inset-y-0 right-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">

        {/* ═══ HEADER ═══ */}
        <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="flex items-center gap-1 text-medical-200 hover:text-white transition-colors text-sm font-medium cursor-pointer">
              <ChevronLeft size={18} /> Cancel
            </button>
            <h2 className="text-white font-bold text-base">New Surgeon Card</h2>
            <button onClick={handleSubmit}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-lg transition-all cursor-pointer backdrop-blur-sm">
              Save
            </button>
          </div>
        </div>

        {/* ═══ SCROLLABLE FORM ═══ */}
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
              const draft = getSutureDraft(pi);
              const nickDraft = getNickDraft(pi);
              return (
                <div key={proc.id} className="border border-medical-200 rounded-xl overflow-hidden">
                  {/* Procedure header */}
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
                    <div className="border-t border-medical-100 px-4 py-4 space-y-5">

                      {/* ─ Glove ─ */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-medical-700">🧤 Surgeon's Glove</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className={labelClass}>Model</label>
                            <SearchableDropdown options={GLOVE_OPTIONS} value={proc.gloveId}
                              onChange={(id) => updateProc(pi, { gloveId: id })} placeholder="Search gloves…"
                              renderSelected={(opt) => (
                                <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                                </span>
                              )} />
                          </div>
                          <div>
                            <label className={labelClass}>Size</label>
                            <select value={proc.gloveSize} onChange={e => updateProc(pi, { gloveSize: e.target.value })} className={inputClass}>
                              {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Double-Glove Toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${proc.doubleGlove ? 'bg-medical-600' : 'bg-slate-300'}`}
                            onClick={() => updateProc(pi, { doubleGlove: !proc.doubleGlove })}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${proc.doubleGlove ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">Double-Glove</span>
                        </label>

                        {proc.doubleGlove && (
                          <div className="pl-4 border-l-2 border-medical-300 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Under Glove</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                <SearchableDropdown options={GLOVE_OPTIONS} value={proc.underGloveId}
                                  onChange={(id) => updateProc(pi, { underGloveId: id })} placeholder="Under glove…"
                                  renderSelected={(opt) => (
                                    <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                                    </span>
                                  )} />
                              </div>
                              <div>
                                <select value={proc.underGloveSize} onChange={e => updateProc(pi, { underGloveSize: e.target.value })} className={inputClass}>
                                  {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ─ Gown ─ */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-medical-700">🥼 Gown</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Size</label>
                            <select value={proc.gownSize} onChange={e => updateProc(pi, { gownSize: e.target.value })} className={inputClass}>
                              {GOWN_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Type</label>
                            <select value={proc.gownType} onChange={e => updateProc(pi, { gownType: e.target.value })} className={inputClass}>
                              {GOWN_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* ─ Precision Sutures ─ */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-medical-700">🧵 Sutures</p>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label className={labelClass}>Material</label>
                            <SearchableDropdown options={SUTURE_OPTIONS} value={draft.material}
                              onChange={(val) => setSutureState(prev => ({ ...prev, [pi]: { ...getSutureDraft(pi), material: val } }))}
                              placeholder="Suture…"
                              renderSelected={(opt) => (
                                <span className="flex items-center gap-2 text-slate-800 font-medium">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                                </span>
                              )} />
                          </div>
                          <div>
                            <label className={labelClass}>Size</label>
                            <select value={draft.size} onChange={e => setSutureState(prev => ({ ...prev, [pi]: { ...getSutureDraft(pi), size: e.target.value } }))} className={inputClass}>
                              {SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className={labelClass}>Needle</label>
                              <select value={draft.needle} onChange={e => setSutureState(prev => ({ ...prev, [pi]: { ...getSutureDraft(pi), needle: e.target.value } }))} className={inputClass}>
                {SURGICAL_NEEDLES.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.items.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                ))}
              </select>
                            </div>
                            <button type="button" onClick={() => addSuture(pi)}
                              className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>

                        {proc.sutures.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {proc.sutures.map((s, si) => (
                              <button key={si} type="button" onClick={() => removeSuture(pi, si)} title="Click to remove"
                                className="suture-pill inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                                style={{ backgroundColor: s.color, color: s.textColor }}>
                                {s.size} {s.name} {s.needle && `· ${s.needle}`}
                                <X size={12} className="opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ─ Equipment ─ */}
                      <div>
                        <label className={labelClass}>🔧 Equipment Notes</label>
                        <textarea value={proc.equipment} onChange={e => updateProc(pi, { equipment: e.target.value })} rows={2}
                          placeholder="Instruments, devices, tray setup…" className={inputClass + " resize-none"} />
                      </div>

                      {/* ─ Tips ─ */}
                      <div>
                        <label className={labelClass}>💡 Tech-to-Tech Tips</label>
                        <textarea value={proc.tips} onChange={e => updateProc(pi, { tips: e.target.value })} rows={3}
                          placeholder={"Room lights OFF for start.\nLikes Bovie at 30/30."} className={inputClass + " resize-none leading-relaxed"} />
                      </div>

                      {/* ─ Nicknames ─ */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-medical-700">🏷️ Instrument Nicknames</p>
                        <div className="flex gap-2">
                          <input value={nickDraft.nickname} onChange={e => setNickState(prev => ({ ...prev, [pi]: { ...getNickDraft(pi), nickname: e.target.value } }))}
                            placeholder="They call it…" className={inputClass + " flex-1"} />
                          <input value={nickDraft.actual} onChange={e => setNickState(prev => ({ ...prev, [pi]: { ...getNickDraft(pi), actual: e.target.value } }))}
                            placeholder="It's actually…" className={inputClass + " flex-1"} />
                          <button type="button" onClick={() => addNickname(pi)} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
                            <Plus size={18} />
                          </button>
                        </div>
                        {proc.nicknames.length > 0 && (
                          <div className="space-y-1.5">
                            {proc.nicknames.map((n, ni) => (
                              <div key={ni} className="flex items-center gap-2 text-sm bg-slate-900 rounded-xl px-4 py-2.5">
                                <span className="font-bold text-white">"{n.nickname}"</span>
                                <span className="text-slate-500">→</span>
                                <span className="text-slate-300 flex-1">{n.actual}</span>
                                <button type="button" onClick={() => updateProc(pi, { nicknames: proc.nicknames.filter((_, i) => i !== ni) })} className="text-slate-500 hover:text-rose-400 cursor-pointer"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Common Assists (surgeon-level) ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">👥 Common Assists</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={assistField.name} onChange={e => setAssistField(f => ({ ...f, name: e.target.value }))} placeholder="Name" className={inputClass} />
              <select value={assistField.role} onChange={e => setAssistField(f => ({ ...f, role: e.target.value }))} className={inputClass}>
                {ASSIST_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
              <input value={assistField.gloveModel} onChange={e => setAssistField(f => ({ ...f, gloveModel: e.target.value }))} placeholder="Their glove model" className={inputClass} />
              <div className="flex gap-2">
                <select value={assistField.gloveSize} onChange={e => setAssistField(f => ({ ...f, gloveSize: e.target.value }))} className={inputClass + " flex-1"}>
                  {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button type="button" onClick={addAssist} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {form.assists.length > 0 && (
              <div className="space-y-1.5">
                {form.assists.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">{a.name}</span>
                      <span className="text-slate-400 ml-1">({a.role})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.gloveModel && <span className="text-xs text-medical-600">{a.gloveModel} · {a.gloveSize}</span>}
                      <button type="button" onClick={() => setForm(f => ({ ...f, assists: f.assists.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Change Note ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">📝 Change Note</p>
            <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Why are you adding this card? (optional)" className={inputClass} />
            <p className="text-[10px] text-slate-400">Only saved to the audit trail if you type something.</p>
          </div>

          <div className="h-6" />
        </form>

        {/* ═══ BOTTOM SAVE BAR ═══ */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-white/80 backdrop-blur-xl">
          <button type="button" onClick={handleSubmit} disabled={!form.name.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-700 text-white font-bold text-sm shadow-lg shadow-medical-600/25 hover:from-medical-700 hover:to-medical-800 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Save Surgeon Card
          </button>
        </div>
      </div>
    </div>
  );
}
