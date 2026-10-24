import { useDialog } from '../hooks/useDialog';

/** Shown once before anything is written down. It has to be answered, so Escape does not close it. */
export default function Disclaimer({ onAccept }) {
  const dialogRef = useDialog();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="disclaimer-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto focus:outline-none">
        <h2 id="disclaimer-title" className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white font-extrabold">Before you write anything down</h2>
        <div className="p-6 space-y-3 text-sm text-slate-700">
          <p>These are staff notes about how a room runs. They are not the chart, not a medication order, and not the manufacturer’s instructions.</p>
          <p>Do not enter a patient name, medical record number, date of birth, implant lot, or serial number.</p>
          <p>Write what you observed. Do not copy or photograph the facility’s official card.</p>
          <p>When a note and the official preference card disagree, the official card and the surgeon win. These notes stay on this device unless you export or share them yourself.</p>
          <button type="button" onClick={onAccept} className="w-full py-3 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
