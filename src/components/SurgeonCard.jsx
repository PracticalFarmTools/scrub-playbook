import { memo, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, User, Scissors, Stethoscope, Edit3, Check, X, ExternalLink, Plus, UserPlus, Clock, Shield, ArrowUp, ArrowDown } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../data/gloves';
import { SUTURE_LIBRARY, SUTURE_SIZES } from '../data/sutures';
import { SURGICAL_NEEDLES, NEEDLE_LIST, getSimilarNeedles } from '../data/needles';
import { ASSIST_ROLES, GOWN_SIZES, GOWN_TYPES, GLOVE_COLORS } from '../data/constants';
import { timeAgo, formatDate } from '../utils/formatters';
import SearchableDropdown from './SearchableDropdown';

// ── Static option lists ──
const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  id: g.id, value: g.id, label: `${g.brand} – ${g.model}`, model: g.model, brand: g.brand, color: g.color,
  sublabel: `${g.type} · ${g.alias}`,
}));

const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name, label: s.name,
  sublabel: `${s.type} · ${s.structure} · ${s.alias}`,
  color: s.color,
}));

const EMPTY_ASSIST = { name: '', role: 'PA', gloveId: SURGICAL_GLOVES[0]?.id, gloveSize: '7.0' };

// ── Inline Edit Components ──
function InlineGloveEdit({ procedure, onSave, onCancel }) {
  const [gloveId, setGloveId] = useState(
    SURGICAL_GLOVES.find(g => g.model === procedure.glove?.model)?.id || SURGICAL_GLOVES[0]?.id
  );
  const [size, setSize] = useState(procedure.glove?.size || '7.0');
  const [dg, setDg] = useState(procedure.doubleGlove || false);
  const [underId, setUnderId] = useState(
    SURGICAL_GLOVES.find(g => g.model === procedure.underGlove?.model)?.id || SURGICAL_GLOVES[0]?.id
  );
  const [underSize, setUnderSize] = useState(procedure.underGlove?.size || '7.5');
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";

  const save = () => {
    const g = SURGICAL_GLOVES.find(x => x.id === gloveId);
    const u = dg ? SURGICAL_GLOVES.find(x => x.id === underId) : null;
    onSave({
      glove: { id: gloveId, model: g?.model || '', brand: g?.brand || '', color: g?.color || '', size },
      doubleGlove: dg,
      underGlove: u ? { id: underId, model: u.model, brand: u.brand, color: u.color, size: underSize } : null,
    });
  };

  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Glove</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <SearchableDropdown options={GLOVE_OPTIONS} value={gloveId} onChange={setGloveId} placeholder="Search gloves…"
            renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
        </div>
        <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
          {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={`relative w-10 h-5 rounded-full transition-colors ${dg ? 'bg-medical-600' : 'bg-slate-300'}`} onClick={() => setDg(!dg)}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dg ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600">Double-Glove</span>
      </label>
      {dg && (
        <div className="grid grid-cols-3 gap-2 pl-4 border-l-2 border-medical-300">
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Under Glove</p>
            <SearchableDropdown options={GLOVE_OPTIONS} value={underId} onChange={setUnderId} placeholder="Under glove…"
              renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium truncate"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GLOVE_COLORS[opt.color] || '#94a3b8' }} />{opt.label}</span>} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Size</p>
            <select value={underSize} onChange={e => setUnderSize(e.target.value)} className={inputClass}>
              {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={save} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}

function InlineGownEdit({ procedure, onSave, onCancel }) {
  const [size, setSize] = useState(procedure.gown?.size || 'L');
  const [type, setType] = useState(procedure.gown?.type || 'Standard');
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";
  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Gown</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
          {GOWN_SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
          {GOWN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={() => onSave({ gown: { size, type } })} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}

function InlineSutureEdit({ procedure, onSave, onCancel }) {
  const [sutures, setSutures] = useState([...(procedure.sutures || [])]);
  const [material, setMaterial] = useState(SUTURE_LIBRARY[0]?.name || '');
  const [size, setSize] = useState('3-0');
  const [needle, setNeedle] = useState(NEEDLE_LIST[0]?.name || '');
  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50";

  const addSuture = () => {
    const found = SUTURE_LIBRARY.find(s => s.name === material);
    if (found) setSutures(prev => [...prev, { name: found.name, color: found.color, textColor: found.textColor, size, needle }]);
  };
  const removeSuture = (i) => setSutures(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3 p-3 bg-medical-50 border border-medical-200 rounded-xl">
      <p className="text-[11px] font-bold text-medical-700 uppercase tracking-wider">Edit Sutures</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Material</p>
          <SearchableDropdown options={SUTURE_OPTIONS} value={material} onChange={setMaterial} placeholder="Suture…"
            renderSelected={(opt) => <span className="flex items-center gap-2 text-sm font-medium"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />{opt.label}</span>} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Size</p>
          <select value={size} onChange={e => setSize(e.target.value)} className={inputClass}>
            {SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Needle</p>
          <select value={needle} onChange={e => setNeedle(e.target.value)} className={inputClass}>
            {SURGICAL_NEEDLES.map(cat => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.items.map(n => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <button type="button" onClick={addSuture} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer shadow-sm">
        <Plus size={13} /> Add Suture
      </button>
      {sutures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sutures.map((s, i) => (
            <button key={i} type="button" onClick={() => removeSuture(i)} title="Click to remove"
              className="suture-pill inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: s.color, color: s.textColor }}>
              {s.size} {s.name} {s.needle && `· ${s.needle}`}
              <X size={11} className="opacity-60" />
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        <button type="button" onClick={() => onSave({ sutures })} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ── MAIN SURGEON CARD ──
// ═══════════════════════════════════════════════
function SurgeonCard({ surgeon, onDelete, onUpdate, index, vendorLinks = [], onAudit, auditLog = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(null); // 'glove' | 'gown' | 'sutures' | 'tips' | 'equipment'
  const [tipDraft, setTipDraft] = useState('');
  const [equipDraft, setEquipDraft] = useState('');

  // Quick-Add states
  const [showAssistForm, setShowAssistForm] = useState(false);
  const [assistDraft, setAssistDraft] = useState({ ...EMPTY_ASSIST });
  const [assistNote, setAssistNote] = useState('');
  const [showAddProc, setShowAddProc] = useState(false);
  const [newProcName, setNewProcName] = useState('');

  // Nickname editing
  const [editingNickIdx, setEditingNickIdx] = useState(null);
  const [nickDraft, setNickDraft] = useState({ nickname: '', actual: '' });
  const [showAddNick, setShowAddNick] = useState(false);

  // Librarian link editing
  const [editingLinkIdx, setEditingLinkIdx] = useState(null);
  const [linkDraft, setLinkDraft] = useState({ name: '', url: '' });
  const [showAddLink, setShowAddLink] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const cardHistory = auditLog.filter(e => e.surgeonName === surgeon.name);

  const procedures = surgeon.procedures || [];
  const proc = procedures[activeTab] || procedures[0] || null;

  // ── Update a specific procedure ──
  const updateProcedure = (procId, updates) => {
    const newProcs = procedures.map(p => p.id === procId ? { ...p, ...updates } : p);
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) {
      const changed = Object.keys(updates).join(', ');
      onAudit({ action: `Procedure Updated (${changed})`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    }
    setEditing(null);
  };

  const addProcedure = () => {
    if (!newProcName.trim()) return;
    const newProc = {
      id: crypto.randomUUID(), name: newProcName.trim(),
      glove: { id: SURGICAL_GLOVES[0]?.id || '', model: SURGICAL_GLOVES[0]?.model || '', brand: SURGICAL_GLOVES[0]?.brand || '', color: SURGICAL_GLOVES[0]?.color || '', size: '7.0' },
      doubleGlove: false, underGlove: null,
      gown: { size: 'L', type: 'Standard' },
      sutures: [], equipment: '', tips: '', nicknames: [],
    };
    onUpdate({ ...surgeon, procedures: [...procedures, newProc] });
    if (onAudit) onAudit({ action: `Procedure Added: ${newProcName}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setActiveTab(procedures.length);
    setNewProcName('');
    setShowAddProc(false);
  };

  const saveTips = () => {
    if (!proc) return;
    updateProcedure(proc.id, { tips: tipDraft });
    setEditing(null);
  };

  const saveEquip = () => {
    if (!proc) return;
    updateProcedure(proc.id, { equipment: equipDraft });
    setEditing(null);
  };

  // ── Toggle procedure status OPEN ↔ HOLD ──
  const toggleStatus = (procId) => {
    const target = procedures.find(p => p.id === procId);
    if (!target) return;
    const next = target.status === 'OPEN' ? 'HOLD' : 'OPEN';
    const newProcs = procedures.map(p => p.id === procId ? { ...p, status: next } : p);
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) onAudit({ action: `Status changed: ${target.name} → ${next}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  // ── Delete a procedure (cannot delete last one) ──
  const deleteProcedure = (procId) => {
    if (procedures.length <= 1) return;
    const target = procedures.find(p => p.id === procId);
    if (!target) return;
    if (!window.confirm(`Delete "${target.name}" from ${surgeon.name}? This cannot be undone.`)) return;
    const newProcs = procedures.filter(p => p.id !== procId);
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) onAudit({ action: `Procedure Deleted: ${target.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    if (activeTab >= newProcs.length) setActiveTab(newProcs.length - 1);
    setEditing(null);
  };

  // ── Move a procedure up or down ──
  const moveProcedure = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= procedures.length) return;
    const newProcs = [...procedures];
    [newProcs[idx], newProcs[target]] = [newProcs[target], newProcs[idx]];
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) onAudit({ action: `Procedure Reordered: ${newProcs[target].name} ${direction === -1 ? '↑' : '↓'}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setActiveTab(target);
  };

  // ── Nickname CRUD helpers ──
  const saveNickname = (procId, idx, nick) => {
    const nicks = [...(proc?.nicknames || [])];
    nicks[idx] = nick;
    updateProcedure(procId, { nicknames: nicks });
    setEditingNickIdx(null);
  };
  const deleteNickname = (procId, idx) => {
    const nicks = (proc?.nicknames || []).filter((_, i) => i !== idx);
    updateProcedure(procId, { nicknames: nicks });
  };
  const addNickname = (procId) => {
    if (!nickDraft.nickname.trim() || !nickDraft.actual.trim()) return;
    const nicks = [...(proc?.nicknames || []), { ...nickDraft }];
    updateProcedure(procId, { nicknames: nicks });
    setNickDraft({ nickname: '', actual: '' });
    setShowAddNick(false);
  };

  // ── Librarian Link CRUD helpers ──
  const saveLink = (idx, link) => {
    const links = [...(surgeon.vendorLinks || [])];
    links[idx] = link.name;
    onUpdate({ ...surgeon, vendorLinks: links });
    if (onAudit) onAudit({ action: `Vendor Link Updated: ${link.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setEditingLinkIdx(null);
  };
  const deleteLink = (idx) => {
    const removed = surgeon.vendorLinks[idx];
    const links = surgeon.vendorLinks.filter((_, i) => i !== idx);
    onUpdate({ ...surgeon, vendorLinks: links });
    if (onAudit) onAudit({ action: `Vendor Link Removed: ${removed}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };
  const addLink = () => {
    if (!linkDraft.name.trim()) return;
    const links = [...(surgeon.vendorLinks || []), linkDraft.name.trim()];
    onUpdate({ ...surgeon, vendorLinks: links });
    if (onAudit) onAudit({ action: `Vendor Link Added: ${linkDraft.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setLinkDraft({ name: '', url: '' });
    setShowAddLink(false);
  };

  const saveAssist = () => {
    if (!assistDraft.name.trim()) return;
    const glove = SURGICAL_GLOVES.find(g => g.id === assistDraft.gloveId);
    const newAssist = {
      name: assistDraft.name.trim(), role: assistDraft.role,
      gloveModel: glove?.model || '', gloveBrand: glove?.brand || '', gloveSize: assistDraft.gloveSize,
      addedBy: surgeon.addedBy || 'Kyle', addedOn: new Date().toISOString(),
    };
    onUpdate({ ...surgeon, assists: [...(surgeon.assists || []), newAssist] });
    if (onAudit) onAudit({ action: `Assist Added: ${newAssist.name} (${newAssist.role})`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle', note: assistNote || null });
    setAssistDraft({ ...EMPTY_ASSIST }); setAssistNote(''); setShowAssistForm(false);
  };

  const removeAssist = (idx) => {
    const removed = surgeon.assists[idx];
    onUpdate({ ...surgeon, assists: surgeon.assists.filter((_, i) => i !== idx) });
    if (onAudit) onAudit({ action: `Assist Removed: ${removed.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all placeholder-slate-400";

  return (
    <div className="card-animate bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300" style={{ animationDelay: `${index * 80}ms` }}>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate">{surgeon.name}</h3>
            <p className="text-medical-200 text-sm flex items-center gap-1.5 mt-0.5">
              <Stethoscope size={14} />
              {surgeon.specialty}
            </p>
          </div>
          <button onClick={() => { if (window.confirm(`Delete ${surgeon.name}? This cannot be undone.`)) onDelete(surgeon.id); }} className="text-medical-300 hover:text-rose-400 transition-colors p-1 -mr-1 -mt-1 cursor-pointer" aria-label="Delete surgeon">
            <Trash2 size={16} />
          </button>
        </div>
        <p className="text-medical-300 text-xs mt-2 italic">
          Added by {surgeon.addedBy || 'Unknown'} on {formatDate(surgeon.createdAt)}
        </p>

        {/* ── Procedure Tabs ── */}
        {procedures.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 -mb-1 overflow-x-auto scrollbar-hide">
            {/* Reorder arrows for active tab */}
            {procedures.length > 1 && activeTab > 0 && (
              <button onClick={() => moveProcedure(activeTab, -1)}
                className="reorder-arrow p-1 text-medical-300 hover:text-white transition-all cursor-pointer" title="Move left">
                <ArrowUp size={13} className="rotate-[-90deg]" />
              </button>
            )}
            {procedures.map((p, i) => (
              <div key={p.id} className="relative group/tab flex-shrink-0">
                <button onClick={() => { setActiveTab(i); setEditing(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    i === activeTab
                      ? 'bg-white text-medical-700 shadow-sm'
                      : 'text-medical-200 hover:text-white hover:bg-white/10'
                  }`}>
                  {p.name}
                  {p.status && (
                    <span onClick={(e) => { e.stopPropagation(); toggleStatus(p.id); }}
                      className={`status-badge px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none cursor-pointer hover:scale-110 active:scale-90 transition-transform ${
                        p.status === 'OPEN'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-400 text-slate-900'
                      }`}
                      title={`Tap to switch to ${p.status === 'OPEN' ? 'HOLD' : 'OPEN'}`}>
                      {p.status}
                    </span>
                  )}
                </button>
                {/* Delete procedure (hidden on last procedure, visible on hover) */}
                {procedures.length > 1 && i !== activeTab && (
                  <button onClick={() => deleteProcedure(p.id)}
                    className="proc-tab-delete absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover/tab:opacity-100 transition-opacity cursor-pointer shadow-sm"
                    title={`Delete ${p.name}`}>
                    <X size={9} strokeWidth={3} />
                  </button>
                )}
              </div>
            ))}
            {/* Reorder arrows for active tab */}
            {procedures.length > 1 && activeTab < procedures.length - 1 && (
              <button onClick={() => moveProcedure(activeTab, 1)}
                className="reorder-arrow p-1 text-medical-300 hover:text-white transition-all cursor-pointer" title="Move right">
                <ArrowDown size={13} className="rotate-[-90deg]" />
              </button>
            )}
            {!showAddProc ? (
              <button onClick={() => setShowAddProc(true)} className="px-2 py-1.5 text-medical-300 hover:text-white transition-colors cursor-pointer" title="Add procedure">
                <Plus size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input value={newProcName} onChange={e => setNewProcName(e.target.value)} placeholder="Name…"
                  className="w-24 px-2 py-1 rounded-lg text-xs text-slate-800 bg-white border-none focus:outline-none focus:ring-1 focus:ring-medical-400" autoFocus
                  onKeyDown={e => e.key === 'Enter' && addProcedure()} />
                <button onClick={addProcedure} className="text-emerald-300 hover:text-emerald-100 cursor-pointer"><Check size={14} /></button>
                <button onClick={() => { setShowAddProc(false); setNewProcName(''); }} className="text-medical-300 hover:text-white cursor-pointer"><X size={14} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ PROCEDURE CONTENT ═══ */}
      {proc && (
        <>
          {/* ── Glove Badge ── */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🧤 Glove</p>
              {editing !== 'glove' && <button onClick={() => setEditing('glove')} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer"><Edit3 size={13} /></button>}
            </div>
            {editing === 'glove' ? (
              <InlineGloveEdit procedure={proc} onCancel={() => setEditing(null)} onSave={(updates) => updateProcedure(proc.id, updates)} />
            ) : (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-medical-50 border border-medical-200 rounded-full px-4 py-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GLOVE_COLORS[proc.glove?.color] || '#94a3b8' }} />
                  <span className="text-sm font-semibold text-medical-800">{proc.glove?.model}</span>
                  <span className="text-medical-500 text-sm">·</span>
                  <span className="text-sm font-bold text-medical-700">Size {proc.glove?.size}</span>
                </div>
                {proc.doubleGlove && proc.underGlove && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Shield size={12} className="text-amber-500" />
                    <span className="text-[11px] font-bold text-amber-600 uppercase">Double-Gloved</span>
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-xs">
                      <span className="font-bold text-amber-800">Over:</span>
                      <span className="font-medium text-amber-700">{proc.glove?.model} · {proc.glove?.size}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-full px-3 py-1 text-xs">
                      <span className="font-bold text-slate-600">Under:</span>
                      <span className="font-medium text-slate-500">{proc.underGlove.model} · {proc.underGlove.size}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Gown Badge ── */}
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🥼 Gown</p>
              {editing !== 'gown' && <button onClick={() => setEditing('gown')} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer"><Edit3 size={13} /></button>}
            </div>
            {editing === 'gown' ? (
              <InlineGownEdit procedure={proc} onCancel={() => setEditing(null)} onSave={(updates) => updateProcedure(proc.id, updates)} />
            ) : (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5">
                <span className="text-sm font-semibold text-slate-700">{proc.gown?.size || 'L'}</span>
                <span className="text-slate-400 text-sm">·</span>
                <span className="text-sm text-slate-600">{proc.gown?.type || 'Standard'}</span>
              </div>
            )}
          </div>

          {/* ── Suture Pills ── */}
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
                  {proc.sutures.map((s, i) => (
                    <span key={i} className="suture-pill inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm"
                      style={{ backgroundColor: s.color, color: s.textColor, animationDelay: `${i * 60}ms` }}>
                      {s.size} {s.name}
                      {s.needle && <span className="opacity-75">· {s.needle}</span>}
                    </span>
                  ))}
                </div>
                {/* Needle equivalency labels */}
                {proc.sutures.filter(s => s.needle).map((s, i) => {
                  const similar = getSimilarNeedles(s.needle);
                  if (!similar.equivalents) return null;
                  return (
                    <div key={`eq-${i}`} className="flex items-center gap-1.5 text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">Alt for {s.needle}:</span>
                      <span className="text-medical-600 font-semibold">{similar.equivalents}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-slate-300 italic">No sutures — tap edit to add</p>}
          </div>

          {/* ── Equipment ── */}
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🔧 Equipment</p>
              {editing !== 'equipment' && <button onClick={() => { setEquipDraft(proc.equipment || ''); setEditing('equipment'); }} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer"><Edit3 size={13} /></button>}
            </div>
            {editing === 'equipment' ? (
              <div className="space-y-2">
                <textarea value={equipDraft} onChange={e => setEquipDraft(e.target.value)} rows={2} placeholder="Equipment notes…"
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
                  <button onClick={saveEquip} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {proc.equipment || <span className="italic text-slate-300">No equipment notes — tap edit to add</span>}
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Librarian Links ── */}
      {surgeon.vendorLinks?.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">📋 Librarian Links</p>
            <button onClick={() => { setLinkDraft({ name: '', url: '' }); setShowAddLink(true); }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-medical-600 hover:text-medical-700 cursor-pointer">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {surgeon.vendorLinks.map((linkName, i) => {
              const resolved = vendorLinks.find(v => v.name.toLowerCase().includes(linkName.toLowerCase()));
              return editingLinkIdx === i ? (
                <div key={i} className="flex items-center gap-1.5 bg-medical-50 border border-medical-200 rounded-full px-3 py-1">
                  <input value={linkDraft.name} onChange={e => setLinkDraft(d => ({ ...d, name: e.target.value }))}
                    className="w-28 text-xs bg-transparent border-none focus:outline-none text-medical-800 font-semibold" autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveLink(i, linkDraft)} />
                  <button onClick={() => saveLink(i, linkDraft)} className="text-emerald-500 hover:text-emerald-400 cursor-pointer"><Check size={12} /></button>
                  <button onClick={() => setEditingLinkIdx(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={12} /></button>
                </div>
              ) : (
                <div key={i} className="nickname-row inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-medical-50 text-medical-700 border border-medical-200 group/link">
                  {resolved?.url ? (
                    <a href={resolved.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{linkName}</a>
                  ) : (
                    <span>{linkName}</span>
                  )}
                  <ExternalLink size={11} className="opacity-50" />
                  <button onClick={() => { setLinkDraft({ name: linkName, url: '' }); setEditingLinkIdx(i); }}
                    className="nickname-action text-slate-300 hover:text-medical-600 cursor-pointer ml-1"><Edit3 size={11} /></button>
                  <button onClick={() => deleteLink(i)}
                    className="nickname-action text-slate-300 hover:text-rose-500 cursor-pointer"><Trash2 size={11} /></button>
                </div>
              );
            })}
          </div>
          {showAddLink && (
            <div className="flex items-center gap-2 mt-2">
              <input value={linkDraft.name} onChange={e => setLinkDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Vendor name…" autoFocus
                className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-medical-400/50"
                onKeyDown={e => e.key === 'Enter' && addLink()} />
              <button onClick={addLink} className="text-emerald-500 hover:text-emerald-400 cursor-pointer"><Check size={14} /></button>
              <button onClick={() => { setShowAddLink(false); setLinkDraft({ name: '', url: '' }); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      {/* ── Expandable Section ── */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer">
        <span>{expanded ? 'Less Detail' : 'More Detail'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* ── Tips ── */}
          {proc && (
            <div className="px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors size={12} /> Tech-to-Tech Tips
                </p>
                {editing !== 'tips' && (
                  <button onClick={() => { setTipDraft(proc.tips || ''); setEditing('tips'); }} className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
              {editing === 'tips' ? (
                <div className="space-y-2">
                  <textarea value={tipDraft} onChange={e => setTipDraft(e.target.value)} rows={3} placeholder='e.g. "Likes the Bovie at 30/30."'
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X size={16} /></button>
                    <button onClick={saveTips} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"><Check size={16} /></button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {proc.tips || <span className="italic text-slate-500">No tips yet — tap edit to add.</span>}
                </p>
              )}
            </div>
          )}

          {/* ── Nicknames ── */}
          {proc && (
            <div className="px-5 py-4 bg-slate-800 border-t border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Instrument Nicknames</p>
                <button onClick={() => { setNickDraft({ nickname: '', actual: '' }); setShowAddNick(true); }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer">
                  <Plus size={12} /> Add
                </button>
              </div>
              {proc.nicknames?.length > 0 ? (
                <div className="space-y-1.5">
                  {proc.nicknames.map((n, i) => (
                    editingNickIdx === i ? (
                      <div key={i} className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                        <input value={nickDraft.nickname} onChange={e => setNickDraft(d => ({ ...d, nickname: e.target.value }))}
                          placeholder="Nickname…" autoFocus
                          className="flex-1 text-sm bg-transparent border-b border-slate-500 text-white focus:outline-none focus:border-emerald-400 px-1 py-0.5" />
                        <span className="text-slate-500 text-sm">→</span>
                        <input value={nickDraft.actual} onChange={e => setNickDraft(d => ({ ...d, actual: e.target.value }))}
                          placeholder="Actual instrument…"
                          className="flex-1 text-sm bg-transparent border-b border-slate-500 text-slate-300 focus:outline-none focus:border-emerald-400 px-1 py-0.5"
                          onKeyDown={e => e.key === 'Enter' && saveNickname(proc.id, i, nickDraft)} />
                        <button onClick={() => saveNickname(proc.id, i, nickDraft)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={14} /></button>
                        <button onClick={() => setEditingNickIdx(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
                      </div>
                    ) : (
                      <div key={i} className="nickname-row flex items-center gap-2 text-sm group/nick rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-700/50 transition-colors">
                        <span className="text-white font-semibold">"{n.nickname}"</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300 flex-1">{n.actual}</span>
                        <button onClick={() => { setNickDraft({ ...n }); setEditingNickIdx(i); }}
                          className="nickname-action text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors"><Edit3 size={12} /></button>
                        <button onClick={() => deleteNickname(proc.id, i)}
                          className="nickname-action text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"><Trash2 size={12} /></button>
                      </div>
                    )
                  ))}
                </div>
              ) : !showAddNick && (
                <p className="text-sm text-slate-500 italic">No nicknames — tap Add to create one.</p>
              )}
              {showAddNick && (
                <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2 mt-2">
                  <input value={nickDraft.nickname} onChange={e => setNickDraft(d => ({ ...d, nickname: e.target.value }))}
                    placeholder='e.g. "The Cobb"' autoFocus
                    className="flex-1 text-sm bg-transparent border-b border-slate-500 text-white focus:outline-none focus:border-emerald-400 px-1 py-0.5 placeholder-slate-500" />
                  <span className="text-slate-500 text-sm">→</span>
                  <input value={nickDraft.actual} onChange={e => setNickDraft(d => ({ ...d, actual: e.target.value }))}
                    placeholder="Cobb Elevator"
                    className="flex-1 text-sm bg-transparent border-b border-slate-500 text-slate-300 focus:outline-none focus:border-emerald-400 px-1 py-0.5 placeholder-slate-500"
                    onKeyDown={e => e.key === 'Enter' && addNickname(proc.id)} />
                  <button onClick={() => addNickname(proc.id)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={14} /></button>
                  <button onClick={() => { setShowAddNick(false); setNickDraft({ nickname: '', actual: '' }); }} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
                </div>
              )}
            </div>
          )}

          {/* ── Surgical Team ── */}
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} /> Surgical Team
              </p>
              {!showAssistForm && (
                <button onClick={() => setShowAssistForm(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-medical-600 hover:text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-lg px-2.5 py-1 transition-all cursor-pointer">
                  <Plus size={12} /> Add Assist
                </button>
              )}
            </div>

            {surgeon.assists?.length > 0 && (
              <div className="space-y-2 mb-3">
                {surgeon.assists.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 group">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-medical-600">{a.gloveModel}</p>
                        <p className="text-xs text-slate-400">Size {a.gloveSize}</p>
                      </div>
                      <button onClick={() => removeAssist(i)} className="text-transparent group-hover:text-slate-300 hover:!text-rose-500 transition-colors cursor-pointer p-0.5" aria-label="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {surgeon.assists?.length === 0 && !showAssistForm && (
              <p className="text-sm text-slate-300 italic">No assists yet — tap "Add Assist"</p>
            )}

            {showAssistForm && (
              <div className="bg-medical-50 border border-medical-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus size={14} className="text-medical-600" />
                  <p className="text-xs font-bold text-medical-700 uppercase tracking-wider">Quick-Add Assist</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <input value={assistDraft.name} onChange={e => setAssistDraft(d => ({ ...d, name: e.target.value }))} placeholder="Assistant name" className={inputClass} autoFocus />
                  </div>
                  <div className="col-span-2">
                    <select value={assistDraft.role} onChange={e => setAssistDraft(d => ({ ...d, role: e.target.value }))} className={inputClass}>
                      {ASSIST_ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <select value={assistDraft.gloveId} onChange={e => setAssistDraft(d => ({ ...d, gloveId: e.target.value }))} className={inputClass}>
                      {GLOVE_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select value={assistDraft.gloveSize} onChange={e => setAssistDraft(d => ({ ...d, gloveSize: e.target.value }))} className={inputClass}>
                      {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <input value={assistNote} onChange={e => setAssistNote(e.target.value)} placeholder="Change note / reason (optional)"
                  className="w-full rounded-lg bg-white border border-medical-200 text-slate-600 text-xs px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-medical-400/40" />
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => { setShowAssistForm(false); setAssistDraft({ ...EMPTY_ASSIST }); setAssistNote(''); }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">Cancel</button>
                  <button type="button" onClick={saveAssist} disabled={!assistDraft.name.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                    <Check size={13} /> Add to Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── History ── */}
          {cardHistory.length > 0 && (
            <div className="border-t border-slate-100">
              <button onClick={() => setShowHistory(h => !h)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="flex items-center gap-1.5"><Clock size={12} /> History ({cardHistory.length})</span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showHistory && (
                <div className="px-5 pb-4 space-y-1.5">
                  {cardHistory.slice(0, 15).map((entry) => (
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
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SurgeonCard);
