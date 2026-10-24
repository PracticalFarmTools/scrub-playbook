import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { findPhiInProcedure, findPhiInSurgeon } from '../data/phi';
import { classifyIncomingCard, parseImport } from '../data/incoming';
import { checkHandover, checkUnitFile } from '../data/unitBook';
import PhiPause from './PhiPause';
import { BackupPreview, CardPreview, ErrorLine, HandoverPreview, UnitBookPreview } from './ImportPreviews';
import { useDialog } from '../hooks/useDialog';
import { canUseCamera, createQrReader } from '../utils/qrReader';

/** A book of several thousand cards is a few megabytes; anything far larger is the wrong file. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function uniqueSignals(list) {
  const seen = new Set();
  return list.filter(signal => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}

export default function ImportCardModal({ book, onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const checkRef = useRef(0);
  const canScan = canUseCamera();
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
  useEffect(() => {
    const video = videoRef.current;
    if (!scanning || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.play()?.catch?.(() => {});
  }, [scanning]);
  const close = () => { stopScan(); onClose(); };
  const dialogRef = useDialog({ onClose: close });

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
        signals.push(...findPhiInProcedure(procedure), ...findPhiInSurgeon(surgeon));
        classification = classifyIncomingCard(book, surgeon, procedure);
      } else {
        for (const procedure of parsed.book.procedures || []) signals.push(...findPhiInProcedure(procedure));
        for (const surgeon of parsed.book.surgeons || []) signals.push(...findPhiInSurgeon(surgeon));
      }
      setPreview({ parsed, classification, phi: uniqueSignals(signals), check: null });
      setError('');
      stopScan();
      const signed = parsed.type === 'unitbook' ? parsed.file : parsed.type === 'publisher' ? parsed.handover : null;
      if (signed) {
        const seq = ++checkRef.current;
        const verify = parsed.type === 'unitbook' ? checkUnitFile(signed) : checkHandover(signed);
        verify
          .catch(() => ({ ok: false, reason: 'changed' }))
          .then(check => {
            if (seq === checkRef.current) setPreview(prev => (prev?.parsed === parsed ? { ...prev, check } : prev));
          });
      }
    } catch (err) {
      setPreview(null);
      setError(err?.code === 'no-card'
        ? 'This message has no card to save. Ask them to share it again from Scrub Playbook.'
        : 'Could not read that. Check it was copied in full.');
    }
  };

  const commit = (surgeonId, extra = {}) => {
    if (!preview || preview.phi.length) return;
    const signed = ['unitbook', 'publisher'].includes(preview.parsed.type);
    if (signed && !preview.check?.ok) return;
    const result = onImport(preview.parsed.book, {
      ...(surgeonId ? { surgeonId } : {}),
      ...(preview.parsed.type === 'unitbook' ? { unitFile: preview.parsed.file, fingerprint: preview.check.fingerprint } : {}),
      ...(preview.parsed.type === 'publisher' ? { handover: preview.parsed.handover, fingerprint: preview.check.fingerprint } : {}),
      ...extra,
    });
    if (result && result.success === false) {
      setError(result.error || 'Could not import that.');
      return;
    }
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setPreview(null);
      setError('That file is too large to be a Scrub Playbook file. Choose the backup or unit book file you saved.');
      return;
    }
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
      setError('This browser cannot use the camera. Paste the text instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      setError('');
    } catch {
      stopScan();
      setError('Camera permission is needed to scan. Paste the text instead.');
      return;
    }
    let read;
    try {
      read = await createQrReader();
    } catch {
      stopScan();
      setError('This phone could not start the scanner. Paste the text instead.');
      return;
    }
    if (!streamRef.current) return;
    let reading = false;
    timerRef.current = setInterval(async () => {
      if (!videoRef.current || !streamRef.current || reading) return;
      reading = true;
      try {
        const value = await read(videoRef.current);
        if (value && streamRef.current) {
          stopScan();
          setRaw(value);
          review(value);
        }
      } catch {
        /* keep looking until the code is steady */
      } finally {
        reading = false;
      }
    }, 300);
  };

  const type = preview?.parsed?.type;
  const cancel = () => { setPreview(null); setError(''); };
  const shown = { preview, commit, error, onCancel: cancel };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="import-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col focus:outline-none">
        <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <p id="import-title" className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import</p>
          <button type="button" onClick={close} aria-label="Close" className="tap-icon text-medical-100 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          {!preview && (
            <>
              <p className="text-xs text-slate-500">Paste a procedure or a backup. You will see the card before it is saved. Everything imported is unconfirmed.</p>
              {canScan && !scanning && (
                <button type="button" onClick={startScan} className="w-full min-h-11 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer">Scan a code</button>
              )}
              {scanning && (
                <div className="space-y-2">
                  <video ref={videoRef} muted playsInline className="w-full rounded-xl bg-slate-900" />
                  <button type="button" onClick={stopScan} className="w-full min-h-11 rounded-xl bg-slate-100 font-bold text-sm cursor-pointer">Stop scanning</button>
                </div>
              )}
              <textarea value={raw} onChange={(e) => { setRaw(e.target.value); setError(''); }} rows={4} aria-label="Shared text" placeholder="Paste the shared text here" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono px-3 py-2" />
              <ErrorLine error={error} />
              <button type="button" onClick={() => review(raw)} disabled={!raw.trim()} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">Review</button>
              <label htmlFor="import-file" className="block text-xs font-bold text-slate-600 uppercase tracking-widest">Or a backup file</label>
              <input id="import-file" type="file" accept=".json,application/json" onChange={handleFileChange} className="w-full text-xs text-slate-500" />
            </>
          )}
          {type === 'card' && <CardPreview {...shown} />}
          {type === 'unitbook' && <UnitBookPreview book={book} {...shown} />}
          {type === 'publisher' && <HandoverPreview {...shown} />}
          {type === 'backup' && <BackupPreview {...shown} setError={setError} />}
        </div>
      </div>
      {preview?.phi?.length > 0 && (
        <PhiPause
          signals={preview.phi}
          next="Nothing was saved. Ask the sender to take that detail out and share it again."
          action="Go back"
          onEdit={() => setPreview(null)}
        />
      )}
    </div>
  );
}
