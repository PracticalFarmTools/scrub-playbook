import { ChevronLeft } from 'lucide-react';

export default function ModalHeader({ onClose, onSave, canSave }) {
  return (
    <>
      {/* ═══ TOP HEADER ═══ */}
      <div className="shrink-0 bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1 text-medical-200 hover:text-white transition-colors text-sm font-medium cursor-pointer">
            <ChevronLeft size={18} /> Cancel
          </button>
          <h2 className="text-white font-bold text-base">New Surgeon Card</h2>
          <button onClick={onSave}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-lg transition-all cursor-pointer backdrop-blur-sm">
            Save
          </button>
        </div>
      </div>
    </>
  );
}

export function ModalFooter({ onSave, canSave }) {
  return (
    <div className="shrink-0 border-t border-slate-100 px-5 py-4 bg-white/80 backdrop-blur-xl">
      <button type="button" onClick={onSave} disabled={!canSave}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-medical-600 to-medical-700 text-white font-bold text-sm shadow-lg shadow-medical-600/25 hover:from-medical-700 hover:to-medical-800 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
        Save Surgeon Card
      </button>
    </div>
  );
}
