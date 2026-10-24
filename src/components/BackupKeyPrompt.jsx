import { useState } from 'react';
import { AlertCircle, KeyRound, X } from 'lucide-react';
import { MIN_PASSPHRASE } from '../data/keyLock';
import { useDialog } from '../hooks/useDialog';

const field = 'mt-1 w-full min-h-11 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-medical-400/50';

/** Asks how a backup carries the key for each place this phone publishes. */
export default function BackupKeyPrompt({ places, onLock, onWithout, onClose }) {
  const [passphrase, setPassphrase] = useState('');
  const [repeat, setRepeat] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialog({ onClose: working ? undefined : onClose });
  const names = places.join(', ');
  const short = passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE;
  const mismatch = repeat.length > 0 && repeat !== passphrase;
  const ready = passphrase.length >= MIN_PASSPHRASE && repeat === passphrase && !working;

  const lock = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setWorking(true);
    setError('');
    try {
      await onLock(passphrase);
    } catch {
      setWorking(false);
      setError('The key could not be locked on this phone. Save the backup without it, or try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="backup-key-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90dvh] flex flex-col focus:outline-none">
        <div className="flex items-center justify-between px-5 py-2 bg-gradient-to-r from-medical-700 to-medical-800">
          <p id="backup-key-title" className="text-white font-bold text-sm flex items-center gap-2"><KeyRound size={16} aria-hidden="true" /> Publishing key</p>
          <button type="button" onClick={onClose} disabled={working} aria-label="Close" className="tap-icon text-medical-100 hover:text-white cursor-pointer disabled:opacity-40"><X size={18} /></button>
        </div>
        <form onSubmit={lock} className="p-5 space-y-3 overflow-y-auto min-h-0">
          <p className="text-sm text-slate-700">
            This phone publishes the unit book for {names}. Anyone who restores a backup that holds the key can publish for {places.length === 1 ? 'that place' : 'those places'}, so the backup locks it with a passphrase.
          </p>
          <label className="block text-xs font-bold text-slate-600">
            Passphrase, at least {MIN_PASSPHRASE} characters
            <input type="password" autoComplete="new-password" value={passphrase} onChange={e => { setPassphrase(e.target.value); setError(''); }} aria-invalid={short} className={field} />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            The same passphrase again
            <input type="password" autoComplete="new-password" value={repeat} onChange={e => { setRepeat(e.target.value); setError(''); }} aria-invalid={mismatch} className={field} />
          </label>
          {short && <p className="text-xs text-slate-600">Use at least {MIN_PASSPHRASE} characters. A few unrelated words work well.</p>}
          {mismatch && <p className="text-xs text-rose-700">The two passphrases are different.</p>}
          <p className="text-xs text-slate-600">Keep the passphrase somewhere other than the backup. Nobody can recover it for you.</p>
          {error && <p role="alert" className="text-xs text-rose-700 flex items-center gap-1.5"><AlertCircle size={13} aria-hidden="true" /> {error}</p>}
          <button type="submit" disabled={!ready} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">
            {working ? 'Locking the key…' : 'Lock the key and save the backup'}
          </button>
          <button type="button" onClick={onWithout} disabled={working} className="w-full min-h-11 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm disabled:opacity-40 cursor-pointer">Save without publishing</button>
          <p className="text-xs text-slate-600">
            Without the key, a phone restored from this backup cannot publish {names}. Before you replace this phone, hand over publishing from Places or keep a locked backup.
          </p>
        </form>
      </div>
    </div>
  );
}
