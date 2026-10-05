import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { shareMessage } from '../data/share';

export default function ShareCardModal({ surgeon, procedure, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showData, setShowData] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const share = shareMessage(surgeon, procedure);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyText = async () => {
    if (!share.message) return false;
    try {
      await navigator.clipboard.writeText(share.message);
      setCopied(true);
      setCopyFailed(false);
      return true;
    } catch {
      setCopyFailed(true);
      setCopied(false);
      return false;
    }
  };

  const send = async () => {
    if (!share.message || !canShare) return;
    try {
      await navigator.share({
        title: `${surgeon.name} · ${procedure.name}`,
        text: share.message,
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      await copyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Share2 size={16} /> Share procedure</p>
          <button type="button" onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {share.error && <p className="text-sm text-slate-600 text-center">{share.error}</p>}
          {!share.error && (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{share.glance}</div>
              <p className="text-xs text-slate-500 text-center">
                {share.showQr
                  ? 'The code is the same card, for a phone that can scan.'
                  : 'Send this message. It is too long for a code.'}
              </p>
              {share.showQr && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl self-center">
                  <QRCodeSVG value={share.payloadText} size={200} level="M" />
                </div>
              )}
              {canShare && (
                <button type="button" onClick={send} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-medical-600 text-white text-sm font-semibold cursor-pointer">
                  <Share2 size={16} /> Send
                </button>
              )}
              <button type="button" onClick={copyText} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold cursor-pointer">
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {copyFailed && <p className="text-[11px] text-slate-500 text-center">Select the message below and copy it.</p>}
              {copyFailed && (
                <textarea readOnly value={share.message} rows={6} onFocus={(e) => e.target.select()} className="w-full rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono px-2 py-2" />
              )}
              <button type="button" onClick={() => setShowData(v => !v)} className="text-[11px] font-bold text-medical-700 cursor-pointer">{showData ? 'Hide card data' : 'Show card data'}</button>
              {showData && (
                <textarea readOnly value={share.payloadText} rows={5} onFocus={(e) => e.target.select()} className="w-full rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono px-2 py-2" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
