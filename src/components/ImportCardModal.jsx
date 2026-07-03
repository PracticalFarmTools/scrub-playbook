import { useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';

/**
 * Paste-to-import counterpart to ShareCardModal — accepts the JSON blob
 * produced there (via clipboard, AirDrop, text message, whatever's fastest
 * when there's no shared network/EHR).
 */
export default function ImportCardModal({ onClose, onImport, onImportBackup }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    try {
      const data = JSON.parse(raw.trim());
      if (data.kind === 'scrubplaybook-backup') {
        if (onImportBackup) {
          const result = onImportBackup(data);
          if (result && result.success) {
            alert(`${result.imported} imported, ${result.skipped} skipped as duplicates.`);
            onClose();
          } else {
            setError(result?.error || 'Failed to import backup.');
          }
        } else {
          setError('Backup importing is not supported in this context.');
        }
      } else if (data.kind === 'scrubplaybook-card' && data.name) {
        onImport(data);
        onClose();
      } else {
        setError('That doesn\'t look like a ScrubPlaybook card or backup.');
      }
    } catch {
      setError('Could not read that — check it was copied in full.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.kind === 'scrubplaybook-backup') {
          if (onImportBackup) {
            const result = onImportBackup(data);
            if (result && result.success) {
              alert(`${result.imported} imported, ${result.skipped} skipped as duplicates.`);
              onClose();
            } else {
              setError(result?.error || 'Failed to import backup.');
            }
          } else {
            setError('Backup importing is not supported in this context.');
          }
        } else if (data.kind === 'scrubplaybook-card' && data.name) {
          onImport(data);
          onClose();
        } else {
          setError("Unknown file format. Please select a valid card or backup file.");
        }
      } catch {
        setError("Could not parse file. Make sure it's valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import Card / Backup</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paste JSON</p>
            <p className="text-xs text-slate-500">Paste card text or backup content shared with you.</p>
            <textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setError(''); }}
              rows={4}
              placeholder='{"kind":"scrubplaybook-card", ...} or {"kind":"scrubplaybook-backup", ...}'
              className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>
          )}
          <button
            onClick={handleImport}
            disabled={!raw.trim()}
            className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
          >
            Import Pasted Data
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] font-extrabold text-slate-400 tracking-wider">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upload JSON File</p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-medical-50 file:text-medical-700 hover:file:bg-medical-100 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
