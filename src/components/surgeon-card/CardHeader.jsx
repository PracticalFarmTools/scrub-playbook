import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Stethoscope, Edit3, Check, X, Plus, ArrowUp, ArrowDown, Star, Phone, GripVertical } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function CardHeader({
  surgeon, onDelete, onUpdate, onAudit,
  procedures, activeTab, setActiveTab, setEditing,
  showAddProc, setShowAddProc, newProcName, setNewProcName,
  addProcedure, toggleStatus, deleteProcedure, moveProcedure,
  onDragStart, onDragOver, onDrop,
  opSide, onSetOpSide,
}) {
  const sideOptions = [
    { value: 'RIGHT', label: 'R', full: 'Right' },
    { value: 'LEFT', label: 'L', full: 'Left' },
    { value: null, label: 'N/A', full: 'No Side' },
  ];
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(surgeon.phone || '');

  const toggleOnCall = () => {
    onUpdate({ ...surgeon, onCall: !surgeon.onCall });
    if (onAudit) onAudit({ action: surgeon.onCall ? 'Taken off On-Call' : 'Set as On-Call', surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  const savePhone = () => {
    onUpdate({ ...surgeon, phone: phoneDraft.trim() });
    if (onAudit && phoneDraft.trim() !== (surgeon.phone || '')) onAudit({ action: 'Phone Updated', surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setEditingPhone(false);
  };

  return (
    <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="drag-handle mt-1 text-medical-300" title="Drag to reorder">
            <GripVertical size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate">{surgeon.name}</h3>
            <p className="text-medical-200 text-sm flex items-center gap-1.5 mt-0.5">
              <Stethoscope size={14} />
              {surgeon.specialty}
            </p>
            {/* Phone number */}
            {editingPhone ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Phone size={12} className="text-medical-300 shrink-0" />
                <input value={phoneDraft} onChange={e => setPhoneDraft(e.target.value)}
                  placeholder="(207) 555-0123" autoFocus
                  className="w-32 text-xs bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white placeholder-medical-300 focus:outline-none focus:ring-1 focus:ring-white/40"
                  onKeyDown={e => e.key === 'Enter' && savePhone()} />
                <button onClick={savePhone} className="text-emerald-300 hover:text-emerald-100 cursor-pointer"><Check size={12} /></button>
                <button onClick={() => { setEditingPhone(false); setPhoneDraft(surgeon.phone || ''); }} className="text-medical-300 hover:text-white cursor-pointer"><X size={12} /></button>
              </div>
            ) : surgeon.phone ? (
              <div className="flex items-center gap-2 mt-1.5">
                <Phone size={11} className="text-medical-300" />
                <span className="text-xs text-medical-200">{surgeon.phone}</span>
                <a href={`tel:${surgeon.phone}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-emerald-300 hover:bg-white/20 transition-colors"
                  onClick={e => e.stopPropagation()}>
                  Call/Text
                </a>
                <button onClick={() => { setPhoneDraft(surgeon.phone); setEditingPhone(true); }} className="text-medical-400 hover:text-white cursor-pointer"><Edit3 size={10} /></button>
              </div>
            ) : (
              <button onClick={() => setEditingPhone(true)} className="flex items-center gap-1 mt-1.5 text-[10px] text-medical-400 hover:text-medical-200 cursor-pointer transition-colors">
                <Phone size={10} /> Add phone
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 -mr-1 -mt-1">
          <button onClick={toggleOnCall}
            className={`star-toggle p-1 transition-colors cursor-pointer ${surgeon.onCall ? 'text-amber-400' : 'text-medical-400 hover:text-amber-300'}`}
            title={surgeon.onCall ? 'Remove from On-Call' : 'Set as On-Call'}>
            <Star size={18} fill={surgeon.onCall ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => { if (window.confirm(`Delete ${surgeon.name}? This cannot be undone.`)) onDelete(surgeon.id); }} className="text-medical-300 hover:text-rose-400 transition-colors p-1 cursor-pointer" aria-label="Delete surgeon">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p className="text-medical-300 text-xs mt-2 italic pl-6">
        Added by {surgeon.addedBy || 'Unknown'} on {formatDate(surgeon.createdAt)}
      </p>

      {/* ── Operative Side Selector ── */}
      <div className="flex items-center gap-2.5 mt-2.5 pl-6">
        <span className="text-[10px] font-bold text-medical-300 uppercase tracking-widest">Op Side</span>
        <div className="side-selector">
          {sideOptions.map(opt => (
            <button
              key={opt.label}
              onClick={() => onSetOpSide?.(opt.value === opSide ? null : opt.value)}
              className={`side-pill ${
                opSide === opt.value
                  ? opt.value === 'RIGHT' ? 'side-pill-right'
                  : opt.value === 'LEFT' ? 'side-pill-left'
                  : 'bg-white/20 !text-white'
                  : ''
              }`}
              title={`Set operative side: ${opt.full}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {opSide && (
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            opSide === 'RIGHT' ? 'text-blue-300' : 'text-amber-300'
          }`}>
            {opSide === 'RIGHT' ? '→ Right' : '← Left'}
          </span>
        )}
      </div>

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
  );
}
