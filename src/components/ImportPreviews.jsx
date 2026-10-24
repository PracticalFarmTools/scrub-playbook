import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { importPreviewText } from '../data/incoming';
import { leaveKeysOut, lockedPlaces, unlockPublished } from '../data/keyLock';
import {
  UNIT_AGE_WARNING_DAYS, isOwnUnitBook, isRetiredUnitBook, namesList, pinnedKey, unitAgeDays,
  unitChangeList, unitCheckText, unitConflicts, unitPreviewText, unitRevision,
} from '../data/unitBook';
import ProcedureGlance from './ProcedureGlance';

const primary = 'w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer';
const secondary = 'w-full min-h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer';

export function ErrorLine({ error }) {
  if (!error) return null;
  return <p role="alert" className="text-xs text-rose-700 flex items-center gap-1.5"><AlertCircle size={13} aria-hidden="true" /> {error}</p>;
}

function Cancel({ onCancel }) {
  return <button type="button" onClick={onCancel} className="w-full min-h-11 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>;
}

function SignatureLine({ check }) {
  if (!check) return <p className="text-sm text-slate-600" role="status">Checking the publisher’s signature…</p>;
  if (!check.ok) return <p className="text-sm text-rose-700" role="alert">{unitCheckText(check)}</p>;
  return <p className="text-sm text-slate-600">Signed by publisher key {check.fingerprint}.</p>;
}

function unitState(book, file, phi, check) {
  const had = unitRevision(book, file.unitBookId);
  const own = isOwnUnitBook(file);
  const older = had > 0 && Number(file.revision) <= had;
  const pinned = pinnedKey(book, file.unitBookId);
  const otherPublisher = Boolean(check?.ok && pinned && pinned !== check.fingerprint);
  const retired = isRetiredUnitBook(book, file.unitBookId);
  const conflicts = unitConflicts(book, file);
  const conflictIds = new Set(conflicts.map(surgeon => surgeon.id));
  const fresh = (file.book?.surgeons || []).filter(surgeon => !surgeon.demo && !conflictIds.has(surgeon.id)).length;
  const signed = Boolean(check?.ok) && !otherPublisher && !retired;
  const changes = signed && had > 0 && !own && !older
    ? unitChangeList(book, file, { fingerprint: check.fingerprint })
    : null;
  return {
    file,
    had,
    own,
    older,
    check,
    otherPublisher,
    retired,
    conflicts,
    mine: conflicts.filter(surgeon => !surgeon.unitBook),
    earlier: conflicts.filter(surgeon => surgeon.unitBook),
    fresh,
    changes,
    ageDays: unitAgeDays(file),
    canAdd: signed && !own && !older && phi.length === 0,
  };
}

/** One shared card: where it lands in this book, its first-case lines, and the card itself. */
export function CardPreview({ preview, commit, error, onCancel }) {
  const { classification, phi } = preview;
  const surgeon = preview.parsed.book.surgeons?.[0];
  const procedure = preview.parsed.book.procedures?.[0];
  const lines = (surgeon?.firstCase || []).filter(Boolean);
  const kind = classification?.kind;
  const clear = phi.length === 0;
  return (
    <>
      {kind === 'new' && (
        <p className="text-sm text-slate-700">
          For {[surgeon?.name || 'an unnamed surgeon', surgeon?.specialty].filter(Boolean).join(' · ')}, new to your book.
        </p>
      )}
      {kind === 'attach' && <p className="text-sm text-slate-700">Adds to {classification.surgeon.name} in your book.</p>}
      {kind === 'duplicate' && (
        <p className="text-sm text-slate-700">You already have this procedure for {classification.surgeon.name}. Add another copy?</p>
      )}
      {clear && kind === 'ambiguous' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">More than one {surgeon?.name} is in your book.</p>
          {classification.surgeons.map(match => (
            <button type="button" key={match.id} onClick={() => commit(match.id)} className="block w-full min-h-11 text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
              Add to {match.name} · {match.specialty}
            </button>
          ))}
        </div>
      )}
      {lines.length > 0 && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New to {surgeon?.name}</p>
          <ul className="mt-1.5 space-y-1">
            {lines.map((line, index) => <li key={index} className="text-sm text-slate-700">• {line}</li>)}
          </ul>
          {['attach', 'duplicate'].includes(kind) && (
            <p className="text-xs text-slate-500 mt-1.5">{classification.surgeon.name} keeps the first-case lines already in your book. These lines are not added.</p>
          )}
          {kind === 'ambiguous' && (
            <p className="text-xs text-slate-500 mt-1.5">These lines are added only with a new surgeon. A surgeon already in your book keeps their own lines.</p>
          )}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
        <ProcedureGlance procedure={procedure} surgeon={surgeon} />
      </div>
      {clear && kind === 'duplicate' && (
        <button type="button" onClick={() => commit(classification.surgeon.id)} className={primary}>Add a copy</button>
      )}
      {clear && kind !== 'duplicate' && kind !== 'ambiguous' && (
        <button type="button" onClick={() => commit(kind === 'attach' ? classification.surgeon.id : undefined)} className={primary}>Add unconfirmed</button>
      )}
      {clear && kind === 'ambiguous' && (
        <button type="button" onClick={() => commit()} className={secondary}>Add as a new surgeon</button>
      )}
      <ErrorLine error={error} />
      <Cancel onCancel={onCancel} />
    </>
  );
}

