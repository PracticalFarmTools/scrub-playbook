import { useState } from 'react';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';

import { TECH_NAME_KEY as NAME_KEY } from '../data/schema';
import { safeGet, safeSet } from '../data/storage';
import { useDialog } from '../hooks/useDialog';

/**
 * Replaces the native prompt() for capturing the confirming tech's name —
 * consistent styling with the rest of the app, and works reliably inside
 * installed PWA / standalone display mode where prompt() can look out of place.
 */
export default function ConfirmNameModal({ title, subtitle, onClose, onSubmit }) {
  const [name, setName] = useState(() => safeGet(NAME_KEY, '') || '');
  const [error, setError] = useState('');
  const dialogRef = useDialog({ onClose });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    safeSet(NAME_KEY, trimmed);
    const result = onSubmit(trimmed);
    if (result?.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-name-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden focus:outline-none">
        <div className="flex items-center justify-between px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <p id="confirm-name-title" className="text-white font-bold text-sm flex items-center gap-2"><ShieldCheck size={16} /> {title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-icon text-medical-100 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
          <input
            autoFocus
            aria-label="Your name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your name"
            className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all"
          />
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
