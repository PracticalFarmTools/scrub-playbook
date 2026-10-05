import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { toShareableCard } from '../data/share';

export default function ShareCardModal({ surgeon, procedure, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);
  const share = toShareableCard(surgeon, procedure);

  const copyText = async () => {
    if (!share.text) return;
    try {
      await navigator.clipboard.writeText(share.text);
      setCopied(true);
    } catch {
      setShowText(true);
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Share2 size={16} /> Share procedure</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {share.error && <p className="text-sm text-slate-600 text-center">{share.error}</p>}
          {!share.error && (
            <>
              <p className="text-sm text-slate-500 text-center">
                {share.showQr
                  ? 'On the other phone, open Import and paste this. The code is there if that phone can scan from Import. The card arrives unconfirmed.'
                  : 'This procedure is too long for a reliable code. Copy the text into Import on the other phone. It arrives unconfirmed.'}
              </p>
              {share.showQr && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <QRCodeSVG value={share.text} size={200} level="M" />
                </div>
              )}
              <p className="text-xs font-bold text-slate-700">{surgeon.name} · {procedure.name}</p>
              <button onClick={copyText} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold cursor-pointer">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy as text'}
              </button>
              {showText && <p className="text-[11px] text-slate-500 text-center">Select the text below and copy it.</p>}
              <button type="button" onClick={() => setShowText(v => !v)} className="text-[11px] font-bold text-medical-700 cursor-pointer">{showText ? 'Hide text' : 'Show text'}</button>
              {showText && (
                <textarea readOnly value={share.text} rows={5} onFocus={(e) => e.target.select()} className="w-full rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono px-2 py-2" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
