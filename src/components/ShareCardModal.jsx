import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';

// Strip local-only bookkeeping (audit trail lives per-device) before sharing.
function toShareablePayload(surgeon) {
  const { id: _id, createdAt: _createdAt, addedBy: _addedBy, lastVerifiedBy: _lastVerifiedBy, lastVerifiedAt: _lastVerifiedAt, ...rest } = surgeon;
  return { ...rest, kind: 'scrubplaybook-card', v: 1 };
}

/**
 * Peer-to-peer card transfer for when there's no EHR/network to lean on —
 * one tech's phone shows the QR, the other pastes/scans it into "Import".
 */
export default function ShareCardModal({ surgeon, onClose }) {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(() => JSON.stringify(toShareablePayload(surgeon)), [surgeon]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (non-secure context) — QR is the fallback.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Share2 size={16} /> Share Card</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500 text-center">
            No network needed — have the other tech open <strong>Import Card</strong> and scan this,
            or copy the text below.
          </p>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <QRCodeSVG value={payload} size={200} level="M" />
          </div>
          <p className="text-xs font-bold text-slate-700">{surgeon.name}</p>
          <button
            onClick={copyText}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
