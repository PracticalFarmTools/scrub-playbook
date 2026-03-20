import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, X } from 'lucide-react';
import { SURGICAL_GLOVES } from '../data/gloves';
import { makeDefaultDraping } from '../data/draping';
import { resolveTokens } from '../utils/mirrorLogic';

import CardHeader from './surgeon-card/CardHeader';
import GloveSection from './surgeon-card/GloveSection';
import DrapingSection from './surgeon-card/DrapingSection';
import InlineGownEdit from './surgeon-card/InlineGownEdit';
import SutureSection from './surgeon-card/SutureSection';
import SurgicalTeam from './surgeon-card/SurgicalTeam';
import ScoutGrid from './surgeon-card/ScoutGrid';
import VerifiedByFooter from './surgeon-card/VerifiedByFooter';
import ExpandedDetails from './surgeon-card/ExpandedDetails';
import InstrumentInspector from './surgeon-card/InstrumentInspector';

// ═══════════════════════════════════════════════
// ── MAIN SURGEON CARD (orchestrator) ──
// ═══════════════════════════════════════════════
function SurgeonCard({ surgeon, onDelete, onUpdate, index, vendorLinks = [], onAudit, auditLog = [], latexFree = false, onDragStart, onDragOver, onDrop, isDragging }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(null); // 'glove' | 'gown' | 'sutures' | 'equipment' | 'draping'
  const [equipDraft, setEquipDraft] = useState('');
  const [showAddProc, setShowAddProc] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [inspectorInst, setInspectorInst] = useState(null);

  const procedures = surgeon.procedures || [];
  const proc = procedures[activeTab] || procedures[0] || null;

  // ── Update a specific procedure ──
  // Auto-stamps verifiedBy.timestamp on scout sheet / inventory edits
  const STAMP_FIELDS = ['scoutGrid', 'equipment', 'glove', 'sutures', 'gown', 'draping', 'opSide', 'doubleGlove', 'underGlove'];

  const updateProcedure = (procId, updates) => {
    // Auto-update verifiedBy timestamp if a stampable field changed
    const shouldStamp = STAMP_FIELDS.some(f => f in updates);
    let finalUpdates = updates;
    if (shouldStamp) {
      const existing = (procedures.find(p => p.id === procId) || {}).verifiedBy || {};
      finalUpdates = {
        ...updates,
        verifiedBy: {
          ...existing,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const newProcs = procedures.map(p => p.id === procId ? { ...p, ...finalUpdates } : p);
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
      draping: makeDefaultDraping(),
      sutures: [], equipment: '', tips: '', nicknames: [],
    };
    onUpdate({ ...surgeon, procedures: [...procedures, newProc] });
    if (onAudit) onAudit({ action: `Procedure Added: ${newProcName}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setActiveTab(procedures.length);
    setNewProcName('');
    setShowAddProc(false);
  };

  const toggleStatus = (procId) => {
    const target = procedures.find(p => p.id === procId);
    if (!target) return;
    const next = target.status === 'OPEN' ? 'HOLD' : 'OPEN';
    const newProcs = procedures.map(p => p.id === procId ? { ...p, status: next } : p);
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) onAudit({ action: `Status changed: ${target.name} → ${next}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

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

  const moveProcedure = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= procedures.length) return;
    const newProcs = [...procedures];
    [newProcs[idx], newProcs[target]] = [newProcs[target], newProcs[idx]];
    onUpdate({ ...surgeon, procedures: newProcs });
    if (onAudit) onAudit({ action: `Procedure Reordered: ${newProcs[target].name} ${direction === -1 ? '↑' : '↓'}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setActiveTab(target);
  };

  const saveEquip = () => {
    if (!proc) return;
    updateProcedure(proc.id, { equipment: equipDraft });
    setEditing(null);
  };

  return (
    <div
      className={`card-animate bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 ${surgeon.onCall ? 'card-on-call' : ''} ${isDragging ? 'card-dragging' : ''}`}
      style={{ animationDelay: `${index * 80}ms` }}
      draggable
      onDragStart={() => onDragStart?.(surgeon.id)}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={() => onDrop?.(surgeon.id)}
    >
      {/* ── Header + Procedure Tabs ── */}
      <CardHeader
        surgeon={surgeon} onDelete={onDelete} onUpdate={onUpdate} onAudit={onAudit}
        procedures={procedures} activeTab={activeTab} setActiveTab={setActiveTab} setEditing={setEditing}
        showAddProc={showAddProc} setShowAddProc={setShowAddProc} newProcName={newProcName} setNewProcName={setNewProcName}
        addProcedure={addProcedure} toggleStatus={toggleStatus} deleteProcedure={deleteProcedure} moveProcedure={moveProcedure}
        onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
        opSide={proc?.opSide || null}
        onSetOpSide={(side) => proc && updateProcedure(proc.id, { opSide: side })}
      />

      {/* ═══ PROCEDURE CONTENT ═══ */}
      {proc && (
        <>
          {/* ── Glove Badge ── */}
          <GloveSection proc={proc} editing={editing} setEditing={setEditing} updateProcedure={updateProcedure} latexFree={latexFree} />

          {/* ── Prep / Draping ── */}
          <DrapingSection proc={proc} editing={editing} setEditing={setEditing} updateProcedure={updateProcedure} opSide={proc?.opSide} />

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
          <SutureSection proc={proc} editing={editing} setEditing={setEditing} updateProcedure={updateProcedure} />

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
                  <button onClick={saveEquip} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Edit3 size={16} /></button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {proc.equipment
                  ? resolveTokens(proc.equipment, proc.opSide)
                  : <span className="italic text-slate-300">No equipment notes — tap edit to add</span>
                }
              </p>
            )}
          </div>

          {/* ── Scout Grid (Orientation Table) ── */}
          <ScoutGrid proc={proc} updateProcedure={updateProcedure} opSide={proc?.opSide} />

          {/* ── Surgical Team / Assists ── */}
          <SurgicalTeam surgeon={surgeon} onUpdate={onUpdate} onAudit={onAudit} latexFree={latexFree} />
        </>
      )}

      {/* ── Expandable Section ── */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer">
        <span>{expanded ? 'Less Detail' : 'More Detail'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <ExpandedDetails
          surgeon={surgeon} proc={proc} onUpdate={onUpdate} onAudit={onAudit} auditLog={auditLog}
          updateProcedure={updateProcedure} vendorLinks={vendorLinks} latexFree={latexFree}
          opSide={proc?.opSide}
        />
      )}

      {/* ── Signature Stamp / Chain of Custody ── */}
      {proc && <VerifiedByFooter proc={proc} updateProcedure={updateProcedure} />}

      {/* ── Instrument Inspector Bottom Sheet ── */}
      {inspectorInst && (
        <InstrumentInspector
          instrument={inspectorInst}
          onClose={() => setInspectorInst(null)}
        />
      )}
    </div>
  );
}

export default memo(SurgeonCard);
