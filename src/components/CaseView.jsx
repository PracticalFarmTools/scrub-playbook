import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { findPhiSignals } from '../data/phi';
import { normalizeBlocks } from '../data/schema';
import { suggestionText } from '../data/share';
import { pullTargets } from '../data/caseView';
import { loadPull, savePull } from '../data/pull';
import { readTechName } from '../hooks/useBook';
import { useDialog } from '../hooks/useDialog';
import CaseBody from './CaseBody';
import PhiPause from './PhiPause';

const DARK_KEY = 'scrubplaybook_case_dark';

function storedDark() {
  try {
    const stored = localStorage.getItem(DARK_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* follow the phone */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const WAKE_TEXT = {
  asking: 'Asking to keep the screen on',
  on: 'Screen stays on',
  off: 'This browser may dim the screen',
};

function wakeSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.wakeLock?.request === 'function';
}

export default function CaseView({ surgeon, procedure, staleDays, trust, position, onClose, onSuggested, onConfirm, onFlag }) {
  const blocks = useMemo(() => normalizeBlocks(procedure?.blocks), [procedure]);
  const targets = useMemo(() => pullTargets(blocks), [blocks]);
  const [checks, setChecks] = useState(() => (procedure ? loadPull(procedure.id) : {}));
  const [confirmName, setConfirmName] = useState(readTechName);
  const [confirmedAs, setConfirmedAs] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [phiNext, setPhiNext] = useState('');
  const [dark, setDark] = useState(storedDark);
  const [wake, setWake] = useState(() => (wakeSupported() ? 'asking' : 'off'));
  const closeRef = useRef(null);
  const [suggesting, setSuggesting] = useState(false);
  const [cardSays, setCardSays] = useState(procedure?.official?.note || '');
  const [seen, setSeen] = useState('');
  const [change, setChange] = useState('');
  const [phi, setPhi] = useState([]);
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState('');
  const [missing, setMissing] = useState(false);
  const pulled = targets.filter(item => checks[item.id]).length;

  useEffect(() => {
    if (!surgeon || !procedure) onClose?.();
  }, [surgeon, procedure, onClose]);

  const procedureId = procedure?.id;
  useEffect(() => {
    if (procedureId) savePull(procedureId, checks);
  }, [procedureId, checks]);

  const dialogRef = useDialog({
    initialFocus: closeRef,
    onClose: () => {
      if (suggesting) setSuggesting(false);
      else if (flagging) setFlagging(false);
      else onClose?.();
    },
  });

  useEffect(() => {
    if (!wakeSupported()) return undefined;
    let released = false;
    let current = null;
    const request = async () => {
      try {
        current = await navigator.wakeLock.request('screen');
        if (released) {
          current.release();
          return;
        }
        setWake('on');
        current.addEventListener('release', () => {
          if (!released) setWake('off');
        });
      } catch {
        if (!released) setWake('off');
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      current?.release?.().catch(() => {});
    };
  }, []);

  if (!surgeon || !procedure) return null;

  const sample = Boolean(procedure.demo || surgeon.demo);
  const page = dark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900';
  const bar = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const button = `min-h-11 px-3 rounded-xl text-base font-bold cursor-pointer ${dark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`;
  const field = `mt-1 w-full rounded-xl border px-3 py-2 text-lg ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`;

  const toggle = (id) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  const draftSuggestion = () => suggestionText({
    surgeon,
    procedure,
    cardSays,
    seen,
    change,
    from: readTechName(),
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
  });
  const pauseOrText = () => {
    if (!seen.trim() || !change.trim()) {
      setMissing(true);
      return null;
    }
    setMissing(false);
    const hits = findPhiSignals([cardSays, seen, change].join('\n'));
    if (hits.length) {
      setPhiNext('Take that detail out, then send the suggestion.');
      setPhi(hits);
      return null;
    }
    return draftSuggestion();
  };
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setManualText('');
      onSuggested?.({ cardSays, seen, change });
    } catch {
      setCopied(false);
      setManualText(text);
    }
  };
  const copySuggestion = async () => {
    const text = pauseOrText();
    if (text) await copyText(text);
  };
  const sendSuggestion = async () => {
    const text = pauseOrText();
    if (!text) return;
    if (typeof navigator.share !== 'function') {
      await copyText(text);
      return;
    }
    try {
      await navigator.share({ title: 'Preference card suggestion', text });
      setManualText('');
      onSuggested?.({ cardSays, seen, change });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      await copyText(text);
    }
  };
  const setDarkMode = (next) => {
    setDark(next);
    try { localStorage.setItem(DARK_KEY, next ? '1' : '0'); } catch { /* keep the choice for this view */ }
  };

  const confirmCase = (event) => {
    event.preventDefault();
    const name = confirmName.trim();
    if (!name) return;
    const result = onConfirm?.(name);
    if (result?.error) return;
    setConfirmedAs(result?.message || `Confirmed by ${name} just now.`);
  };
  const flagCase = (event) => {
    event.preventDefault();
    const reason = flagReason.trim();
    if (!reason) return;
    const hits = findPhiSignals(reason);
    if (hits.length) {
      setPhiNext('Take that detail out, then flag the card.');
      setPhi(hits);
      return;
    }
    onFlag?.(reason);
    setFlagging(false);
    setFlagged(true);
  };

  return createPortal(
    <div
      id="case-view-root"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-view-surgeon case-view-procedure"
      className={`fixed inset-0 z-[55] overflow-y-auto focus:outline-none ${page}`}
    >
      <div className={`case-topbar sticky top-0 z-10 border-b px-4 py-3 flex flex-wrap items-center gap-2 ${bar}`}>
        <button ref={closeRef} type="button" onClick={onClose} className={button}>Close</button>
        <button type="button" aria-pressed={dark} onClick={() => setDarkMode(!dark)} className={button}>Dark</button>
        <button type="button" onClick={() => window.print()} className={button}>Print</button>
        <p className="text-lg font-semibold px-1" aria-live="polite">{WAKE_TEXT[wake]}</p>
        <p className="text-lg font-semibold">{pulled} of {targets.length} pulled</p>
        <button type="button" onClick={() => setChecks({})} className={button}>Clear</button>
        {position?.total > 1 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button type="button" onClick={position.onPrev} disabled={position.index === 0} className={`${button} disabled:opacity-40`}>Previous</button>
            <p className="text-lg font-semibold" aria-live="polite">Case {position.index + 1} of {position.total}</p>
            <button type="button" onClick={position.onNext} disabled={position.index === position.total - 1} className={`${button} disabled:opacity-40`}>Next</button>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-16">
        <CaseBody
          surgeon={surgeon}
          procedure={procedure}
          blocks={blocks}
          staleDays={staleDays}
          trust={trust}
          dark={dark}
          checks={checks}
          onToggle={toggle}
        />

        {!sample && (onConfirm || onFlag) && (
          <section className="case-noprint py-6 border-b border-current/10 space-y-3" aria-labelledby="after-case-title">
            <h2 id="after-case-title" className="text-xl font-bold">After the case</h2>
            {onConfirm && (confirmedAs ? (
              <p className="text-lg font-semibold" role="status">{confirmedAs}</p>
            ) : (
              <form onSubmit={confirmCase} className="flex flex-wrap items-end gap-2">
                <label className="block text-lg grow">
                  Your name
                  <input value={confirmName} onChange={e => setConfirmName(e.target.value)} autoComplete="name" className={field} />
                </label>
                <button type="submit" disabled={!confirmName.trim()} className={`${button} disabled:opacity-40`}>I was in this case</button>
              </form>
            ))}
            {onFlag && !flagging && !flagged && (
              <button type="button" onClick={() => setFlagging(true)} className={button}>Flag this card</button>
            )}
            {flagged && <p className="text-lg font-semibold" role="status">Flagged. Others see your reason until someone clears it.</p>}
            {flagging && (
              <form onSubmit={flagCase} className="space-y-2">
                <label className="block text-lg">
                  What did not match?
                  <textarea required value={flagReason} onChange={e => setFlagReason(e.target.value)} rows={3} className={field} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={!flagReason.trim()} className={`${button} disabled:opacity-40`}>Flag</button>
                  <button type="button" onClick={() => setFlagging(false)} className={button}>Cancel</button>
                </div>
              </form>
            )}
          </section>
        )}

        {!sample && (
          <div className="case-noprint py-6">
            {!suggesting && (
              <button type="button" onClick={() => { setCardSays(procedure.official?.note || ''); setSuggesting(true); }} className={button}>Suggest a card change</button>
            )}
            {suggesting && (
              <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); sendSuggestion(); }}>
                <p className="text-xl font-bold">Suggest a card change</p>
                <label className="block text-lg">
                  The official card says
                  <textarea value={cardSays} onChange={e => setCardSays(e.target.value)} rows={3} className={`mt-1 w-full rounded-xl border px-3 py-2 text-lg ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} />
                </label>
                <label className="block text-lg">
                  In the room I saw
                  <textarea required value={seen} onChange={e => setSeen(e.target.value)} rows={3} className={`mt-1 w-full rounded-xl border px-3 py-2 text-lg ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} />
                </label>
                <label className="block text-lg">
                  Suggested change
                  <textarea required value={change} onChange={e => setChange(e.target.value)} rows={3} className={`mt-1 w-full rounded-xl border px-3 py-2 text-lg ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} />
                </label>
                {missing && <p role="alert" className="text-lg font-semibold">Write what you saw in the room and the change you suggest.</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={button}>Send</button>
                  <button type="button" onClick={copySuggestion} className={button}>{copied ? 'Copied' : 'Copy'}</button>
                  <button type="button" onClick={() => setSuggesting(false)} className={button}>Cancel</button>
                </div>
                {manualText && (
                  <label className="block text-lg">
                    This browser blocked copying. Select this text and copy it.
                    <textarea readOnly value={manualText} rows={8} onFocus={e => e.target.select()} className={`mt-1 w-full rounded-xl border px-3 py-2 text-base ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} />
                  </label>
                )}
                {manualText && (
                  <button type="button" onClick={() => { onSuggested?.({ cardSays, seen, change }); setManualText(''); setCopied(true); }} className={button}>I sent it</button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
      {phi.length > 0 && <PhiPause signals={phi} next={phiNext} onEdit={() => setPhi([])} />}
    </div>,
    document.body,
  );
}
