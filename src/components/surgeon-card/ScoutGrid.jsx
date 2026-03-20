/**
 * ScoutGrid — Descriptive Scout Sheet Orientation Table
 *
 * A 4-row grid mapping equipment to anatomical positions with practical notes.
 * Uses anatomical anchors: Cephalad (Head), Caudal (Foot), Midline,
 * plus {{OP_SIDE}} / {{NON_OP}} tokens from the Mirror Logic Engine.
 *
 * Each row: [Equipment] | [Anatomical Position] | [Practical Note]
 */
import { useState } from 'react';
import { Edit3, Check, X, Plus, Trash2, Compass } from 'lucide-react';
import { resolveTokens } from '../../utils/mirrorLogic';

/** Anatomical anchor presets for quick selection */
const POSITION_PRESETS = [
  '{{OP_SIDE}} — Cephalad',
  '{{OP_SIDE}} — Caudal',
  '{{OP_SIDE}} — Midline',
  '{{NON_OP}} — Cephalad',
  '{{NON_OP}} — Caudal',
  '{{NON_OP}} — Midline',
  'Cephalad (Head)',
  'Caudal (Foot)',
  'Midline',
];

const DEFAULT_GRID = [
  { equipment: '', position: '', note: '' },
  { equipment: '', position: '', note: '' },
  { equipment: '', position: '', note: '' },
  { equipment: '', position: '', note: '' },
];

const INPUT = "w-full rounded-md bg-white border border-slate-200 text-slate-800 text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-medical-400/50 transition-all placeholder-slate-300";

export default function ScoutGrid({ proc, updateProcedure, opSide }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);

  const grid = proc.scoutGrid || [];
  const hasData = grid.some(r => r.equipment || r.position || r.note);

  const startEdit = () => {
    // Initialize with existing data or 4 empty rows
    const rows = grid.length > 0 ? grid.map(r => ({ ...r })) : DEFAULT_GRID.map(r => ({ ...r }));
    setDraft(rows);
    setEditing(true);
  };

  const updateRow = (idx, field, value) => {
    setDraft(d => d.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setDraft(d => [...d, { equipment: '', position: '', note: '' }]);
  };

  const removeRow = (idx) => {
    if (draft.length <= 1) return;
    setDraft(d => d.filter((_, i) => i !== idx));
  };

  const save = () => {
    // Filter out fully empty rows, keep at least the ones with data
    const cleaned = draft.filter(r => r.equipment || r.position || r.note);
    updateProcedure(proc.id, { scoutGrid: cleaned.length > 0 ? cleaned : [] });
    setEditing(false);
  };

  return (
    <div className="px-5 py-3 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Compass size={12} /> Scout Grid
        </p>
        {!editing && (
          <button onClick={startEdit} className="text-slate-300 hover:text-medical-600 transition-colors cursor-pointer">
            <Edit3 size={13} />
          </button>
        )}
      </div>

      {editing ? (
        /* ═══ EDIT MODE ═══ */
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1.5 px-1">
            <p className="col-span-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Equipment</p>
            <p className="col-span-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Position</p>
            <p className="col-span-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Practical Note</p>
            <p className="col-span-1"></p>
          </div>

          {draft.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-start">
              <div className="col-span-3">
                <input
                  value={row.equipment}
                  onChange={e => updateRow(i, 'equipment', e.target.value)}
                  placeholder="e.g. Bovie"
                  className={INPUT}
                />
              </div>
              <div className="col-span-4">
                <input
                  value={row.position}
                  onChange={e => updateRow(i, 'position', e.target.value)}
                  placeholder="e.g. {{OP_SIDE}} — Cephalad"
                  className={INPUT}
                  list="scout-positions"
                />
              </div>
              <div className="col-span-4">
                <input
                  value={row.note}
                  onChange={e => updateRow(i, 'note', e.target.value)}
                  placeholder="e.g. Angle 45° for Scrub access"
                  className={INPUT}
                />
              </div>
              <div className="col-span-1 flex justify-center pt-1">
                <button onClick={() => removeRow(i)}
                  className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer p-0.5"
                  title="Remove row">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}

          {/* Position presets datalist */}
          <datalist id="scout-positions">
            {POSITION_PRESETS.map(p => <option key={p} value={p} />)}
          </datalist>

          <div className="flex items-center justify-between pt-1">
            <button onClick={addRow}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-medical-600 hover:text-medical-700 cursor-pointer">
              <Plus size={11} /> Add Row
            </button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
              <button onClick={save} className="text-emerald-500 hover:text-emerald-400 p-1 cursor-pointer"><Check size={16} /></button>
            </div>
          </div>

          <p className="text-[9px] text-slate-400">
            💡 Positions use <code className="text-medical-500">{'{{OP_SIDE}}'}</code> and <code className="text-medical-500">{'{{NON_OP}}'}</code> — auto-mirrors with the side selector above.
          </p>
        </div>
      ) : hasData ? (
        /* ═══ DISPLAY MODE ═══ */
        <div className="scout-grid-table">
          <div className="scout-grid-header">
            <span className="col-span-3">Equipment</span>
            <span className="col-span-4">Position</span>
            <span className="col-span-5">Practical Note</span>
          </div>
          {grid.map((row, i) => (
            <div key={i} className={`scout-grid-row ${i % 2 === 0 ? 'scout-grid-row-even' : ''}`}>
              <span className="col-span-3 font-bold text-white text-sm">{row.equipment}</span>
              <span className="col-span-4 text-sm">
                <span className={opSide ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {resolveTokens(row.position, opSide)}
                </span>
              </span>
              <span className="col-span-5 text-xs text-slate-400 italic">{resolveTokens(row.note, opSide)}</span>
            </div>
          ))}
        </div>
      ) : (
        /* ═══ EMPTY STATE ═══ */
        <p className="text-sm text-slate-300 italic">No scout grid set — tap edit to map equipment positions</p>
      )}
    </div>
  );
}
