import { useState } from 'react';
import { X, Users, Wifi, WifiOff, Copy, Check, LogOut } from 'lucide-react';

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Opt-in facility sync — the real fix for QR/paste not scaling past a
 * couple of people. A facility code is a shared secret (like a Google Doc
 * link), not per-user auth — appropriate for small trusted teams sharing
 * their own personal notes, not for anything sensitive.
 */
export default function TeamSyncModal({ syncCode, status, onEnable, onDisable, onClose }) {
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — non-fatal */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Users size={16} /> Team Sync</p>
          <button onClick={onClose} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {syncCode ? (
            <>
              <div className="flex items-center gap-2">
                {status === 'connected' && <Wifi size={14} className="text-emerald-500" />}
                {status === 'connecting' && <Wifi size={14} className="text-amber-500 animate-pulse" />}
                {status === 'error' && <WifiOff size={14} className="text-rose-500" />}
                <p className="text-xs font-semibold text-slate-600">
                  {status === 'connected' && 'Synced with your team'}
                  {status === 'connecting' && 'Connecting…'}
                  {status === 'error' && "Couldn't connect — check the code and try again"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Facility Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-lg font-bold tracking-[0.3em] text-center bg-slate-50 border border-slate-200 rounded-lg py-2.5 text-slate-800">
                    {syncCode}
                  </div>
                  <button onClick={copyCode} title="Copy code"
                    className="shrink-0 w-10 h-10 rounded-lg bg-medical-50 text-medical-600 hover:bg-medical-100 flex items-center justify-center transition-all cursor-pointer">
                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Share this with teammates so they can join the same shared playbook.</p>
              </div>
              <button onClick={onDisable}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold transition-all cursor-pointer">
                <LogOut size={15} /> Stop Syncing This Device
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Share your playbook live with your team instead of exporting/importing one card at a time.
                Anyone with the code below can join — treat it like a shared doc link, not a password.
              </p>
              <button
                onClick={() => onEnable(randomCode())}
                className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 transition-all cursor-pointer"
              >
                Start a New Team Playbook
              </button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-extrabold text-slate-400 tracking-wider">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter facility code"
                  maxLength={6}
                  className="flex-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-mono tracking-widest px-3 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-medical-400/50"
                />
                <button
                  onClick={() => codeInput.trim() && onEnable(codeInput)}
                  disabled={!codeInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm hover:bg-medical-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
