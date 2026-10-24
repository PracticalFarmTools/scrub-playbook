import { MapPin, Scissors } from 'lucide-react';
import { GLOVE_COLOR_HEX } from '../data/gloves';
import { CARD_STATUS } from '../data/schema';
import { timeAgo, trustState } from '../data/trust';
import ProductLink from './ProductLink';
import { resolveProductLink } from '../data/productLink';
import { instrumentLines } from '../data/share';
import { sourceLabel } from '../data/unitBook';
import { STATUS_CLASS } from './statusStyle';
import { followUpText, suggestionState } from '../data/suggestions';
import { EditTrailLine } from './EditTrail';

function statusLabel(state) {
  if (state.status === CARD_STATUS.CONFIRMED) {
    return state.people >= 2 ? `Confirmed by two · ${timeAgo(state.at)}` : `Matched a case · ${timeAgo(state.at)}`;
  }
  if (state.status === CARD_STATUS.NOTED) return `One staff member · ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.STALE) return `Stale · last matched ${timeAgo(state.at)}`;
  if (state.status === CARD_STATUS.DISPUTED) return 'Flagged · do not treat this as a match';
  return 'Unconfirmed';
}

function GloveLine({ glove, label }) {
  if (!glove?.model) return null;
  return (
    <div className="inline-flex items-center gap-2 bg-medical-50 border border-medical-200 rounded-full px-3 py-1">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GLOVE_COLOR_HEX[glove.color] || '#94a3b8' }} />
      <span className="text-xs font-bold uppercase tracking-wide text-medical-700">{label}</span>
      <ProductLink productId={glove.productId} vendorName={glove.brand} className="text-sm font-semibold text-medical-800">
        {glove.model}
      </ProductLink>
      <span className="text-sm font-bold text-medical-700">Size {glove.size}</span>
    </div>
  );
}

/**
 * @param {{ procedure: any, mode?: string, staleDays?: number, surgeon?: any, onCaseView?: () => void, showTitle?: boolean,
 *   suggestion?: { at: string, change: string } | null, onCloseSuggestion?: (suggestion: object, outcome: string) => void }} props
 */
export default function ProcedureGlance({ procedure, mode = 'personal', staleDays, surgeon, onCaseView, showTitle = true, suggestion = null, onCloseSuggestion }) {
  const state = trustState(procedure, { mode, staleDays });
  const blocks = procedure.blocks || {};
  const sutures = blocks.sutures || [];
  const trays = blocks.trays || [];
  const nicknames = blocks.nicknames || [];

  return (
    <div className="border-t border-slate-100">
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            {showTitle && <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{procedure.name}{procedure.approach ? ` · ${procedure.approach}` : ''}</h4>}
            {showTitle && sourceLabel(procedure) && (
              <p className="text-xs font-bold uppercase tracking-widest text-medical-600 mt-0.5">{sourceLabel(procedure)}</p>
            )}
            {surgeon?.facility && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {surgeon.facility}</p>
            )}
          </div>
        </div>
        {procedure.official?.label && (
          <p className="mt-2 text-xs text-slate-500">
            Official card: {procedure.official.label}
            {procedure.official.reviewedAt && ` · checked ${new Date(procedure.official.reviewedAt).toLocaleDateString()}`}
          </p>
        )}
      </div>

      <div className={`mx-5 mb-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[state.status]}`}>
        {(procedure.demo || surgeon?.demo) && 'Sample · '}
        {statusLabel(state)}
        {state.names?.length > 0 && <span className="font-medium opacity-80"> · {state.names.join(', ')}</span>}
      </div>
      {!procedure.demo && !surgeon?.demo && <EditTrailLine procedure={procedure} className="mx-5 mb-3" />}
      {procedure.unitBook?.changes?.length > 0 && (
        <p className="mx-5 mb-3 rounded-lg bg-medical-50 border border-medical-200 px-3 py-2 text-sm text-medical-900">
          {procedure.unitBook.changes.includes('New card')
            ? `New in revision ${procedure.unitBook.revision}.`
            : `Changed in revision ${procedure.unitBook.revision}: ${procedure.unitBook.changes.join(', ')}.`}
        </p>
      )}
      {procedure.disputed && procedure.reportNote?.trim() && (
        <p className="mx-5 mb-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-900">
          Flag reason: {procedure.reportNote.trim()}
          {procedure.disputedBy ? ` · ${procedure.disputedBy}` : ''}
          {procedure.disputedAt ? ` · ${timeAgo(procedure.disputedAt)}` : ''}
        </p>
      )}

      {suggestion && (
        <div className="mx-5 mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-950 space-y-1">
          <p className="font-semibold">
            You suggested a change {new Date(suggestion.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {suggestion.change}
          </p>
          <p>{followUpText(suggestionState(suggestion, procedure))}</p>
          {onCloseSuggestion && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => onCloseSuggestion(suggestion, 'made')} className="min-h-11 px-3 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 cursor-pointer">The card has it now</button>
              <button type="button" onClick={() => onCloseSuggestion(suggestion, 'closed')} className="min-h-11 px-3 rounded-lg text-xs font-bold text-amber-900 cursor-pointer">Close the suggestion</button>
            </div>
          )}
        </div>
      )}

      <p className="px-5 pb-3 text-xs text-slate-500 leading-relaxed">
        Staff notes from recent cases. The surgeon and the official card win.
      </p>
      {(procedure.demo || surgeon?.demo) && (
        <p className="mx-5 mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          Sample. Not from your hospital. Copy it into your book before you change it. Samples are not shared or backed up.
        </p>
      )}

      <TextBlock label="Position" text={blocks.position?.text} />
      <TextBlock label="Prep" text={blocks.prep?.text} />
      <TextBlock label="Drapes" text={blocks.drapes?.text} />
      <TextBlock label="Room start" text={blocks.room?.text} />
      <TextBlock label="Equipment and settings" text={blocks.equipment?.text} />

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        <GloveLine glove={blocks.gloves?.outer} label="Outer" />
        <GloveLine glove={blocks.gloves?.inner} label="Inner" />
      </div>

      {(blocks.steps || []).length > 0 && (
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">Case flow · {blocks.steps.length} {blocks.steps.length === 1 ? 'step' : 'steps'}</p>
          {onCaseView && <button type="button" onClick={onCaseView} className="text-xs font-bold text-medical-700 bg-medical-50 rounded-lg px-3 min-h-11 cursor-pointer">Case view</button>}
        </div>
      )}

      {instrumentLines(blocks).mayo.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Mayo</p>
          <p className="text-sm text-slate-700">{instrumentLines(blocks).mayo.join(', ')}</p>
        </div>
      )}
      {instrumentLines(blocks).rest.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Also ready</p>
          {instrumentLines(blocks).rest.map(line => <p key={line} className="text-sm text-slate-700">{line}</p>)}
        </div>
      )}

      {trays.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Trays</p>
          <ul className="space-y-1">
            {trays.map(tray => (
              <li key={tray.id} className="text-sm text-slate-700">
                <span className="font-semibold">{tray.commonName}</span>
                {tray.spdName && <span className="text-slate-500"> · SPD: {tray.spdName}</span>}
                {tray.vendorName && <span className="text-slate-500"> · {tray.vendorName}</span>}
                <span className="text-slate-500"> · {tray.openOrHold === 'hold' ? 'Hold' : 'Open'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sutures.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Sutures</p>
          <div className="flex flex-wrap gap-2">
            {sutures.map(suture => (
              <span
                key={suture.id}
                className="suture-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm"
                style={{ backgroundColor: suture.color, color: suture.textColor }}
              >
                {suture.layer && suture.layer.toLowerCase() !== 'unspecified' && (
                  <span className="opacity-80">{suture.layer}</span>
                )}
                <ProductLink productId={suture.productId} catalogNumber={suture.catalogNumber} overrideUrl={suture.overrideUrl} showCompany={false}>
                  {suture.name}
                </ProductLink>
                {suture.size && <span className="opacity-80">{suture.size}</span>}
                {suture.needle && <span className="opacity-80">{suture.needle}</span>}
                {suture.open && <span className="opacity-80">open {suture.open}</span>}
                {suture.hold && <span className="opacity-80">hold {suture.hold}</span>}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {[...new Map(sutures.map(suture => {
              const link = resolveProductLink({ productId: suture.productId, catalogNumber: suture.catalogNumber, overrideUrl: suture.overrideUrl });
              return link?.kind === 'company' ? [link.href, link] : null;
            }).filter(Boolean)).values()].map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-medical-600 hover:text-medical-800">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {(blocks.implants || []).length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Implants</p>
          <ul className="space-y-1">
            {blocks.implants.map(implant => (
              <li key={implant.id} className="text-sm text-slate-700 flex flex-wrap items-center gap-1">
                <ProductLink productId={implant.productId} catalogNumber={implant.catalogNumber} overrideUrl={implant.overrideUrl}>
                  {implant.systemName || 'Unnamed system'}
                </ProductLink>
                {implant.repExpected && <span className="text-slate-500">· Rep expected</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nicknames.length > 0 && (
        <div className="px-5 py-3 bg-slate-900 text-white">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Scissors size={11} /> Nicknames
          </p>
          {nicknames.map((nick, index) => (
            <p key={`${nick.nickname}-${index}`} className="text-sm">
              <span className="font-semibold">“{nick.nickname}”</span>
              <span className="text-slate-400"> → </span>
              <span className="text-slate-300">{nick.actual}</span>
            </p>
          ))}
        </div>
      )}

      {(blocks.people || []).length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">People in the room</p>
          <ul className="space-y-1">
            {blocks.people.map((person, index) => (
              <li key={`${person.name}-${index}`} className="text-sm text-slate-700">
                <span className="font-semibold">{person.name}</span>
                {person.role && <span className="text-slate-500"> · {person.role}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TextBlock label="Dressing and end of case" text={blocks.endOfCase?.text} />

      {blocks.note?.text && (
        <p className="px-5 py-3 text-sm text-slate-600 whitespace-pre-wrap bg-slate-50">{blocks.note.text}</p>
      )}
    </div>
  );
}

function TextBlock({ label, text }) {
  if (!text?.trim()) return null;
  return (
    <div className="px-5 pb-3">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
