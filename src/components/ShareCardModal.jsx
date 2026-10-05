import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { toShareableCard } from '../data/share';

export default function ShareCardModal({ surgeon, procedure, onClose }) {
  const [copied, setCopied] = useState(false);
  const share = toShareableCard(surgeon, procedure);

  const copyText = async () => {
    if (!share.text) return;
    try {
      await navigator.clipboard.writeText(share.text);
      setCopied(true);
    } catch {
      /* QR or the file path remains */
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
                  ? 'The other tech opens Import and scans this. The card arrives unconfirmed.'
                  : 'This procedure is too long for a reliable QR code. Copy the text instead. It arrives unconfirmed.'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
