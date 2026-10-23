import { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function PhiPause({ signals, onEdit, next = 'Take that detail out, then save.', action = 'Go back and edit' }) {
  const buttonRef = useRef(null);
  useEffect(() => { buttonRef.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="phi-pause-title" aria-describedby="phi-pause-body" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 bg-rose-700 text-white">
          <p id="phi-pause-title" className="font-bold text-sm flex items-center gap-2"><ShieldAlert size={16} /> Hold on</p>
        </div>
        <div className="p-5 space-y-3">
          <p id="phi-pause-body" className="text-sm text-slate-700 leading-relaxed">
            This looks like it includes {signals.map(s => s.label).join(', ')}. Scrub Playbook does not store patient information. {next}
          </p>
          <button ref={buttonRef} type="button" onClick={onEdit} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer">
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}
