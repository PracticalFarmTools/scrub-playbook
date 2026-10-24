import { nickFor, pullTargets, trustLine } from '../data/caseView';

function Section({ title, children, muted }) {
  return (
    <section className="case-section py-4 border-b border-current/10">
      <h2 className={`text-xl font-bold mb-2 ${muted}`}>{title}</h2>
      <div className="text-lg leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * The readable case: header, setup, and the pull list. Shared by the case view and the day printout.
 * @param {{ surgeon: any, procedure: any, blocks: any, staleDays?: number, trust?: any, dark?: boolean,
 *   checks?: Record<string, boolean>, onToggle?: (id: string) => void, idPrefix?: string }} props
 */
export default function CaseBody({ surgeon, procedure, blocks, staleDays, trust, dark, checks, onToggle, idPrefix = 'case-view' }) {
  const targets = pullTargets(blocks);
  const sample = Boolean(procedure.demo || surgeon.demo);
  const muted = dark ? 'text-slate-400' : 'text-slate-600';
  const firstCase = (surgeon.firstCase || []).map(line => String(line || '').trim()).filter(Boolean).slice(0, 3);
  const steps = blocks.steps || [];

  const checkFor = (id) => targets.some(item => item.id === id)
    ? (
      <input
        type="checkbox"
        className="case-check mt-1 h-6 w-6 shrink-0"
        checked={Boolean(checks?.[id])}
        onChange={() => onToggle?.(id)}
        readOnly={!onToggle}
      />
    )
    : null;

  return (
    <>
      <header className="py-5 border-b border-current/10">
        {sample && (
          <p className={`mb-3 rounded-xl px-3 py-2 text-lg font-bold ${dark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
            Sample. Not from your hospital.
          </p>
        )}
        <p id={`${idPrefix}-surgeon`} className="text-xl font-bold">{surgeon.name}</p>
        <h1 id={`${idPrefix}-procedure`} className="text-xl font-bold mt-1">{procedure.name}{procedure.approach ? ` · ${procedure.approach}` : ''}</h1>
        {surgeon.facility?.trim() && <p className={`text-lg mt-1 ${muted}`}>{surgeon.facility}</p>}
        {procedure.official?.label?.trim() && (
          <p className="text-lg mt-2">Official card: {procedure.official.label.trim()}</p>
        )}
        {procedure.official?.note?.trim() && (
          <p className={`text-lg mt-1 whitespace-pre-wrap ${muted}`}>{procedure.official.note}</p>
        )}
        <p className={`text-lg mt-2 ${muted}`}>{trustLine(procedure, staleDays, sample, trust)}</p>
        {procedure.disputed && procedure.reportNote?.trim() && (
          <p className="text-lg mt-1 font-semibold">Flag reason: {procedure.reportNote.trim()}</p>
        )}
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
            const nick = nickFor(blocks, item.name);
            const id = `instrument-${item.id}`;
            return (
              <label key={item.id} className="flex items-start gap-3 min-h-11 py-1">
                {checkFor(id)}
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
    </>
  );
}
