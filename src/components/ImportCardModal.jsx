import { useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';

/**
 * Paste-to-import counterpart to ShareCardModal — accepts the JSON blob
 * produced there (via clipboard, AirDrop, text message, whatever's fastest
 * when there's no shared network/EHR).
 */
export default function ImportCardModal({ onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    try {
      const data = JSON.parse(raw.trim());
      if (data.kind !== 'scrubplaybook-card' || !data.name) {
        setError('That doesn\'t look like a ScrubPlaybook card.');
        return;
      }
      onImport(data);
      onClose();
    } catch {
      setError('Could not read that — check it was copied in full.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import Card</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-500">Paste the card text a teammate shared with you.</p>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(''); }}
            rows={5}
            placeholder='{"kind":"scrubplaybook-card", ...}'
            className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 resize-none"
          />
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>
          )}
          <button
            onClick={handleImport}
            disabled={!raw.trim()}
            className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Add to My Playbook
          </button>
        </div>
      </div>
    </div>
  );
}
