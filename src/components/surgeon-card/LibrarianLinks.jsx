import { useState } from 'react';
import { Edit3, Check, X, Plus, Trash2, ExternalLink } from 'lucide-react';

export default function LibrarianLinks({ surgeon, onUpdate, onAudit, vendorLinks }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState({ name: '', url: '' });
  const [showAdd, setShowAdd] = useState(false);

  const links = surgeon.vendorLinks || [];
  if (links.length === 0 && !showAdd) return null;

  const saveLink = (idx) => {
    const updated = [...links];
    updated[idx] = draft.name;
    onUpdate({ ...surgeon, vendorLinks: updated });
    if (onAudit) onAudit({ action: `Vendor Link Updated: ${draft.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setEditingIdx(null);
  };

  const deleteLink = (idx) => {
    const removed = links[idx];
    onUpdate({ ...surgeon, vendorLinks: links.filter((_, i) => i !== idx) });
    if (onAudit) onAudit({ action: `Vendor Link Removed: ${removed}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  const addLink = () => {
    if (!draft.name.trim()) return;
    onUpdate({ ...surgeon, vendorLinks: [...links, draft.name.trim()] });
    if (onAudit) onAudit({ action: `Vendor Link Added: ${draft.name}`, surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
    setDraft({ name: '', url: '' });
    setShowAdd(false);
  };

  return (
    <div className="px-5 py-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">📋 Librarian Links</p>
        <button onClick={() => { setDraft({ name: '', url: '' }); setShowAdd(true); }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-medical-600 hover:text-medical-700 cursor-pointer">
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((linkName, i) => {
          const resolved = vendorLinks.find(v => v.name.toLowerCase().includes(linkName.toLowerCase()));
          return editingIdx === i ? (
            <div key={i} className="flex items-center gap-1.5 bg-medical-50 border border-medical-200 rounded-full px-3 py-1">
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="w-28 text-xs bg-transparent border-none focus:outline-none text-medical-800 font-semibold" autoFocus
                onKeyDown={e => e.key === 'Enter' && saveLink(i)} />
              <button onClick={() => saveLink(i)} className="text-emerald-500 hover:text-emerald-400 cursor-pointer"><Check size={12} /></button>
              <button onClick={() => setEditingIdx(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={12} /></button>
            </div>
          ) : (
            <div key={i} className="nickname-row inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-medical-50 text-medical-700 border border-medical-200 group/link">
              {resolved?.url ? (
                <a href={resolved.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{linkName}</a>
              ) : (
                <span>{linkName}</span>
              )}
              <ExternalLink size={11} className="opacity-50" />
              <button onClick={() => { setDraft({ name: linkName, url: '' }); setEditingIdx(i); }}
                className="nickname-action text-slate-300 hover:text-medical-600 cursor-pointer ml-1"><Edit3 size={11} /></button>
              <button onClick={() => deleteLink(i)}
                className="nickname-action text-slate-300 hover:text-rose-500 cursor-pointer"><Trash2 size={11} /></button>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <div className="flex items-center gap-2 mt-2">
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Vendor name…" autoFocus
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-medical-400/50"
            onKeyDown={e => e.key === 'Enter' && addLink()} />
          <button onClick={addLink} className="text-emerald-500 hover:text-emerald-400 cursor-pointer"><Check size={14} /></button>
          <button onClick={() => { setShowAdd(false); setDraft({ name: '', url: '' }); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