/** A signed unit book: the signature, what changes, and whether this phone can take it. */
export function UnitBookPreview({ book, preview, commit, error, onCancel }) {
  const unit = unitState(book, preview.parsed.file, preview.phi, preview.check);
  return (
    <>
      <p className="text-sm text-slate-700">{unitPreviewText(unit.file)}</p>
      <SignatureLine check={unit.check} />
      {unit.otherPublisher && (
        <p className="text-sm text-rose-700" role="alert">
          This file was signed by a different publisher than the unit book for {unit.file.place} on this phone, so it can’t be used. Ask your unit who publishes it now.
        </p>
      )}
      {unit.check?.ok && unit.ageDays > UNIT_AGE_WARNING_DAYS && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          This revision was published {unit.ageDays} days ago. Ask your unit whether there is a newer one.
        </p>
      )}
      {unit.changes?.status === 'updated' && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What changes from revision {unit.had}</p>
          {unit.changes.cards.length === 0 && unit.changes.removed === 0 && (
            <p className="text-sm text-slate-700 mt-1">No card changes. Only the revision number moves forward.</p>
          )}
          <ul className="mt-1.5 space-y-1">
            {unit.changes.cards.map(item => (
              <li key={item.id} className="text-sm text-slate-700">
                <span className="font-semibold">{item.title}</span>: {item.changes.join(', ')}
              </li>
            ))}
            {unit.changes.removed > 0 && (
              <li className="text-sm text-slate-700">{unit.changes.removed} {unit.changes.removed === 1 ? 'card' : 'cards'} removed</li>
            )}
          </ul>
        </div>
      )}
      {unit.own && <p className="text-sm text-slate-700">This is the unit book you published from this phone. Your notes already have it.</p>}
      {!unit.own && unit.older && <p className="text-sm text-slate-700">You already have revision {unit.had}.</p>}
      {unit.retired && (
        <p className="text-sm text-rose-700" role="alert">
          This phone already switched from this unit book for {unit.file.place} to a newer one, so it can’t be used. Ask your unit who publishes {unit.file.place} now.
        </p>
      )}
      {unit.canAdd && unit.mine.length > 0 && (
        <p className="text-sm text-slate-700">
          You already keep {namesList(unit.mine)} as your own notes, maybe from a hand-off.
          Use the unit book for {unit.mine.length === 1 ? 'that surgeon' : 'them'} and your matching cards are replaced by the unit’s version. Your other procedures stay yours.
        </p>
      )}
      {unit.canAdd && unit.had === 0 && unit.earlier.length === 0 && (
        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          This is the first file from this unit book on this phone. Check that the key {unit.check.fingerprint} matches the one your unit posted.
          From now on this phone accepts revisions signed with this key only.
        </p>
      )}
      {unit.canAdd && unit.earlier.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          You have {namesList(unit.earlier)} from an earlier unit book. Switch only if your unit told you it replaced its publishing key,
          and check that the key {unit.check.fingerprint} matches the one your unit announced. After you switch, this phone will not accept the earlier unit book again.
        </p>
      )}
      {unit.canAdd && unit.conflicts.length > 0 && (
        <button type="button" onClick={() => commit(undefined, { adopt: true })} className={primary}>
          {unit.earlier.length ? 'Switch to this unit book for' : 'Use the unit book for'} {unit.conflicts.length === 1 ? unit.conflicts[0].name : 'them'}
        </button>
      )}
      {unit.canAdd && unit.fresh > 0 && (
        <button type="button" onClick={() => commit()} className={unit.conflicts.length ? secondary : primary}>
          {unit.conflicts.length ? (unit.earlier.length ? 'Keep the earlier unit book and add the rest' : 'Keep my notes and add the rest') : 'Add unit book'}
        </button>
      )}
      <ErrorLine error={error} />
      <Cancel onCancel={onCancel} />
    </>
  );
}

