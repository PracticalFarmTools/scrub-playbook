import { MapPin, Scissors } from 'lucide-react';
import { GLOVE_COLOR_HEX } from '../data/gloves';
import { CARD_STATUS } from '../data/schema';
import { timeAgo, trustState } from '../data/trust';
import ProductLink from './ProductLink';
import { resolveProductLink } from '../data/productLink';
import { STATUS_CLASS } from './statusStyle';

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
      <span className="text-[10px] font-bold uppercase tracking-wide text-medical-400">{label}</span>
      <ProductLink productId={glove.productId} vendorName={glove.brand} className="text-sm font-semibold text-medical-800">
        {glove.model}
      </ProductLink>
      <span className="text-sm font-bold text-medical-700">Size {glove.size}</span>
    </div>
  );
}

export default function ProcedureGlance({ procedure, mode = 'personal', staleDays, surgeon }) {
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
            <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{procedure.name}</h4>
            {surgeon?.facility && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {surgeon.facility}</p>
            )}
          </div>
        </div>
        {procedure.official?.label && (
          <p className="mt-2 text-[11px] text-slate-500">
            Official card: {procedure.official.label}
            {procedure.official.reviewedAt && ` · reviewed ${new Date(procedure.official.reviewedAt).toLocaleDateString()}`}
          </p>
        )}
      </div>

      <div className={`mx-5 mb-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[state.status]}`}>
        {statusLabel(state)}
        {state.names?.length > 0 && <span className="font-medium opacity-80"> · {state.names.join(', ')}</span>}
      </div>

      <p className="px-5 pb-3 text-[11px] text-slate-400 leading-relaxed">
        Staff notes from recent cases. The surgeon and the official card win.
      </p>
      {(procedure.demo || surgeon?.demo) && (
        <p className="mx-5 mb-3 rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600">
          Sample. Not from your hospital. Copy it into your book before you change it. Samples are not shared or backed up.
        </p>
      )}

      <TextBlock label="Room start" text={blocks.room?.text} />
      <TextBlock label="Equipment" text={blocks.equipment?.text} />

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        <GloveLine glove={blocks.gloves?.outer} label="Outer" />
        <GloveLine glove={blocks.gloves?.inner} label="Inner" />
      </div>

      {sutures.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Sutures</p>
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
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-medical-600 hover:text-medical-800">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {trays.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Trays</p>
          <ul className="space-y-1">
            {trays.map(tray => (
              <li key={tray.id} className="text-sm text-slate-700">
                <span className="font-semibold">{tray.commonName}</span>
                {tray.spdName && <span className="text-slate-400"> · SPD: {tray.spdName}</span>}
                {tray.vendorName && <span className="text-slate-400"> · {tray.vendorName}</span>}
                <span className="text-slate-400"> · {tray.openOrHold === 'hold' ? 'Hold' : 'Open'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(blocks.implants || []).length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Implants</p>
          <ul className="space-y-1">
            {blocks.implants.map(implant => (
              <li key={implant.id} className="text-sm text-slate-700 flex flex-wrap items-center gap-1">
                <ProductLink productId={implant.productId} catalogNumber={implant.catalogNumber} overrideUrl={implant.overrideUrl}>
                  {implant.systemName || 'Unnamed system'}
                </ProductLink>
                {implant.repExpected && <span className="text-slate-400">· Rep expected</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nicknames.length > 0 && (
        <div className="px-5 py-3 bg-slate-900 text-white">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Scissors size={11} /> Nicknames
          </p>
          {nicknames.map((nick, index) => (
            <p key={`${nick.nickname}-${index}`} className="text-sm">
              <span className="font-semibold">“{nick.nickname}”</span>
              <span className="text-slate-500"> → </span>
              <span className="text-slate-300">{nick.actual}</span>
            </p>
          ))}
        </div>
      )}

      {(blocks.people || []).length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">People in the room</p>
          <ul className="space-y-1">
            {blocks.people.map((person, index) => (
              <li key={`${person.name}-${index}`} className="text-sm text-slate-700">
                <span className="font-semibold">{person.name}</span>
                {person.role && <span className="text-slate-400"> · {person.role}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TextBlock label="End of the case" text={blocks.endOfCase?.text} />

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
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
