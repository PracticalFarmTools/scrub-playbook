import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, X } from 'lucide-react';

export default function ImportCardModal({ onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
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

  const accept = (data) => {
    const result = onImport(data);
    if (result && result.success === false) {
      setError(result.error || 'Could not import that.');
      return;
    }
    onClose();
  };

  const handleImport = () => {
    try {
      accept(JSON.parse(raw.trim()));
    } catch {
      setError('Could not read that. Check it was copied in full.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        accept(JSON.parse(event.target.result));
      } catch {
        setError('Could not parse that file.');
      }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import</p>
          <button onClick={() => { stopScan(); onClose(); }} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">Paste a procedure or a backup. Everything imported is unconfirmed.</p>
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
          <button onClick={handleImport} disabled={!raw.trim()} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">Import pasted data</button>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or a backup file</label>
          <input type="file" accept=".json,application/json" onChange={handleFileChange} className="w-full text-xs text-slate-500" />
        </div>
      </div>
    </div>
  );
}
