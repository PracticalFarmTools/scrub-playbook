import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES, GLOVE_COLOR_HEX } from '../data/gloves';
import { NEEDLE_TYPES, SUTURE_LIBRARY, SUTURE_SIZES } from '../data/sutures';
import { productsByKind, productIdForSuture } from '../data/products';
import { findPhiInProcedure } from '../data/phi';
import { cleanAliases } from '../data/boardMatch';
import { cleanInstruments, cleanSteps, normalizeBlocks, uid } from '../data/schema';
import SearchableDropdown from './SearchableDropdown';
import MicButton from './MicButton';
import PhiPause from './PhiPause';
import { useDialog } from '../hooks/useDialog';
import { readTechName } from '../hooks/useBook';

const LAYERS = ['Skin', 'Subcutaneous', 'Fascia', 'Deep', 'Unspecified'];
const APPROACHES = ['Anterior', 'Posterior', 'Lateral', 'Open', 'Laparoscopic', 'Robotic', 'Endoscopic', 'Arthroscopic', 'Percutaneous'];
const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  value: g.id,
  label: g.model,
  sublabel: `${g.brand} · ${g.type}`,
  color: GLOVE_COLOR_HEX[g.color] || '#94a3b8',
}));
const SUTURE_OPTIONS = SUTURE_LIBRARY.map(s => ({
  value: s.name,
  label: s.name,
  sublabel: `${s.type} · ${s.structure}`,
  color: s.color,
}));

function gloveFromId(id, size) {
  const glove = SURGICAL_GLOVES.find(g => g.id === id);
  if (!glove) return null;
  return { productId: glove.id, model: glove.model, brand: glove.brand, color: glove.color, size };
}

const SECTIONS = [
  ['editor-case', 'Case'],
  ['editor-room', 'Room'],
  ['editor-gloves', 'Gloves'],
  ['editor-flow', 'Flow'],
  ['editor-instruments', 'Instruments'],
  ['editor-trays', 'Trays'],
  ['editor-sutures', 'Sutures'],
  ['editor-implants', 'Implants'],
  ['editor-nicknames', 'Nicknames'],
  ['editor-people', 'People'],
  ['editor-end', 'End'],
  ['editor-official', 'Official card'],
];

function editorKey(draft, aliasText) {
  return JSON.stringify({ draft, aliasText });
}

