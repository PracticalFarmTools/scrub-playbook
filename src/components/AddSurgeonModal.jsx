import { useState, useMemo } from 'react';
import { X, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../data/gloves';
import { SUTURE_LIBRARY, SUTURE_SIZES } from '../data/sutures';
import { SPECIALTIES, ASSIST_ROLES } from '../data/constants';
import SearchableDropdown from './SearchableDropdown';
import MicButton from './MicButton';

// ── Build dropdown option lists once (static data) ──
const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  value: g.id,
  label: `${g.model}`,
  sublabel: `${g.brand} · ${g.type} · ${g.alias}`,
  color: ({
    'Green': '#22c55e', 'Blue': '#3b82f6', 'White': '#e2e8f0',
    'Straw/Tan': '#d4a574', 'Ivory': '#f5f0e8', 'Brown/Green': '#6b7a3d',
    'Dark Brown': '#5c3a1e', 'Cream': '#f5e6c8', 'Straw': '#d4a574',
  })[g.color] || '#94a3b8',
}));

const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name,
  label: s.name,
  sublabel: `${s.type} · ${s.structure} · ${s.alias}`,
  color: s.color,
}));

export default function AddSurgeonModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', specialty: SPECIALTIES[0], facility: '', addedBy: '',
    gloveId: SURGICAL_GLOVES[0].id, gloveSize: '7.0',
    sutures: [], nicknames: [], assists: [], tips: '',
  });
  const [changeNote, setChangeNote] = useState('');

  // Suture selection state
  const [sutureSelect, setSutureSelect] = useState(SUTURE_LIBRARY[0].name);
  const [sutureSize, setSutureSize] = useState('3-0');

  // Nickname builder
  const [nickField, setNickField] = useState({ nickname: '', actual: '' });

  // Assist builder
  const [assistField, setAssistField] = useState({ name: '', role: 'PA', gloveModel: '', gloveSize: '7.0' });

  const selectedGlove = useMemo(
    () => SURGICAL_GLOVES.find(g => g.id === form.gloveId),
    [form.gloveId]
  );

  const addSuture = () => {
    const found = SUTURE_LIBRARY.find(s => s.name === sutureSelect);
    if (found) {
      setForm(f => ({ ...f, sutures: [...f.sutures, { ...found, size: sutureSize }] }));
    }
  };
  const removeSuture = (i) => setForm(f => ({ ...f, sutures: f.sutures.filter((_, idx) => idx !== i) }));

  const addNickname = () => {
    if (nickField.nickname && nickField.actual) {
      setForm(f => ({ ...f, nicknames: [...f.nicknames, { ...nickField }] }));
      setNickField({ nickname: '', actual: '' });
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
    if (!form.name.trim()) return;
    onSave({
      ...form,
      facility: form.facility.trim(),
      id: crypto.randomUUID(),
      gloveModel: selectedGlove?.model || '',
      gloveBrand: selectedGlove?.brand || '',
      gloveColor: selectedGlove?.color || '',
      createdAt: new Date().toISOString(),
      changeNote: changeNote.trim() || null,
      status: 'unconfirmed',
      lastVerifiedBy: null,
      lastVerifiedAt: null,
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
              <ChevronLeft size={18} />
              Cancel
            </button>
            <h2 className="text-white font-bold text-base">New Surgeon Card</h2>
            <button
              onClick={handleSubmit}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-lg transition-all cursor-pointer backdrop-blur-sm"
            >
              Save
            </button>
          </div>
        </div>

        {/* ═══ SCROLLABLE FORM ═══ */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">

          {/* ── SECTION: Identity ── */}
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Surgeon Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Smith"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Your Name</label>
                <input
                  value={form.addedBy}
                  onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))}
                  placeholder="Added by…"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Specialty</label>
                <select
                  value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  className={inputClass}
                >
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Facility</label>
                <input
                  value={form.facility}
                  onChange={e => setForm(f => ({ ...f, facility: e.target.value }))}
                  placeholder="e.g. Riverside Surgical"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION: Glove (Searchable) ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">🧤 Surgeon's Glove</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Model</label>
                <SearchableDropdown
                  options={GLOVE_OPTIONS}
                  value={form.gloveId}
                  onChange={(id) => setForm(f => ({ ...f, gloveId: id }))}
                  placeholder="Search gloves…"
                  renderSelected={(opt) => (
                    <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      {opt.label}
                    </span>
                  )}
                />
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <select
                  value={form.gloveSize}
                  onChange={e => setForm(f => ({ ...f, gloveSize: e.target.value }))}
                  className={inputClass}
                >
                  {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {/* Live glove preview */}
            {selectedGlove && (
              <div className="inline-flex items-center gap-2 bg-medical-50 border border-medical-200 rounded-full px-3 py-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GLOVE_OPTIONS.find(o => o.value === form.gloveId)?.color }} />
                <span className="font-semibold text-medical-800">{selectedGlove.brand} {selectedGlove.model}</span>
                <span className="text-medical-500">·</span>
                <span className="font-bold text-medical-700">{form.gloveSize}</span>
                <span className="text-medical-400">{selectedGlove.type}</span>
              </div>
            )}
          </div>

          {/* ── SECTION: Sutures (Searchable + Pills) ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">🧵 Sutures</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={labelClass}>Type</label>
                <SearchableDropdown
                  options={SUTURE_OPTIONS}
                  value={sutureSelect}
                  onChange={setSutureSelect}
                  placeholder="Search sutures…"
                  renderSelected={(opt) => (
                    <span className="flex items-center gap-2 text-slate-800 font-medium">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      {opt.label}
                    </span>
                  )}
                />
              </div>
              <div className="w-20">
                <label className={labelClass}>Size</label>
                <select value={sutureSize} onChange={e => setSutureSize(e.target.value)} className={inputClass}>
                  {SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={addSuture}
                className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Live suture pills — visual feedback */}
            {form.sutures.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.sutures.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => removeSuture(i)}
                    className="suture-pill inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    style={{ backgroundColor: s.color, color: s.textColor, animationDelay: `${i * 60}ms` }}
                    title="Click to remove"
                  >
                    {s.name} ({s.size})
                    <X size={12} className="opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION: The Ground Truth ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">💡 The Ground Truth</p>
            <div>
              <label className={labelClass}>Tech-to-Tech Notes</label>
              <div className="relative">
                <textarea
                  value={form.tips}
                  onChange={e => setForm(f => ({ ...f, tips: e.target.value }))}
                  rows={4}
                  placeholder={"Room lights OFF for start.\nLikes Bovie at 30/30.\nCalls the DeBakey 'pickups'.\nPrefers Army-Navy over Richardsons."}
                  className={inputClass + " resize-none leading-relaxed pr-11"}
                />
                <MicButton
                  variant="light"
                  className="absolute right-2 top-2"
                  onTranscript={(text) => setForm(f => ({ ...f, tips: (f.tips ? f.tips.trim() + ' ' : '') + text }))}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION: Instrument Nicknames ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">🏷️ Instrument Nicknames</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  value={nickField.nickname}
                  onChange={e => setNickField(f => ({ ...f, nickname: e.target.value }))}
                  placeholder="They call it…"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <input
                  value={nickField.actual}
                  onChange={e => setNickField(f => ({ ...f, actual: e.target.value }))}
                  placeholder="It's actually…"
                  className={inputClass}
                />
              </div>
              <button type="button" onClick={addNickname} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
                <Plus size={18} />
              </button>
            </div>
            {form.nicknames.length > 0 && (
              <div className="space-y-1.5">
                {form.nicknames.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-900 rounded-xl px-4 py-2.5">
                    <span className="font-bold text-white">"{n.nickname}"</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300 flex-1">{n.actual}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, nicknames: f.nicknames.filter((_, idx) => idx !== i) }))} className="text-slate-500 hover:text-rose-400 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION: Common Assists ── */}
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

          {/* ── SECTION: Change Note (Optional Audit) ── */}
          <div className="border-t border-slate-100 px-5 py-5 space-y-3">
            <p className="text-sm font-bold text-medical-700 flex items-center gap-2">📝 Change Note</p>
            <input
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              placeholder="Why are you adding this card? (optional)"
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400">Only saved to the audit trail if you type something.</p>
          </div>

          {/* Bottom spacer for safe-area */}
          <div className="h-6" />
        </form>

        {/* ═══ BOTTOM SAVE BAR ═══ */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-white/80 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.name.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-700 text-white font-bold text-sm shadow-lg shadow-medical-600/25 hover:from-medical-700 hover:to-medical-800 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Surgeon Card
          </button>
        </div>
      </div>
    </div>
  );
}
