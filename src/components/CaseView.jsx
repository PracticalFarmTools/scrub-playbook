import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { findPhiSignals } from '../data/phi';
import { CARD_STATUS, normalizeBlocks } from '../data/schema';
import { suggestionText } from '../data/share';
import { timeAgo, trustState } from '../data/trust';
import { readTechName } from '../hooks/useBook';
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

function trustLine(procedure, staleDays, sample) {
  if (sample) return `Sample · ${trustLine(procedure, staleDays, false)}`;
  const state = trustState(procedure, { staleDays });
  if (state.status === CARD_STATUS.CONFIRMED) return state.at ? `Matched a case · ${timeAgo(state.at)}` : 'Matched a case';
  if (state.status === CARD_STATUS.NOTED) return `One staff member · ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.STALE) return `Stale · last matched ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.DISPUTED) return 'Flagged · do not treat this as a match';
  return 'Unconfirmed';
}

function pullTargets(blocks) {
  const items = [];
  if (blocks.gloves?.outer?.model) items.push({ id: 'glove-outer', label: `Outer glove · ${[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}` });
  if (blocks.gloves?.inner?.model) items.push({ id: 'glove-inner', label: `Inner glove · ${[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}` });
  (blocks.instruments || []).filter(item => item?.name?.trim()).forEach(item => {
    const nick = (blocks.nicknames || []).find(entry => (entry.actual || '').trim().toLowerCase() === item.name.trim().toLowerCase());
    const name = nick ? `${item.name.trim()} “${nick.nickname}”` : item.name.trim();
    const where = item.mayo ? 'Mayo' : (item.from?.trim() ? `from ${item.from.trim()}` : '');
    items.push({ id: `instrument-${item.id}`, label: [name, where].filter(Boolean).join(' · ') });
  });
  (blocks.trays || []).forEach(tray => {
    items.push({
      id: `tray-${tray.id}`,
      label: [tray.commonName || 'Tray', tray.spdName && `SPD: ${tray.spdName}`, tray.openOrHold === 'hold' ? 'Hold' : 'Open'].filter(Boolean).join(' · '),
    });
  });
  (blocks.sutures || []).forEach(suture => {
    const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
    items.push({
      id: `suture-${suture.id}`,
      label: [layer, suture.name, suture.size, suture.needle, suture.open && `open ${suture.open}`, suture.hold && `hold ${suture.hold}`].filter(Boolean).join(' '),
    });
  });
  (blocks.implants || []).forEach(implant => {
    items.push({
      id: `implant-${implant.id}`,
      label: [implant.systemName || 'Unnamed system', implant.repExpected ? 'Rep expected' : ''].filter(Boolean).join(' · '),
    });
  });
  return items;
}

function Section({ title, children, muted }) {
  return (
    <section className="py-4 border-b border-current/10">
      <h2 className={`text-xl font-bold mb-2 ${muted}`}>{title}</h2>
      <div className="text-lg leading-relaxed">{children}</div>
    </section>
  );
}

