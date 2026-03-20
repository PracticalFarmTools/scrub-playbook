import { ChevronDown, ChevronUp, Trash2, Plus, X } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../../data/gloves';
import { SUTURE_LIBRARY, SUTURE_SIZES } from '../../data/sutures';
import { SURGICAL_NEEDLES } from '../../data/needles';
import { GOWN_SIZES, GOWN_TYPES, GLOVE_COLORS } from '../../data/constants';
import { DRAPE_TYPES, DEFAULT_SEQUENCES } from '../../data/draping';
import SearchableDropdown from '../SearchableDropdown';

const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  value: g.id, label: `${g.model}`,
  sublabel: `${g.brand} · ${g.type} · ${g.alias}`,
  color: GLOVE_COLORS[g.color] || '#94a3b8',
}));

const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name, label: s.name,
  sublabel: `${s.type} · ${s.structure} · ${s.alias}`,
  color: s.color,
}));

const labelClass = "block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";
const inputClass = "w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50 focus:border-medical-400 transition-all placeholder-slate-400";

export default function ProcedureForm({ proc, procIdx, updateProc, getSutureDraft, setSutureState, getNickDraft, setNickState, addSuture, removeSuture }) {
  const draft = getSutureDraft(procIdx);
  const nickDraft = getNickDraft(procIdx);

  const addNickname = () => {
    if (nickDraft.nickname && nickDraft.actual) {
      updateProc(procIdx, { nicknames: [...proc.nicknames, { ...nickDraft }] });
      setNickState(prev => ({ ...prev, [procIdx]: { nickname: '', actual: '' } }));
    }
  };

  return (
    <div className="border-t border-medical-100 px-4 py-4 space-y-5">
      {/* ─ Glove ─ */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-medical-700">🧤 Surgeon's Glove</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Model</label>
            <SearchableDropdown options={GLOVE_OPTIONS} value={proc.gloveId}
              onChange={(id) => updateProc(procIdx, { gloveId: id })} placeholder="Search gloves…"
              renderSelected={(opt) => (
                <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                </span>
              )} />
          </div>
          <div>
            <label className={labelClass}>Size</label>
            <select value={proc.gloveSize} onChange={e => updateProc(procIdx, { gloveSize: e.target.value })} className={inputClass}>
              {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {/* Double-Glove Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`relative w-11 h-6 rounded-full transition-colors ${proc.doubleGlove ? 'bg-medical-600' : 'bg-slate-300'}`}
            onClick={() => updateProc(procIdx, { doubleGlove: !proc.doubleGlove })}>
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
                  onChange={(id) => updateProc(procIdx, { underGloveId: id })} placeholder="Under glove…"
                  renderSelected={(opt) => (
                    <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                    </span>
                  )} />
              </div>
              <div>
                <select value={proc.underGloveSize} onChange={e => updateProc(procIdx, { underGloveSize: e.target.value })} className={inputClass}>
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
            <select value={proc.gownSize} onChange={e => updateProc(procIdx, { gownSize: e.target.value })} className={inputClass}>
              {GOWN_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={proc.gownType} onChange={e => updateProc(procIdx, { gownType: e.target.value })} className={inputClass}>
              {GOWN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ─ Draping ─ */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-medical-700">🩹 Draping</p>
        <div>
          <label className={labelClass}>Drape Type</label>
          <select value={proc.drapeType || ''} onChange={e => {
            const type = e.target.value;
            updateProc(procIdx, {
              drapeType: type,
              drapingSequence: DEFAULT_SEQUENCES[type] ? [...DEFAULT_SEQUENCES[type]] : (proc.drapingSequence || []),
            });
          }} className={inputClass}>
            <option value="">— Select —</option>
            {DRAPE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {(proc.drapingSequence || []).length > 0 && (
          <div className="space-y-1">
            {proc.drapingSequence.map((step, si) => (
              <div key={si} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-medical-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{si + 1}</span>
                <span className="text-sm text-slate-700 flex-1">{step}</span>
                <button type="button" onClick={() => updateProc(procIdx, { drapingSequence: proc.drapingSequence.filter((_, i) => i !== si) })}
                  className="text-slate-300 hover:text-rose-500 cursor-pointer"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input placeholder="Add draping step…" className={inputClass + " flex-1"}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.target.value.trim()) {
                  updateProc(procIdx, { drapingSequence: [...(proc.drapingSequence || []), e.target.value.trim()] });
                  e.target.value = '';
                }
              }
            }} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={`relative w-10 h-5 rounded-full transition-colors ${proc.postDrapeGloveChange ? 'bg-amber-500' : 'bg-slate-300'}`}
            onClick={() => updateProc(procIdx, { postDrapeGloveChange: !proc.postDrapeGloveChange })}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${proc.postDrapeGloveChange ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-semibold text-slate-600">Post-Drape Glove Change Required</span>
        </label>
      </div>

      {/* ─ Sutures ─ */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-medical-700">🧵 Sutures</p>
        <div className="grid grid-cols-3 gap-2 items-end">
          <div>
            <label className={labelClass}>Material</label>
            <SearchableDropdown options={SUTURE_OPTIONS} value={draft.material}
              onChange={(val) => setSutureState(prev => ({ ...prev, [procIdx]: { ...getSutureDraft(procIdx), material: val } }))}
              placeholder="Suture…"
              renderSelected={(opt) => (
                <span className="flex items-center gap-2 text-slate-800 font-medium">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}
                </span>
              )} />
          </div>
          <div>
            <label className={labelClass}>Size</label>
            <select value={draft.size} onChange={e => setSutureState(prev => ({ ...prev, [procIdx]: { ...getSutureDraft(procIdx), size: e.target.value } }))} className={inputClass}>
              {SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className={labelClass}>Needle</label>
              <select value={draft.needle} onChange={e => setSutureState(prev => ({ ...prev, [procIdx]: { ...getSutureDraft(procIdx), needle: e.target.value } }))} className={inputClass}>
                {SURGICAL_NEEDLES.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.items.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => addSuture(procIdx)}
              className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
              <Plus size={18} />
            </button>
          </div>
        </div>
        {proc.sutures.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {proc.sutures.map((s, si) => (
              <button key={si} type="button" onClick={() => removeSuture(procIdx, si)} title="Click to remove"
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
        <textarea value={proc.equipment} onChange={e => updateProc(procIdx, { equipment: e.target.value })} rows={2}
          placeholder="Instruments, devices, tray setup…" className={inputClass + " resize-none"} />
      </div>

      {/* ─ Tips ─ */}
      <div>
        <label className={labelClass}>💡 Tech-to-Tech Tips</label>
        <textarea value={proc.tips} onChange={e => updateProc(procIdx, { tips: e.target.value })} rows={3}
          placeholder={"Room lights OFF for start.\nLikes Bovie at 30/30."} className={inputClass + " resize-none leading-relaxed"} />
      </div>

      {/* ─ Nicknames ─ */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-medical-700">🏷️ Instrument Nicknames</p>
        <div className="flex gap-2">
          <input value={nickDraft.nickname} onChange={e => setNickState(prev => ({ ...prev, [procIdx]: { ...getNickDraft(procIdx), nickname: e.target.value } }))}
            placeholder="They call it…" className={inputClass + " flex-1"} />
          <input value={nickDraft.actual} onChange={e => setNickState(prev => ({ ...prev, [procIdx]: { ...getNickDraft(procIdx), actual: e.target.value } }))}
            placeholder="It's actually…" className={inputClass + " flex-1"} />
          <button type="button" onClick={addNickname} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white flex items-center justify-center hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-medical-600/20">
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
                <button type="button" onClick={() => updateProc(procIdx, { nicknames: proc.nicknames.filter((_, i) => i !== ni) })} className="text-slate-500 hover:text-rose-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