/** A hand-over file that makes this phone the publisher of a place. */
export function HandoverPreview({ preview, commit, error, onCancel }) {
  const { handover } = preview.parsed;
  return (
    <>
      <p className="text-sm text-slate-700">
        {handover.from || 'A tech'} is handing you publishing for the unit book for {handover.place}, revision {handover.unitFile.revision}.
      </p>
      <SignatureLine check={preview.check} />
      <p className="text-sm text-slate-700">
        You become the publisher. The unit’s cards become your notes, and the next revision you publish is accepted by every phone that has this unit book. Take this only if your unit asked you to.
      </p>
      <p className="text-xs text-slate-600">After you take over, delete this file. Anyone holding it can publish for {handover.place}.</p>
      {preview.check?.ok && preview.phi.length === 0 && (
        <button type="button" onClick={() => commit()} className={primary}>Take over publishing</button>
      )}
      <ErrorLine error={error} />
      <Cancel onCancel={onCancel} />
    </>
  );
}

/**
 * A backup or a hand-off of a place. This person's own backup can be restored whole; a locked
 * publishing key in it needs its passphrase, or the backup comes back without publishing.
 */
export function BackupPreview({ preview, commit, error, setError, onCancel }) {
  const { parsed, phi } = preview;
  const [passphrase, setPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const locked = parsed.restorable ? lockedPlaces(parsed.extras?.published) : [];
  const clear = phi.length === 0;

  const restoreWith = (published) => commit(undefined, {
    restore: { ...parsed, extras: { ...(parsed.extras || {}), published } },
  });

  const restoreUnlocked = async (event) => {
    event.preventDefault();
    if (!passphrase || unlocking) return;
    setUnlocking(true);
    setError('');
    try {
      const result = await unlockPublished(parsed.extras?.published, passphrase);
      if (result.error) {
        setError(`That passphrase does not unlock the publishing key for ${result.place}. Try again, or restore without publishing.`);
        return;
      }
      restoreWith(result.published);
    } catch {
      setError('This phone could not unlock the key. Restore without publishing, or try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <p className="text-sm text-slate-700">{importPreviewText(parsed)}</p>
      {clear && parsed.restorable && locked.length > 0 && (
        <form onSubmit={restoreUnlocked} className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
          <p className="text-sm text-slate-700">This backup holds the locked publishing key for {locked.join(', ')}. Enter its passphrase to keep publishing from this phone.</p>
          <label className="block text-xs font-bold text-slate-600">
            Backup passphrase
            <input type="password" autoComplete="current-password" value={passphrase} onChange={e => { setPassphrase(e.target.value); setError(''); }} className="mt-1 w-full min-h-11 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm px-3" />
          </label>
          <button type="submit" disabled={!passphrase || unlocking} className={`${primary} disabled:opacity-40`}>
            {unlocking ? 'Unlocking…' : 'Restore my backup'}
          </button>
          <button type="button" onClick={() => restoreWith(leaveKeysOut(parsed.extras?.published))} disabled={unlocking} className="w-full min-h-11 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-sm disabled:opacity-40 cursor-pointer">Restore without publishing</button>
        </form>
      )}
      {clear && parsed.restorable && (
        <>
          {locked.length === 0 && (
            <button type="button" onClick={() => commit(undefined, { restore: parsed })} className={primary}>Restore my backup</button>
          )}
          <p className="text-xs text-slate-600">For your own backup. Your confirmations, the board, recent activity, and unit books you publish come back. A card on this phone that is newer than the backup stays as it is.</p>
          <button type="button" onClick={() => commit()} className="w-full min-h-11 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer">Add as someone else’s notes</button>
          <p className="text-xs text-slate-600">For a backup from another tech. Only cards you do not have are added, and they arrive unconfirmed.</p>
        </>
      )}
      {clear && !parsed.restorable && (
        <button type="button" onClick={() => commit()} className={primary}>Add unconfirmed</button>
      )}
      <ErrorLine error={error} />
      <Cancel onCancel={onCancel} />
    </>
  );
}
