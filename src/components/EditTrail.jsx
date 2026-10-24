import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { TRAIL_MAX, actionText, thisPhoneFingerprint } from '../data/editTrail';
import { versionTime } from '../data/history';
import { useTrailCheck } from '../hooks/useTrailCheck';

function who(entry) {
  return String(entry?.by || '').trim() || 'someone who gave no name';
}

function phone(item) {
  return item.mine ? 'this phone' : `phone ${item.fingerprint}`;
}

/** @param {{ check: import('../data/editTrail').TrailCheck, className?: string }} props */
export function TrailSummary({ check, className = '' }) {
  const latest = check.entries[0];
  if (check.status === 'unsigned') {
    return <p className={`text-xs text-slate-600 ${className}`}>No signed changes yet. The next saved change is signed.</p>;
  }
  if (check.status === 'broken') {
    return (
      <p className={`flex gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-900 ${className}`}>
        <ShieldX size={14} className="shrink-0 mt-px" aria-hidden="true" />
        <span>A signed record on this card does not check out, so who changed it and when cannot be trusted. Ask whoever keeps this card.</span>
      </p>
    );
  }
  if (check.status === 'changed') {
    return (
      <p className={`flex gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-950 ${className}`}>
        <ShieldAlert size={14} className="shrink-0 mt-px" aria-hidden="true" />
        <span>Changed after the last signed change ({who(latest.entry)}, {versionTime(latest.entry.at)}). Who changed it since is not known.</span>
      </p>
    );
  }
  return (
    <p className={`flex gap-1.5 text-xs text-slate-700 ${className}`}>
      <ShieldCheck size={14} className="shrink-0 mt-px text-emerald-700" aria-hidden="true" />
      <span>Last change signed by <span className="font-semibold">{who(latest.entry)}</span> · {versionTime(latest.entry.at)} · {phone(latest)}</span>
    </p>
  );
}

/** One line under a card: who signed its last change, or why that cannot be read. */
export function EditTrailLine({ procedure, className = '' }) {
  const check = useTrailCheck(procedure);
  return check ? <TrailSummary check={check} className={className} /> : null;
}

/** Every signed change on a card, newest first. */
export function SignedChanges({ procedure }) {
  const check = useTrailCheck(procedure);
  const [mine, setMine] = useState(/** @type {string | null} */ (null));
  useEffect(() => {
    let alive = true;
    thisPhoneFingerprint().then(value => { if (alive) setMine(value); });
    return () => { alive = false; };
  }, [procedure]);
  return (
    <section aria-labelledby="signed-changes-title" className="space-y-2">
      <h3 id="signed-changes-title" className="text-sm font-bold text-slate-900">Signed changes</h3>
      {!check && <p role="status" className="text-sm text-slate-500">Checking signatures…</p>}
      {check && <TrailSummary check={check} />}
      {check && check.entries.length > 0 && (
        <ul aria-label="Signed changes, newest first" className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {check.entries.map((item, index) => (
            <li key={`${item.entry?.sig || ''}-${index}`} className="px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{actionText(item.entry?.action)} · {who(item.entry)}</p>
              <p className={`text-xs ${item.ok ? 'text-slate-600' : 'text-rose-800 font-semibold'}`}>
                {versionTime(item.entry?.at) || 'No date'} · {item.ok ? phone(item) : 'does not check out'}
              </p>
            </li>
          ))}
        </ul>
      )}
      {check?.trimmed && <p className="text-xs text-slate-600">Only the last {TRAIL_MAX} signed changes stay on the card.</p>}
      <p className="text-xs text-slate-600">
        {mine ? `This phone signs as ${mine}. ` : 'This phone makes its signing key the first time it saves a card. '}
        A name is what that person typed. The signature shows which phone saved the change and that the record has not been altered since.
      </p>
    </section>
  );
}
