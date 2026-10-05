import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, X } from 'lucide-react';
import { findPhiInProcedure, findPhiSignals } from '../data/phi';
import { classifyIncomingCard, parseImport } from '../data/share';
import PhiPause from './PhiPause';
import ProcedureGlance from './ProcedureGlance';

function uniqueSignals(list) {
  const seen = new Set();
  return list.filter(signal => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}

function backupSummary(book) {
  const surgeons = (book.surgeons || []).filter(surgeon => !surgeon.demo);
  const ids = new Set(surgeons.map(surgeon => surgeon.id));
  const procedures = (book.procedures || []).filter(procedure => !procedure.demo && ids.has(procedure.surgeonId));
  const samples = (book.surgeons || []).some(surgeon => surgeon.demo) || (book.procedures || []).some(procedure => procedure.demo);
  const surgeonWord = surgeons.length === 1 ? 'surgeon' : 'surgeons';
  const procedureWord = procedures.length === 1 ? 'procedure' : 'procedures';
  return `Backup: ${surgeons.length} ${surgeonWord}, ${procedures.length} ${procedureWord}. They arrive unconfirmed.${samples ? ' Samples are skipped.' : ''}`;
}

export default function ImportCardModal({ book, onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const stopScan = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  const review = (text) => {
    const source = (text ?? raw).trim();
    if (!source) return;
    try {
      const parsed = parseImport(source);
      const signals = [];
      let classification = null;
      if (parsed.type === 'card') {
        const procedure = parsed.book.procedures[0];
        const surgeon = parsed.book.surgeons[0];
        signals.push(...findPhiInProcedure(procedure), ...findPhiSignals(`${surgeon?.name || ''}\n${surgeon?.facility || ''}`));
        classification = classifyIncomingCard(book, surgeon, procedure);
      } else {
        for (const procedure of parsed.book.procedures || []) signals.push(...findPhiInProcedure(procedure));
      }
      setPreview({ parsed, classification, phi: uniqueSignals(signals) });
      setError('');
      stopScan();
    } catch (err) {
      setPreview(null);
      setError(err?.code === 'no-card'
        ? 'This message has no card to save. Ask them to share it again from Scrub Playbook.'
        : 'Could not read that. Check it was copied in full.');
    }
  };

  const commit = (surgeonId) => {
    if (!preview || preview.phi.length) return;
    const result = onImport(preview.parsed.book, surgeonId ? { surgeonId } : {});
    if (result && result.success === false) {
      setError(result.error || 'Could not import that.');
      return;
    }
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target.result || '');
      setRaw(text);
      review(text);
    };
    reader.readAsText(file);
  };

  const startScan = async () => {
    if (!canScan) {
      setError('This browser cannot scan. Paste the text instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      setError('');
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      });
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      timerRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            stopScan();
            setRaw(value);
            review(value);
          }
        } catch {
          /* keep looking until the code is steady */
        }
      }, 400);
    } catch {
      stopScan();
      setError('Camera permission is needed to scan. Paste the text instead.');
    }
  };

  const card = preview?.parsed?.type === 'card' ? preview.parsed.book : null;
  const incomingSurgeon = card?.surgeons?.[0];
  const incomingProcedure = card?.procedures?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import</p>
          <button type="button" onClick={() => { stopScan(); onClose(); }} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          {!preview && (
            <>
              <p className="text-xs text-slate-500">Paste a procedure or a backup. You will see the card before it is saved. Everything imported is unconfirmed.</p>
              {canScan && !scanning && (
                <button type="button" onClick={startScan} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer">Scan a code</button>
              )}
              {scanning && (
                <div className="space-y-2">
                  <video ref={videoRef} muted playsInline className="w-full rounded-xl bg-slate-900" />
                  <button type="button" onClick={stopScan} className="w-full py-2 rounded-xl bg-slate-100 font-bold text-sm cursor-pointer">Stop scanning</button>
                </div>
              )}
              <textarea value={raw} onChange={(e) => { setRaw(e.target.value); setError(''); }} rows={4} placeholder="Paste the shared text here" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono px-3 py-2" />
              {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
              <button type="button" onClick={() => review(raw)} disabled={!raw.trim()} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">Review</button>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or a backup file</label>
              <input type="file" accept=".json,application/json" onChange={handleFileChange} className="w-full text-xs text-slate-500" />
            </>
          )}
          {preview && card && (
            <>
              {preview.classification?.kind === 'duplicate' && (
                <p className="text-sm text-slate-700">You already have this procedure for {preview.classification.surgeon.name}. Add another copy?</p>
              )}
              {preview.phi.length === 0 && preview.classification?.kind === 'ambiguous' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">More than one {incomingSurgeon?.name} is in your book.</p>
                  {preview.classification.surgeons.map(surgeon => (
                    <button type="button" key={surgeon.id} onClick={() => commit(surgeon.id)} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
                      Add to {surgeon.name} · {surgeon.specialty}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
                <ProcedureGlance procedure={incomingProcedure} surgeon={incomingSurgeon} />
              </div>
              {preview.phi.length === 0 && preview.classification?.kind === 'duplicate' && (
                <button type="button" onClick={() => commit(preview.classification.surgeon.id)} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add a copy</button>
              )}
              {preview.phi.length === 0 && preview.classification?.kind !== 'duplicate' && preview.classification?.kind !== 'ambiguous' && (
                <button type="button" onClick={() => commit(preview.classification?.kind === 'attach' ? preview.classification.surgeon.id : undefined)} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add unconfirmed</button>
              )}
              {preview.phi.length === 0 && preview.classification?.kind === 'ambiguous' && (
                <button type="button" onClick={() => commit()} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer">Add as a new surgeon</button>
              )}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
          {preview && !card && (
            <>
              <p className="text-sm text-slate-700">{backupSummary(preview.parsed.book)}</p>
              {preview.phi.length === 0 && (
                <button type="button" onClick={() => commit()} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add unconfirmed</button>
              )}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
        </div>
      </div>
      {preview?.phi?.length > 0 && <PhiPause signals={preview.phi} onEdit={() => setPreview(null)} />}
    </div>
  );
}