export default function CaseView({ surgeon, procedure, staleDays, onClose, onSuggested }) {
  const blocks = useMemo(() => normalizeBlocks(procedure?.blocks), [procedure]);
  const targets = useMemo(() => pullTargets(blocks), [blocks]);
  const [checks, setChecks] = useState({});
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

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, []);

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

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (phi.length) setPhi([]);
      else if (suggesting) setSuggesting(false);
      else onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phi.length, suggesting, onClose]);

  if (!surgeon || !procedure) return null;

  const sample = Boolean(procedure.demo || surgeon.demo);
  const page = dark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const bar = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const button = `min-h-11 px-3 rounded-xl text-base font-bold cursor-pointer ${dark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`;
  const firstCase = (surgeon.firstCase || []).map(line => String(line || '').trim()).filter(Boolean).slice(0, 3);
  const steps = blocks.steps || [];

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
      onSuggested?.();
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
      onSuggested?.();
    } catch (err) {
      if (err?.name === 'AbortError') return;
      await copyText(text);
    }
  };
  const setDarkMode = (next) => {
    setDark(next);
    try { localStorage.setItem(DARK_KEY, next ? '1' : '0'); } catch { /* keep the choice for this view */ }
  };

  const checkFor = (id) => targets.some(item => item.id === id)
    ? (
      <input
        type="checkbox"
        className="case-check mt-1 h-6 w-6 shrink-0"
        checked={Boolean(checks[id])}
        onChange={() => toggle(id)}
      />
    )
    : null;

  return createPortal(
    <div
      id="case-view-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-view-surgeon case-view-procedure"
      className={`fixed inset-0 z-[55] overflow-y-auto ${page}`}
    >
      <div className={`case-topbar sticky top-0 z-10 border-b px-4 py-3 flex flex-wrap items-center gap-2 ${bar}`}>
        <button ref={closeRef} type="button" onClick={onClose} className={button}>Close</button>
        <button type="button" aria-pressed={dark} onClick={() => setDarkMode(!dark)} className={button}>Dark</button>
        <button type="button" onClick={() => window.print()} className={button}>Print</button>
        <p className="text-lg font-semibold px-1" aria-live="polite">{WAKE_TEXT[wake]}</p>
        <p className="text-lg font-semibold">{pulled} of {targets.length} pulled</p>
        <button type="button" onClick={() => setChecks({})} className={button}>Clear</button>
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-16">
        <header className="py-5 border-b border-current/10">
          {sample && (
            <p className={`mb-3 rounded-xl px-3 py-2 text-lg font-bold ${dark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
              Sample. Not from your hospital.
            </p>
          )}
          <p id="case-view-surgeon" className="text-xl font-bold">{surgeon.name}</p>
          <h1 id="case-view-procedure" className="text-xl font-bold mt-1">{procedure.name}{procedure.approach ? ` · ${procedure.approach}` : ''}</h1>
          {surgeon.facility?.trim() && <p className={`text-lg mt-1 ${muted}`}>{surgeon.facility}</p>}
          {procedure.official?.label?.trim() && (
            <p className="text-lg mt-2">Official card: {procedure.official.label.trim()}</p>
          )}
          {procedure.official?.note?.trim() && (
            <p className={`text-lg mt-1 whitespace-pre-wrap ${muted}`}>{procedure.official.note}</p>
          )}
          <p className={`text-lg mt-2 ${muted}`}>{trustLine(procedure, staleDays, sample)}</p>
          <p className={`text-lg mt-2 ${muted}`}>Staff notes. The surgeon and the official card win.</p>
        </header>

        {firstCase.length > 0 && (
          <Section title={`New to ${surgeon.name}`} muted={muted}>
            <ul className="space-y-1">
              {firstCase.map((line, index) => <li key={index}>• {line}</li>)}
            </ul>
          </Section>
        )}

        {blocks.position?.text?.trim() && <Section title="Position" muted={muted}><p className="whitespace-pre-wrap">{blocks.position.text}</p></Section>}
        {blocks.prep?.text?.trim() && <Section title="Prep" muted={muted}><p className="whitespace-pre-wrap">{blocks.prep.text}</p></Section>}
        {blocks.drapes?.text?.trim() && <Section title="Drapes" muted={muted}><p className="whitespace-pre-wrap">{blocks.drapes.text}</p></Section>}
        {blocks.room?.text?.trim() && <Section title="Room start" muted={muted}><p className="whitespace-pre-wrap">{blocks.room.text}</p></Section>}
        {blocks.equipment?.text?.trim() && <Section title="Equipment and settings" muted={muted}><p className="whitespace-pre-wrap">{blocks.equipment.text}</p></Section>}

        {(blocks.gloves?.outer?.model || blocks.gloves?.inner?.model) && (
          <Section title="Gloves" muted={muted}>
            {blocks.gloves.outer?.model && (
              <label className="flex items-start gap-3 min-h-11 py-1">
                {checkFor('glove-outer')}
                <span>Outer · {[blocks.gloves.outer.model, blocks.gloves.outer.size].filter(Boolean).join(' ')}</span>
              </label>
            )}
            {blocks.gloves.inner?.model && (
              <label className="flex items-start gap-3 min-h-11 py-1">
                {checkFor('glove-inner')}
                <span>Inner · {[blocks.gloves.inner.model, blocks.gloves.inner.size].filter(Boolean).join(' ')}</span>
              </label>
            )}
          </Section>
        )}

        {steps.length > 0 && (
          <Section title="Case flow" muted={muted}>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={step.id || index}>
                  <p className="font-bold">{index + 1}. {step.title}</p>
                  {step.ready?.trim() && <p>Have ready: {step.ready}</p>}
                  {step.habit?.trim() && <p>{step.habit}</p>}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {(blocks.instruments || []).some(item => item?.name?.trim()) && (
          <Section title="Instruments" muted={muted}>
            {(blocks.instruments || []).filter(item => item?.name?.trim()).map(item => {
              const nick = (blocks.nicknames || []).find(entry => (entry.actual || '').trim().toLowerCase() === item.name.trim().toLowerCase());
              return (
                <label key={item.id} className="flex items-start gap-3 min-h-11 py-1">
                  {checkFor(`instrument-${item.id}`)}
                  <span>
                    {item.name.trim()}{nick ? ` “${nick.nickname}”` : ''}
                    {item.mayo ? ' · Mayo' : ''}
                    {!item.mayo && item.from?.trim() ? ` · from ${item.from.trim()}` : ''}
                  </span>
                </label>
              );
            })}
          </Section>
        )}

        {(blocks.trays || []).length > 0 && (
          <Section title="Trays" muted={muted}>
            {blocks.trays.map(tray => (
              <label key={tray.id} className="flex items-start gap-3 min-h-11 py-1">
                {checkFor(`tray-${tray.id}`)}
                <span>{[tray.commonName || 'Tray', tray.spdName && `SPD: ${tray.spdName}`, tray.openOrHold === 'hold' ? 'Hold' : 'Open'].filter(Boolean).join(' · ')}</span>
              </label>
            ))}
          </Section>
        )}

        {(blocks.sutures || []).length > 0 && (
          <Section title="Sutures" muted={muted}>
            {blocks.sutures.map(suture => {
              const layer = suture.layer && suture.layer.toLowerCase() !== 'unspecified' ? suture.layer : '';
              return (
                <label key={suture.id} className="flex items-start gap-3 min-h-11 py-1">
                  {checkFor(`suture-${suture.id}`)}
                  <span>{[layer, suture.name, suture.size, suture.needle, suture.open && `open ${suture.open}`, suture.hold && `hold ${suture.hold}`].filter(Boolean).join(' ')}</span>
                </label>
              );
            })}
          </Section>
        )}

        {(blocks.implants || []).length > 0 && (
          <Section title="Implants" muted={muted}>
            {blocks.implants.map(implant => (
              <label key={implant.id} className="flex items-start gap-3 min-h-11 py-1">
                {checkFor(`implant-${implant.id}`)}
                <span>{[implant.systemName || 'Unnamed system', implant.repExpected ? 'Rep expected' : ''].filter(Boolean).join(' · ')}</span>
              </label>
            ))}
          </Section>
        )}

        {(blocks.nicknames || []).length > 0 && (
          <Section title="Nicknames" muted={muted}>
            {blocks.nicknames.map((nick, index) => (
              <p key={`${nick.nickname}-${index}`}>“{nick.nickname}” → {nick.actual}</p>
            ))}
          </Section>
        )}

        {(blocks.people || []).length > 0 && (
          <Section title="People" muted={muted}>
            {blocks.people.map((person, index) => (
              <p key={`${person.name}-${index}`}>{[person.name, person.role].filter(Boolean).join(' · ')}</p>
            ))}
          </Section>
        )}

        {blocks.endOfCase?.text?.trim() && (
          <Section title="Dressing and end of case" muted={muted}>
            <p className="whitespace-pre-wrap">{blocks.endOfCase.text}</p>
          </Section>
        )}
        {blocks.note?.text?.trim() && (
          <Section title="Note" muted={muted}>
            <p className="whitespace-pre-wrap">{blocks.note.text}</p>
          </Section>
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
              </form>
            )}
          </div>
        )}
      </div>
      {phi.length > 0 && <PhiPause signals={phi} next="Take that detail out, then send the suggestion." onEdit={() => setPhi([])} />}
    </div>,
    document.body,
  );
}
