import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES, GLOVE_COLOR_HEX } from '../data/gloves';
import { NEEDLE_TYPES, SUTURE_LIBRARY, SUTURE_SIZES } from '../data/sutures';
import { productsByKind, productIdForSuture } from '../data/products';
import { findPhiInProcedure } from '../data/phi';
import { uid } from '../data/schema';
import SearchableDropdown from './SearchableDropdown';
import MicButton from './MicButton';
import PhiPause from './PhiPause';

const LAYERS = ['Skin', 'Subcutaneous', 'Fascia', 'Deep', 'Unspecified'];
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

export default function ProcedureEditor({ surgeon, procedure, allowSpeech, allowOfficial, onClose, onSave }) {
  const [draft, setDraft] = useState(procedure);
  const [phi, setPhi] = useState([]);
  const [sutureName, setSutureName] = useState(SUTURE_LIBRARY[0].name);
  const [sutureSize, setSutureSize] = useState('3-0');
  const [needle, setNeedle] = useState('CT-1');
  const [layer, setLayer] = useState('Fascia');
  const implants = useMemo(() => productsByKind('implant'), []);

  const blocks = draft.blocks;
  const setBlocks = (next) => setDraft(d => ({ ...d, blocks: { ...d.blocks, ...next } }));

  const save = () => {
    const hits = findPhiInProcedure(draft);
    if (hits.length) {
      setPhi(hits);
      return;
    }
    onSave({ ...draft, name: draft.name.trim() || 'Untitled case' });
    onClose();
  };

  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50';
  const label = 'block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="absolute inset-y-0 right-0 w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 flex items-center justify-between">
          <button type="button" onClick={onClose} className="flex items-center gap-1 text-medical-200 hover:text-white text-sm font-medium cursor-pointer">
            <ChevronLeft size={18} /> Cancel
          </button>
          <h2 className="text-white font-bold text-sm truncate px-2">{surgeon.name}</h2>
          <button type="button" onClick={save} className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-lg cursor-pointer">Save</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {(procedure.confirmations?.length > 0 || procedure.lastConfirmedAt) && !procedure.disputed && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              A change clears “Matched a case.” Confirm it again after the next case that matches.
            </p>
          )}
          <div>
            <label className={label}>Procedure, as the board writes it</label>
            <input value={draft.name === 'All cases (imported)' ? '' : draft.name} placeholder="Right primary total knee" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={input} />
          </div>

          <div>
            <label className={label}>How the room starts</label>
            <textarea value={blocks.room.text} rows={2} placeholder="Supine, lights down, quiet room" onChange={e => setBlocks({ room: { ...blocks.room, text: e.target.value } })} className={input} />
          </div>

          <div>
            <label className={label}>Equipment last observed</label>
            <textarea value={blocks.equipment.text} rows={2} placeholder="Bovie 35/35. Tourniquet 250." onChange={e => setBlocks({ equipment: { ...blocks.equipment, text: e.target.value } })} className={input} />
          </div>

          <section className="space-y-2">
            <p className="text-sm font-bold text-medical-700">Trays</p>
            {blocks.trays.map((tray, index) => (
              <div key={tray.id} className="grid grid-cols-2 gap-2">
                <input value={tray.commonName} placeholder="What the team calls it" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, commonName: e.target.value } : t) })} className={input} />
                <input value={tray.spdName} placeholder="SPD name" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, spdName: e.target.value } : t) })} className={input} />
                <input value={tray.vendorName} placeholder="Company, if it is theirs" onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, vendorName: e.target.value } : t) })} className={input} />
                <div className="flex gap-2">
                  <select value={tray.openOrHold} onChange={e => setBlocks({ trays: blocks.trays.map((t, i) => i === index ? { ...t, openOrHold: e.target.value } : t) })} className={input}>
                    <option value="open">Open</option>
                    <option value="hold">Hold</option>
                  </select>
                  <button type="button" onClick={() => setBlocks({ trays: blocks.trays.filter((_, i) => i !== index) })} className="text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBlocks({ trays: [...blocks.trays, { id: uid(), commonName: '', spdName: '', vendorName: '', openOrHold: 'open' }] })} className="text-xs font-bold text-medical-700 cursor-pointer inline-flex items-center gap-1"><Plus size={14} /> Add tray</button>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold text-medical-700">Implants</p>
            {blocks.implants.map((implant, index) => (
              <div key={implant.id} className="space-y-2 border border-slate-100 rounded-xl p-3">
                <input value={implant.systemName} placeholder="System name, such as ATTUNE" onChange={e => setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, systemName: e.target.value, productId: implants.find(p => p.name === e.target.value)?.id || t.productId } : t) })} className={input} />
                <select value={implant.productId || ''} onChange={e => {
                  const product = implants.find(p => p.id === e.target.value);
                  setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, productId: product?.id || null, systemName: product?.name || t.systemName } : t) });
                }} className={input}>
                  <option value="">No verified product page</option>
                  {implants.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={Boolean(implant.repExpected)} onChange={e => setBlocks({ implants: blocks.implants.map((t, i) => i === index ? { ...t, repExpected: e.target.checked } : t) })} />
                  Rep expected
                </label>
                <button type="button" onClick={() => setBlocks({ implants: blocks.implants.filter((_, i) => i !== index) })} className="text-xs text-rose-500 cursor-pointer">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setBlocks({ implants: [...blocks.implants, { id: uid(), systemName: '', repExpected: false, productId: null, catalogNumber: '', overrideUrl: '' }] })} className="text-xs font-bold text-medical-700 cursor-pointer inline-flex items-center gap-1"><Plus size={14} /> Add implant</button>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold text-medical-700">Sutures</p>
            <div className="grid grid-cols-2 gap-2">
              <SearchableDropdown options={SUTURE_OPTIONS} value={sutureName} onChange={setSutureName} placeholder="Suture" renderSelected={opt => (
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: opt.color }} />{opt.label}</span>
              )} />
              <select value={sutureSize} onChange={e => setSutureSize(e.target.value)} className={input}>{SUTURE_SIZES.map(s => <option key={s}>{s}</option>)}</select>
              <select value={needle} onChange={e => setNeedle(e.target.value)} className={input + ' col-span-2'}>{NEEDLE_TYPES.map(n => <option key={n.code} value={n.code}>{n.code} — {n.description}</option>)}</select>
              <select value={layer} onChange={e => setLayer(e.target.value)} className={input + ' col-span-2'}>{LAYERS.map(item => <option key={item}>{item}</option>)}</select>
            </div>
            <button type="button" onClick={() => {
              const found = SUTURE_LIBRARY.find(s => s.name === sutureName);
              if (!found) return;
              setBlocks({ sutures: [...blocks.sutures, {
                id: uid(), layer, name: found.name, size: sutureSize, needle, color: found.color, textColor: found.textColor,
                open: '', hold: '', productId: productIdForSuture(found.name), catalogNumber: '',
              }] });
            }} className="text-xs font-bold text-medical-700 cursor-pointer inline-flex items-center gap-1"><Plus size={14} /> Add suture</button>
            <div className="flex flex-wrap gap-2">
              {blocks.sutures.map(suture => (
                <button key={suture.id} type="button" onClick={() => setBlocks({ sutures: blocks.sutures.filter(s => s.id !== suture.id) })} className="rounded-full px-3 py-1 text-xs font-bold cursor-pointer" style={{ background: suture.color, color: suture.textColor }}>
                  {suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? `${suture.layer} ` : ''}{suture.name} {suture.size} {suture.needle} ×
                </button>
              ))}
            </div>
            {blocks.sutures.map(suture => (
              <div key={`${suture.id}-meta`} className="grid grid-cols-3 gap-2">
                <input value={suture.open} placeholder="Open" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, open: e.target.value } : s) })} className={input} />
                <input value={suture.hold} placeholder="Hold" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, hold: e.target.value } : s) })} className={input} />
                <input value={suture.catalogNumber} placeholder="Catalog code" onChange={e => setBlocks({ sutures: blocks.sutures.map(s => s.id === suture.id ? { ...s, catalogNumber: e.target.value } : s) })} className={input} />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <p className="text-sm font-bold text-medical-700">Gloves</p>
            {['outer', 'inner'].map(which => (
              <div key={which} className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={label}>{which}</label>
                  <SearchableDropdown
                    options={[{ value: '', label: 'None', sublabel: '' }, ...GLOVE_OPTIONS]}
                    value={blocks.gloves?.[which]?.productId || ''}
                    onChange={(id) => setBlocks({ gloves: { ...blocks.gloves, [which]: id ? gloveFromId(id, blocks.gloves?.[which]?.size || '7.0') : null } })}
                    placeholder="Search gloves"
                    renderSelected={opt => <span>{opt?.label || 'None'}</span>}
                  />
                </div>
                <div>
                  <label className={label}>Size</label>
                  <select value={blocks.gloves?.[which]?.size || '7.0'} onChange={e => setBlocks({ gloves: { ...blocks.gloves, [which]: blocks.gloves?.[which] ? { ...blocks.gloves[which], size: e.target.value } : null } })} className={input}>
                    {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-bold text-medical-700">Nicknames</p>
            <NicknameAdder onAdd={(nickname) => setBlocks({ nicknames: [...blocks.nicknames, nickname] })} />
            {blocks.nicknames.map((nick, index) => (
              <div key={`${nick.nickname}-${index}`} className="flex items-center justify-between text-sm bg-slate-900 text-white rounded-xl px-3 py-2">
                <span>“{nick.nickname}” → {nick.actual}</span>
                <button type="button" onClick={() => setBlocks({ nicknames: blocks.nicknames.filter((_, i) => i !== index) })} className="text-slate-400 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            ))}
          </section>

          <div>
            <label className={label}>End of the case</label>
            <textarea value={blocks.endOfCase.text} rows={2} placeholder="Dressing, drains, specimens" onChange={e => setBlocks({ endOfCase: { ...blocks.endOfCase, text: e.target.value } })} className={input} />
          </div>

          <PeopleEditor people={blocks.people} onChange={(people) => setBlocks({ people })} />

          <div>
            <label className={label}>Note</label>
            <div className="relative">
              <textarea value={blocks.note.text} rows={4} onChange={e => setBlocks({ note: { ...blocks.note, text: e.target.value } })} className={input + ' pr-11'} placeholder="Sequence that does not fit a field." />
              {allowSpeech && (
                <MicButton className="absolute right-2 top-2" onTranscript={(text) => setBlocks({ note: { ...blocks.note, text: `${blocks.note.text ? `${blocks.note.text.trim()} ` : ''}${text}` } })} />
              )}
            </div>
            {allowSpeech && (
              <p className="text-[11px] text-slate-400 mt-1">Dictation sends audio to your browser’s speech service. Do not say a patient’s name.</p>
            )}
          </div>

          {allowOfficial && (
            <section className="space-y-2 border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-bold text-slate-700">Official card pointer</p>
              <input value={draft.official?.label || ''} placeholder="Epic preference card" onChange={e => setDraft(d => ({ ...d, official: { ...d.official, label: e.target.value, reviewedAt: new Date().toISOString() } }))} className={input} />
              <textarea value={draft.official?.note || ''} rows={2} placeholder="What the official card says, in your words" onChange={e => setDraft(d => ({ ...d, official: { ...d.official, note: e.target.value, reviewedAt: new Date().toISOString() } }))} className={input} />
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={save} className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Save procedure</button>
        </div>
      </div>
      {phi.length > 0 && <PhiPause signals={phi} onEdit={() => setPhi([])} />}
    </div>
  );
}

function NicknameAdder({ onAdd }) {
  const [nickname, setNickname] = useState('');
  const [actual, setActual] = useState('');
  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-sm px-3 py-2';
  return (
    <div className="flex gap-2">
      <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="They call it…" className={input} />
      <input value={actual} onChange={e => setActual(e.target.value)} placeholder="It is…" className={input} />
      <button type="button" onClick={() => { if (nickname && actual) { onAdd({ nickname, actual }); setNickname(''); setActual(''); } }} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white cursor-pointer"><Plus size={16} className="mx-auto" /></button>
    </div>
  );
}

function PeopleEditor({ people, onChange }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('PA');
  const input = 'w-full rounded-xl bg-slate-50 border border-slate-200 text-sm px-3 py-2';
  return (
    <section className="space-y-2">
      <p className="text-sm font-bold text-medical-700">People in the room</p>
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={input} />
        <select value={role} onChange={e => setRole(e.target.value)} className={input}>
          {['PA', 'Resident', 'Fellow', 'NP', 'RNFA'].map(r => <option key={r}>{r}</option>)}
        </select>
        <button type="button" onClick={() => { if (name.trim()) { onChange([...people, { name: name.trim(), role, gloveModel: '', gloveBrand: '', gloveSize: '' }]); setName(''); } }} className="shrink-0 w-10 h-10 rounded-xl bg-medical-600 text-white cursor-pointer"><Plus size={16} className="mx-auto" /></button>
      </div>
      {people.map((person, index) => (
        <div key={`${person.name}-${index}`} className="flex justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
          <span>{person.name} <span className="text-slate-400">({person.role})</span></span>
          <button type="button" onClick={() => onChange(people.filter((_, i) => i !== index))} className="text-slate-400 cursor-pointer"><Trash2 size={14} /></button>
        </div>
      ))}
    </section>
  );
}