export default function ProcedureEditor({ surgeon, procedure, copyOf = '', allowSpeech, allowOfficial, onClose, onSave }) {
  const [start] = useState(() => {
    const first = { ...procedure, blocks: normalizeBlocks(procedure.blocks) };
    const aliases = cleanAliases(procedure.aliases).join(', ');
    return { draft: first, aliases, key: editorKey(first, aliases) };
  });
  const [draft, setDraft] = useState(start.draft);
  const [phi, setPhi] = useState(/** @type {Array<import('../data/types').PhiSignal>} */ ([]));
  const [aliasText, setAliasText] = useState(start.aliases);
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [signer, setSigner] = useState(readTechName);
  const [signerMissing, setSignerMissing] = useState(false);
  const signerRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [sutureName, setSutureName] = useState(SUTURE_LIBRARY[0].name);
  const [sutureSize, setSutureSize] = useState('3-0');
  const [needle, setNeedle] = useState('CT-1');
  const [layer, setLayer] = useState('Fascia');
  const implants = useMemo(() => productsByKind('implant'), []);
  const dirty = Boolean(copyOf) || editorKey(draft, aliasText) !== start.key;
  const requestClose = () => (dirty ? setLeaving(true) : onClose());
  const unnamed = !procedure.name || procedure.name === 'All cases (imported)';
  const dialogRef = useDialog({ onClose: requestClose, initialFocus: copyOf || unnamed ? nameRef : undefined });

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const jump = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView?.({ block: 'start' });
    target.focus({ preventScroll: true });
  };
  const sections = SECTIONS.filter(([id]) => id !== 'editor-official' || allowOfficial);
  const checkedOfficial = () => setDraft(d => ({ ...d, official: { ...d.official, reviewedAt: new Date().toISOString() } }));
  const reviewedAt = draft.official?.reviewedAt;

  const blocks = draft.blocks;
  const setBlocks = (next) => setDraft(d => ({ ...d, blocks: { ...d.blocks, ...next } }));

  const save = () => {
    if (!signer.trim()) {
      setSignerMissing(true);
      signerRef.current?.focus();
      return;
    }
    const aliases = cleanAliases(aliasText);
    const hits = findPhiInProcedure({ ...draft, aliases });
    if (hits.length) {
      setPhi(hits);
      return;
    }
    const steps = cleanSteps(draft.blocks.steps);
    onSave({
      ...draft,
      name: draft.name.trim() || 'Untitled case',
      approach: (draft.approach || '').trim().slice(0, 60),
      aliases,
      blocks: { ...draft.blocks, steps, instruments: cleanInstruments(draft.blocks.instruments) },
    }, { by: signer.trim() });
    onClose();
  };

  const input = 'w-full min-h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50';
  const label = 'block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5';
  const small = 'min-h-11 min-w-11 px-2 text-xs font-bold cursor-pointer';
  const sectionClass = 'space-y-3 scroll-mt-2 focus:outline-none';
  const heading = 'text-sm font-bold text-medical-700';
  const add = 'min-h-11 text-xs font-bold text-medical-700 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1';

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="procedure-editor-title" className="absolute inset-y-0 right-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col focus:outline-none">
        <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-3 py-1 flex items-center justify-between">
          <button type="button" onClick={requestClose} className="tap-icon gap-1 px-2 text-medical-100 hover:text-white text-sm font-medium cursor-pointer">
            <ChevronLeft size={18} /> Cancel
          </button>
          <h2 id="procedure-editor-title" className="text-white font-bold text-sm truncate px-2">{surgeon.name}</h2>
          <button type="button" onClick={save} className="min-h-11 px-4 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-lg cursor-pointer">Save</button>
        </div>
        <nav aria-label="Jump to a section" className="shrink-0 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1">
          {sections.map(([id, name]) => (
            <button key={id} type="button" onClick={() => jump(id)} className="shrink-0 min-h-11 px-3 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">{name}</button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {copyOf && (
            <p className="text-sm text-medical-900 bg-medical-50 border border-medical-200 rounded-xl px-3 py-2">
              A copy of {copyOf}. Change the name and the side, then save. It starts unconfirmed.
            </p>
          )}
          {(procedure.confirmations?.length > 0 || procedure.lastConfirmedAt) && !procedure.disputed && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              A change clears “Matched a case.” Confirm it again after the next case that matches.
            </p>
          )}
          <section id="editor-case" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Case</h3>
            <div>
              <label htmlFor="procedure-name" className={label}>Procedure, as the board writes it</label>
              <input ref={nameRef} id="procedure-name" value={draft.name === 'All cases (imported)' ? '' : draft.name} placeholder="Right primary total knee" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={input} />
            </div>
            <div>
              <label htmlFor="procedure-approach" className={label}>Approach</label>
              <input id="procedure-approach" list="scrub-approaches" maxLength={60} value={draft.approach || ''} placeholder="Anterior, laparoscopic, open" onChange={e => setDraft(d => ({ ...d, approach: e.target.value.slice(0, 60) }))} className={input} />
              <datalist id="scrub-approaches">{APPROACHES.map(item => <option key={item} value={item} />)}</datalist>
            </div>
            <div>
              <label htmlFor="procedure-aliases" className={label}>Other names on the board</label>
              <input
                id="procedure-aliases"
                value={aliasText}
                placeholder="R TKA, DAA THA"
                onChange={e => setAliasText(e.target.value)}
                className={input}
              />
              <p className="text-xs text-slate-600 mt-1">Separate with commas. A board line with one of these names opens this card. Sides still have to match.</p>
            </div>
          </section>

          <section id="editor-room" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Room</h3>
            <div>
              <label htmlFor="procedure-position" className={label}>Position</label>
              <textarea id="procedure-position" value={blocks.position?.text || ''} rows={2} placeholder="Supine, arms out on boards" onChange={e => setBlocks({ position: { ...blocks.position, text: e.target.value } })} className={input} />
            </div>
            <div>
              <label htmlFor="procedure-prep" className={label}>Prep</label>
              <textarea id="procedure-prep" value={blocks.prep?.text || ''} rows={2} placeholder="Chlorhexidine, toes to mid-thigh" onChange={e => setBlocks({ prep: { ...blocks.prep, text: e.target.value } })} className={input} />
            </div>
            <div>
              <label htmlFor="procedure-drapes" className={label}>Drapes</label>
              <textarea id="procedure-drapes" value={blocks.drapes?.text || ''} rows={2} placeholder="Extremity drape, stockinette, Ioban" onChange={e => setBlocks({ drapes: { ...blocks.drapes, text: e.target.value } })} className={input} />
            </div>

            <div>
              <label htmlFor="procedure-room" className={label}>How the room starts</label>
              <textarea id="procedure-room" value={blocks.room.text} rows={2} placeholder="Lights down, quiet room" onChange={e => setBlocks({ room: { ...blocks.room, text: e.target.value } })} className={input} />
            </div>

            <div>
              <label htmlFor="procedure-equipment" className={label}>Equipment and settings</label>
              <textarea id="procedure-equipment" value={blocks.equipment.text} rows={2} placeholder="Bovie 35/35. Tourniquet 250." onChange={e => setBlocks({ equipment: { ...blocks.equipment, text: e.target.value } })} className={input} />
            </div>
          </section>

          <section id="editor-gloves" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Gloves</h3>
            {['outer', 'inner'].map(which => (
              <div key={which} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <p className={label}>{which}</p>
                  <SearchableDropdown
                    label={`${which === 'outer' ? 'Outer' : 'Inner'} glove`}
                    options={[{ value: '', label: 'None', sublabel: '' }, ...GLOVE_OPTIONS]}
                    value={blocks.gloves?.[which]?.productId || ''}
                    onChange={(id) => setBlocks({ gloves: { ...blocks.gloves, [which]: id ? gloveFromId(id, blocks.gloves?.[which]?.size || '7.0') : null } })}
                    placeholder="Search gloves"
                    renderSelected={opt => <span>{opt?.label || 'None'}</span>}
                  />
                </div>
                <div>
                  <label htmlFor={`glove-size-${which}`} className={label}>Size</label>
                  <select id={`glove-size-${which}`} value={blocks.gloves?.[which]?.size || '7.0'} onChange={e => setBlocks({ gloves: { ...blocks.gloves, [which]: blocks.gloves?.[which] ? { ...blocks.gloves[which], size: e.target.value } : null } })} className={input}>
                    {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </section>

          <section id="editor-flow" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Case flow</h3>
            {(blocks.steps || []).map((step, index) => (
              <div key={step.id} className="space-y-2 border border-slate-100 rounded-xl p-3">
                <input aria-label={`Step ${index + 1}`} value={step.title} maxLength={80} placeholder="Step" onChange={e => setBlocks({ steps: blocks.steps.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} className={input} />
                <input aria-label={`Have ready for step ${index + 1}`} value={step.ready || ''} maxLength={200} placeholder="Have ready" onChange={e => setBlocks({ steps: blocks.steps.map((item, i) => i === index ? { ...item, ready: e.target.value } : item) })} className={input} />
                <input aria-label={`What they do or say at step ${index + 1}`} value={step.habit || ''} maxLength={200} placeholder="What they do or say" onChange={e => setBlocks({ steps: blocks.steps.map((item, i) => i === index ? { ...item, habit: e.target.value } : item) })} className={input} />
                <div className="flex gap-1">
                  <button type="button" disabled={index === 0} onClick={() => {
                    const steps = [...blocks.steps];
                    [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                    setBlocks({ steps });
                  }} aria-label={`Move step ${index + 1} up`} className={`${small} text-medical-700 disabled:opacity-30`}>Up</button>
                  <button type="button" disabled={index === blocks.steps.length - 1} onClick={() => {
                    const steps = [...blocks.steps];
                    [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
                    setBlocks({ steps });
                  }} aria-label={`Move step ${index + 1} down`} className={`${small} text-medical-700 disabled:opacity-30`}>Down</button>
                  <button type="button" onClick={() => setBlocks({ steps: blocks.steps.filter((_, i) => i !== index) })} aria-label={`Delete step ${index + 1}`} className={`${small} text-rose-600`}>Delete</button>
                </div>
              </div>
            ))}
            <button type="button" disabled={(blocks.steps || []).length >= 30} onClick={() => setBlocks({ steps: [...(blocks.steps || []), { id: uid(), title: '', ready: '', habit: '' }] })} className={add}><Plus size={14} /> Add step</button>
          </section>

          <section id="editor-instruments" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Instruments</h3>
            {(blocks.instruments || []).map((item, index) => (
              <div key={item.id} className="grid grid-cols-2 gap-2">
                <input aria-label={`Instrument ${index + 1}`} value={item.name} maxLength={80} placeholder="Instrument" onChange={e => setBlocks({ instruments: blocks.instruments.map((row, i) => i === index ? { ...row, name: e.target.value } : row) })} className={input} />
                <input aria-label={`Where instrument ${index + 1} comes from`} list="scrub-instrument-from" value={item.from || ''} maxLength={80} placeholder="From" onChange={e => setBlocks({ instruments: blocks.instruments.map((row, i) => i === index ? { ...row, from: e.target.value } : row) })} className={input} />
                <label className="flex items-center gap-2 min-h-11 text-xs text-slate-700">
                  <input type="checkbox" className="w-5 h-5 shrink-0" checked={Boolean(item.mayo)} onChange={e => setBlocks({ instruments: blocks.instruments.map((row, i) => i === index ? { ...row, mayo: e.target.checked } : row) })} />
                  On the Mayo
                </label>
                <button type="button" onClick={() => setBlocks({ instruments: blocks.instruments.filter((_, i) => i !== index) })} aria-label={`Delete instrument ${index + 1}`} className={`${small} text-rose-600 justify-self-end`}>Delete</button>
              </div>
            ))}
            <datalist id="scrub-instrument-from">
              {(blocks.trays || []).map(tray => tray.commonName).filter(Boolean).map(name => <option key={name} value={name} />)}
              <option value="Peel pack" />
              <option value="Extra" />
            </datalist>
            <button type="button" disabled={(blocks.instruments || []).length >= 60} onClick={() => setBlocks({ instruments: [...(blocks.instruments || []), { id: uid(), name: '', from: '', mayo: false }] })} className={add}><Plus size={14} /> Add instrument</button>
          </section>

          <section id="editor-trays" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Trays</h3>
            {blocks.trays.map((tray, index) => (
              <div key={tray.id} className="grid grid-cols-2 gap-2">
                <input aria-label={`Tray ${index + 1}, what the team calls it`} value={tray.commonName} placeholder="What the team calls it" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, commonName: e.target.value } : t) })} className={input} />
                <input aria-label={`Tray ${index + 1}, SPD name`} value={tray.spdName} placeholder="SPD name" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, spdName: e.target.value } : t) })} className={input} />
                <input aria-label={`Tray ${index + 1}, company`} value={tray.vendorName} placeholder="Company, if it is theirs" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, vendorName: e.target.value } : t) })} className={input} />
                <div className="flex gap-2">
                  <select aria-label={`Tray ${index + 1}, open or hold`} value={tray.openOrHold} onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, openOrHold: e.target.value } : t) })} className={input}>
                    <option value="open">Open</option>
                    <option value="hold">Hold</option>
                  </select>
                  <button type="button" onClick={() => setBlocks({ trays: blocks.trays.filter((_, i) => i !== index) })} aria-label={`Delete tray ${index + 1}`} className="tap-icon shrink-0 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBlocks({ trays: [...blocks.trays, { id: uid(), commonName: '', spdName: '', vendorName: '', openOrHold: 'open' }] })} className={add}><Plus size={14} /> Add tray</button>
          </section>

          <section id="editor-sutures" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Sutures</h3>
            <div className="grid grid-cols-2 gap-2">
              <SearchableDropdown label="Suture" options={SUTURE_OPTIONS} value={sutureName} onChange={setSutureName} placeholder="Suture" renderSelected={opt => (
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: opt.color }} />{opt.label}</span>
              )} />
              <select aria-label="Suture size" value={sutureSize} onChange={e => setSutureSize(e.target.value)} className={input}>{SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}</select>
              <select aria-label="Needle" value={needle} onChange={e => setNeedle(e.target.value)} className={input + ' col-span-2'}>{NEEDLE_TYPES.map(n => <option key={n.code} value={n.code}>{n.code} — {n.description}</option>)}</select>
              <select aria-label="Layer" value={layer} onChange={e => setLayer(e.target.value)} className={input + ' col-span-2'}>{LAYERS.map(item => <option key={item}>{item}</option>)}</select>
            </div>
            <button type="button" onClick={() => {
              const found = SUTURE_LIBRARY.find(s => s.name === sutureName);
              if (!found) return;
              setBlocks({ sutures: [...blocks.sutures, {
                id: uid(), layer, name: found.name, size: sutureSize, needle, color: found.color, textColor: found.textColor,
                open: '', hold: '', productId: productIdForSuture(found.name), catalogNumber: '',
              }] });
            }} className={add}><Plus size={14} /> Add suture</button>
            <div className="flex flex-wrap gap-2">
              {blocks.sutures.map(suture => (
                <button key={suture.id} type="button" onClick={() => setBlocks({ sutures: blocks.sutures.filter(s => s.id !== suture.id) })} aria-label={`Remove ${suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? `${suture.layer} ` : ''}${suture.name} ${suture.size} ${suture.needle}`} className="min-h-11 rounded-full px-3 text-xs font-bold cursor-pointer" style={{ background: suture.color, color: suture.textColor }}>
                  {suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? `${suture.layer} ` : ''}{suture.name} {suture.size} {suture.needle} ×
                </button>
              ))}
            </div>
            {blocks.sutures.map(suture => (
              <div key={`${suture.id}-meta`} className="grid grid-cols-3 gap-2">
                <input aria-label={`${suture.name} ${suture.size}, open`} value={suture.open} placeholder="Open" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, open: e.target.value } : s) })} className={input} />
                <input aria-label={`${suture.name} ${suture.size}, hold`} value={suture.hold} placeholder="Hold" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, hold: e.target.value } : s) })} className={input} />
                <input aria-label={`${suture.name} ${suture.size}, catalog code`} value={suture.catalogNumber} placeholder="Catalog code" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, catalogNumber: e.target.value } : s) })} className={input} />
              </div>
            ))}
          </section>

          <section id="editor-implants" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Implants</h3>
            {blocks.implants.map((implant, index) => (
              <div key={implant.id} className="space-y-2 border border-slate-100 rounded-xl p-3">
                <input aria-label={`Implant ${index + 1}, system name`} value={implant.systemName} placeholder="System name, such as ATTUNE" onChange={e => setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, systemName: e.target.value, productId: implants.find(p => p.name === e.target.value)?.id || t.productId } : t) })} className={input} />
                <select aria-label={`Implant ${index + 1}, product page`} value={implant.productId || ''} onChange={e => {
                  const product = implants.find(p => p.id === e.target.value);
                  setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, productId: product?.id || null, systemName: product?.name || t.systemName } : t) });
                }} className={input}>
                  <option value="">No verified product page</option>
                  {implants.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <label className="flex items-center gap-2 min-h-11 text-xs text-slate-700">
                  <input type="checkbox" className="w-5 h-5 shrink-0" checked={Boolean(implant.repExpected)} onChange={e => setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, repExpected: e.target.checked } : t) })} />
                  Rep expected
                </label>
                <button type="button" onClick={() => setBlocks({ implants: blocks.implants.filter((_, i) => i !== index) })} aria-label={`Remove implant ${index + 1}`} className={`${small} text-rose-600`}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setBlocks({ implants: [...blocks.implants, { id: uid(), systemName: '', repExpected: false, productId: null, catalogNumber: '', overrideUrl: '' }] })} className={add}><Plus size={14} /> Add implant</button>
          </section>

          
          <section id="editor-nicknames" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>Nicknames</h3>
            <NicknameAdder onAdd={(nickname) => setBlocks({ nicknames: [...blocks.nicknames, nickname] })} />
            {blocks.nicknames.map((nick, index) => (
              <div key={`${nick.nickname}-${index}`} className="flex items-center justify-between text-sm bg-slate-900 text-white rounded-xl pl-3">
                <span>“{nick.nickname}” → {nick.actual}</span>
                <button type="button" onClick={() => setBlocks({ nicknames: blocks.nicknames.filter((_, i) => i !== index) })} aria-label={`Delete nickname ${nick.nickname}`} className="tap-icon shrink-0 text-slate-300 hover:text-white cursor-pointer"><Trash2 size={14} /></button>
              </div>
            ))}
          </section>

          <PeopleEditor people={blocks.people} onChange={(people) => setBlocks({ people })} />

          <section id="editor-end" tabIndex={-1} className={sectionClass}>
            <h3 className={heading}>End of case</h3>
            <div>
              <label htmlFor="procedure-end" className={label}>Dressing and end of case</label>
              <textarea id="procedure-end" value={blocks.endOfCase.text} rows={2} placeholder="Dressing, drains, specimens" onChange={e => setBlocks({ endOfCase: { ...blocks.endOfCase, text: e.target.value } })} className={input} />
            </div>

            <div>
              <label htmlFor="procedure-note" className={label}>Note</label>
              <div className="relative">
                <textarea id="procedure-note" value={blocks.note.text} rows={4} onChange={e => setBlocks({ note: { ...blocks.note, text: e.target.value } })} className={input + ' pr-14'} placeholder="Sequence that does not fit a field." />
                {allowSpeech && (
                  <MicButton className="absolute right-2 top-2" onTranscript={(text) => setBlocks({ note: { ...blocks.note, text: `${blocks.note.text ? `${blocks.note.text.trim()} ` : ''}${text}` } })} />
                )}
              </div>
              {allowSpeech && (
                <p className="text-xs text-slate-600 mt-1">Dictation sends audio to your browser’s speech service. Do not say a patient’s name.</p>
              )}
            </div>
          </section>

          {allowOfficial && (
            <section id="editor-official" tabIndex={-1} className={`${sectionClass} border border-slate-200 rounded-xl p-3`}>
              <h3 className={heading}>Official card</h3>
              <input aria-label="Official card name" value={draft.official?.label || ''} placeholder="Epic preference card" onChange={e => setDraft(d => ({ ...d, official: { ...d.official, label: e.target.value } }))} className={input} />
              <textarea aria-label="What the official card says" value={draft.official?.note || ''} rows={2} placeholder="What the official card says, in your words" onChange={e => setDraft(d => ({ ...d, official: { ...d.official, note: e.target.value } }))} className={input} />
              <p className="text-xs text-slate-600" aria-live="polite">
                {reviewedAt
                  ? `Checked against the official card ${new Date(reviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                  : 'Not checked against the official card yet.'}
              </p>
              <button type="button" onClick={checkedOfficial} className="min-h-11 px-4 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold cursor-pointer">I checked the official card today</button>
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-3 space-y-2">
          <div>
            <label htmlFor="procedure-signer" className={label}>Your name</label>
            <input
              ref={signerRef}
              id="procedure-signer"
              value={signer}
              maxLength={80}
              autoComplete="name"
              aria-invalid={signerMissing && !signer.trim()}
              aria-describedby="procedure-signer-help"
              onChange={e => { setSigner(e.target.value); setSignerMissing(false); }}
              className={input}
            />
            <p id="procedure-signer-help" role={signerMissing ? 'alert' : undefined} className={`text-xs mt-1 ${signerMissing ? 'text-rose-700 font-semibold' : 'text-slate-600'}`}>
              {signerMissing ? 'Type your name to save. It is signed with this change.' : 'Signed with this change by this phone, so others can see who changed the card.'}
            </p>
          </div>
          <button type="button" onClick={save} className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Save procedure</button>
        </div>
      </div>
      {phi.length > 0 && <PhiPause signals={phi} next="Take that detail out, then save the setup." onEdit={() => setPhi([])} />}
      {leaving && <DiscardPrompt name={draft.name || 'this card'} onKeep={() => setLeaving(false)} onDiscard={onClose} />}
    </div>
  );
}

function DiscardPrompt({ name, onKeep, onDiscard }) {
  const keepRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const dialogRef = useDialog({ onClose: onKeep, initialFocus: keepRef });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-body" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3 focus:outline-none">
        <h2 id="discard-title" className="text-base font-bold text-slate-900">Leave without saving?</h2>
        <p id="discard-body" className="text-sm text-slate-700">Your changes to {name} are not saved yet.</p>
        <div className="flex flex-col gap-2">
          <button ref={keepRef} type="button" onClick={onKeep} className="min-h-11 rounded-xl bg-medical-600 text-white text-sm font-bold cursor-pointer">Keep editing</button>
          <button type="button" onClick={onDiscard} className="min-h-11 rounded-xl bg-rose-50 text-rose-800 text-sm font-bold cursor-pointer">Discard changes</button>
        </div>
      </div>
    </div>
  );
}

function NicknameAdder({ onAdd }) {
  const [nickname, setNickname] = useState('');
  const [actual, setActual] = useState('');
  const input = 'w-full min-h-11 rounded-xl bg-slate-50 border border-slate-200 text-sm px-3 py-2';
  return (
    <div className="flex gap-2">
      <input aria-label="Nickname they use" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="They call it…" className={input} />
      <input aria-label="What the nickname means" value={actual} onChange={e => setActual(e.target.value)} placeholder="It is…" className={input} />
      <button type="button" onClick={() => { if (nickname && actual) { onAdd({ nickname, actual }); setNickname(''); setActual(''); } }} aria-label="Add nickname" className="shrink-0 w-11 h-11 rounded-xl bg-medical-600 text-white cursor-pointer"><Plus size={16} className="mx-auto" /></button>
    </div>
  );
}

function PeopleEditor({ people, onChange }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('PA');
  const input = 'w-full min-h-11 rounded-xl bg-slate-50 border border-slate-200 text-sm px-3 py-2';
  return (
    <section id="editor-people" tabIndex={-1} className="space-y-3 scroll-mt-2 focus:outline-none">
      <h3 className="text-sm font-bold text-medical-700">People in the room</h3>
      <div className="flex gap-2">
        <input aria-label="Person’s name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={input} />
        <select aria-label="Role" value={role} onChange={e => setRole(e.target.value)} className={input}>
          {['PA', 'Resident', 'Fellow', 'NP', 'RNFA'].map(r => <option key={r}>{r}</option>)}
        </select>
        <button type="button" onClick={() => { if (name.trim()) { onChange([...people, { name: name.trim(), role, gloveModel: '', gloveBrand: '', gloveSize: '' }]); setName(''); } }} aria-label="Add person" className="shrink-0 w-11 h-11 rounded-xl bg-medical-600 text-white cursor-pointer"><Plus size={16} className="mx-auto" /></button>
      </div>
      {people.map((person, index) => (
        <div key={`${person.name}-${index}`} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl pl-3">
          <span>{person.name} <span className="text-slate-500">({person.role})</span></span>
          <button type="button" onClick={() => onChange(people.filter((_, i) => i !== index))} aria-label={`Remove ${person.name}`} className="tap-icon shrink-0 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 size={14} /></button>
        </div>
      ))}
    </section>
  );
}
