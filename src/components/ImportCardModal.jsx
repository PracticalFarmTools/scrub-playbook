import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, X } from 'lucide-react';
import { findPhiInProcedure, findPhiInSurgeon } from '../data/phi';
import { classifyIncomingCard, importPreviewText, parseImport } from '../data/share';
import {
  UNIT_AGE_WARNING_DAYS, checkHandover, checkUnitFile, isOwnUnitBook, namesList, pinnedKey, unitAgeDays,
  unitChangeList, unitCheckText, unitConflicts, unitPreviewText, unitRevision,
} from '../data/unitBook';
import PhiPause from './PhiPause';
import ProcedureGlance from './ProcedureGlance';

function unitState(book, file, phi, check) {
  const had = unitRevision(book, file.unitBookId);
  const own = isOwnUnitBook(file);
  const older = had > 0 && Number(file.revision) <= had;
  const pinned = pinnedKey(book, file.unitBookId);
  const otherPublisher = Boolean(check?.ok && pinned && pinned !== check.fingerprint);
  const conflicts = unitConflicts(book, file);
  const conflictIds = new Set(conflicts.map(surgeon => surgeon.id));
  const fresh = (file.book?.surgeons || []).filter(surgeon => !surgeon.demo && !conflictIds.has(surgeon.id)).length;
  const signed = Boolean(check?.ok) && !otherPublisher;
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
    conflicts,
    fresh,
    changes,
    ageDays: unitAgeDays(file),
    canAdd: signed && !own && !older && phi.length === 0,
  };
}

function SignatureLine({ check }) {
  if (!check) return <p className="text-sm text-slate-600" role="status">Checking the publisher’s signature…</p>;
  if (!check.ok) return <p className="text-sm text-rose-700" role="alert">{unitCheckText(check)}</p>;
  return <p className="text-sm text-slate-600">Signed by publisher key {check.fingerprint}.</p>;
}

function uniqueSignals(list) {
  const seen = new Set();
  return list.filter(signal => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}

export default function ImportCardModal({ book, onClose, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const checkRef = useRef(0);
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const stopScan = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  const review = (text) => {
    const source = (text ?? raw).trim();
    if (!source) return;
    try {
      const parsed = parseImport(source);
      const signals = [];
      let classification = null;
      if (parsed.type === 'card') {
        const procedure = parsed.book.procedures[0];
        const surgeon = parsed.book.surgeons[0];
        signals.push(...findPhiInProcedure(procedure), ...findPhiInSurgeon(surgeon));
        classification = classifyIncomingCard(book, surgeon, procedure);
      } else {
        for (const procedure of parsed.book.procedures || []) signals.push(...findPhiInProcedure(procedure));
        for (const surgeon of parsed.book.surgeons || []) signals.push(...findPhiInSurgeon(surgeon));
      }
      setPreview({ parsed, classification, phi: uniqueSignals(signals), check: null });
      setError('');
      stopScan();
      const signed = parsed.type === 'unitbook' ? parsed.file : parsed.type === 'publisher' ? parsed.handover : null;
      if (signed) {
        const seq = ++checkRef.current;
        const verify = parsed.type === 'unitbook' ? checkUnitFile(signed) : checkHandover(signed);
        verify
          .catch(() => ({ ok: false, reason: 'changed' }))
          .then(check => {
            if (seq === checkRef.current) setPreview(prev => (prev?.parsed === parsed ? { ...prev, check } : prev));
          });
      }
    } catch (err) {
      setPreview(null);
      setError(err?.code === 'no-card'
        ? 'This message has no card to save. Ask them to share it again from Scrub Playbook.'
        : 'Could not read that. Check it was copied in full.');
    }
  };

  const commit = (surgeonId, extra = {}) => {
    if (!preview || preview.phi.length) return;
    const signed = ['unitbook', 'publisher'].includes(preview.parsed.type);
    if (signed && !preview.check?.ok) return;
    const result = onImport(preview.parsed.book, {
      ...(surgeonId ? { surgeonId } : {}),
      ...(preview.parsed.type === 'unitbook' ? { unitFile: preview.parsed.file, fingerprint: preview.check.fingerprint } : {}),
      ...(preview.parsed.type === 'publisher' ? { handover: preview.parsed.handover, fingerprint: preview.check.fingerprint } : {}),
      ...extra,
    });
    if (result && result.success === false) {
      setError(result.error || 'Could not import that.');
      return;
    }
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target.result || '');
      setRaw(text);
      review(text);
    };
    reader.readAsText(file);
  };

  const startScan = async () => {
    if (!canScan) {
      setError('This browser cannot scan. Paste the text instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
      setError('');
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      });
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      timerRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            stopScan();
            setRaw(value);
            review(value);
          }
        } catch {
          /* keep looking until the code is steady */
        }
      }, 400);
    } catch {
      stopScan();
      setError('Camera permission is needed to scan. Paste the text instead.');
    }
  };

  const unit = preview?.parsed?.type === 'unitbook' ? unitState(book, preview.parsed.file, preview.phi, preview.check) : null;
  const handover = preview?.parsed?.type === 'publisher' ? preview.parsed.handover : null;
  const card = preview?.parsed?.type === 'card' ? preview.parsed.book : null;
  const incomingSurgeon = card?.surgeons?.[0];
  const incomingProcedure = card?.procedures?.[0];
  const incomingLines = (incomingSurgeon?.firstCase || []).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-medical-700 to-medical-800">
          <p className="text-white font-bold text-sm flex items-center gap-2"><Download size={16} /> Import</p>
          <button type="button" onClick={() => { stopScan(); onClose(); }} className="text-medical-200 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          {!preview && (
            <>
              <p className="text-xs text-slate-500">Paste a procedure or a backup. You will see the card before it is saved. Everything imported is unconfirmed.</p>
              {canScan && !scanning && (
                <button type="button" onClick={startScan} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer">Scan a code</button>
              )}
              {scanning && (
                <div className="space-y-2">
                  <video ref={videoRef} muted playsInline className="w-full rounded-xl bg-slate-900" />
                  <button type="button" onClick={stopScan} className="w-full py-2 rounded-xl bg-slate-100 font-bold text-sm cursor-pointer">Stop scanning</button>
                </div>
              )}
              <textarea value={raw} onChange={(e) => { setRaw(e.target.value); setError(''); }} rows={4} placeholder="Paste the shared text here" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono px-3 py-2" />
              {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
              <button type="button" onClick={() => review(raw)} disabled={!raw.trim()} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">Review</button>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or a backup file</label>
              <input type="file" accept=".json,application/json" onChange={handleFileChange} className="w-full text-xs text-slate-500" />
            </>
          )}
          {preview && card && (
            <>
              {preview.classification?.kind === 'duplicate' && (
                <p className="text-sm text-slate-700">You already have this procedure for {preview.classification.surgeon.name}. Add another copy?</p>
              )}
              {preview.phi.length === 0 && preview.classification?.kind === 'ambiguous' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">More than one {incomingSurgeon?.name} is in your book.</p>
                  {preview.classification.surgeons.map(surgeon => (
                    <button type="button" key={surgeon.id} onClick={() => commit(surgeon.id)} className="block w-full text-left text-sm font-semibold rounded-lg bg-slate-50 px-3 py-2 cursor-pointer">
                      Add to {surgeon.name} · {surgeon.specialty}
                    </button>
                  ))}
                </div>
              )}
              {incomingLines.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">New to {incomingSurgeon?.name}</p>
                  <ul className="mt-1.5 space-y-1">
                    {incomingLines.map((line, index) => <li key={index} className="text-sm text-slate-700">• {line}</li>)}
                  </ul>
                  {['attach', 'duplicate'].includes(preview.classification?.kind) && (
                    <p className="text-[11px] text-slate-500 mt-1.5">{preview.classification.surgeon.name} keeps the first-case lines already in your book. These lines are not added.</p>
                  )}
                  {preview.classification?.kind === 'ambiguous' && (
                    <p className="text-[11px] text-slate-500 mt-1.5">These lines are added only with a new surgeon. A surgeon already in your book keeps their own lines.</p>
                  )}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
                <ProcedureGlance procedure={incomingProcedure} surgeon={incomingSurgeon} />
              </div>
              {preview.phi.length === 0 && preview.classification?.kind === 'duplicate' && (
                <button type="button" onClick={() => commit(preview.classification.surgeon.id)} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add a copy</button>
              )}
              {preview.phi.length === 0 && preview.classification?.kind !== 'duplicate' && preview.classification?.kind !== 'ambiguous' && (
                <button type="button" onClick={() => commit(preview.classification?.kind === 'attach' ? preview.classification.surgeon.id : undefined)} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add unconfirmed</button>
              )}
              {preview.phi.length === 0 && preview.classification?.kind === 'ambiguous' && (
                <button type="button" onClick={() => commit()} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer">Add as a new surgeon</button>
              )}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
          {unit && (
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
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">What changes from revision {unit.had}</p>
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
              {!unit.own && !unit.older && unit.conflicts.length > 0 && (
                <p className="text-sm text-slate-700">
                  You already keep {namesList(unit.conflicts)} as your own notes, maybe from a hand-off.
                  Use the unit book for {unit.conflicts.length === 1 ? 'that surgeon' : 'them'} and your matching cards are replaced by the unit’s version. Your other procedures stay yours.
                </p>
              )}
              {unit.canAdd && unit.conflicts.length > 0 && (
                <button type="button" onClick={() => commit(undefined, { adopt: true })} className="w-full py-2.5 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Use the unit book for {unit.conflicts.length === 1 ? unit.conflicts[0].name : 'them'}</button>
              )}
              {unit.canAdd && unit.fresh > 0 && (
                <button type="button" onClick={() => commit()} className={`w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer ${unit.conflicts.length ? 'bg-slate-100 text-slate-700' : 'bg-medical-600 text-white'}`}>
                  {unit.conflicts.length ? 'Keep my notes and add the rest' : 'Add unit book'}
                </button>
              )}
              {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
          {handover && (
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
                <button type="button" onClick={() => commit()} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Take over publishing</button>
              )}
              {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
          {preview && !card && !['unitbook', 'publisher'].includes(preview.parsed.type) && (
            <>
              <p className="text-sm text-slate-700">{importPreviewText(preview.parsed)}</p>
              {preview.phi.length === 0 && preview.parsed.restorable && (
                <>
                  <button type="button" onClick={() => commit(undefined, { restore: preview.parsed })} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Restore my backup</button>
                  <p className="text-xs text-slate-600">For your own backup. Your confirmations, the board, recent activity, and unit books you publish come back. A card on this phone that is newer than the backup stays as it is.</p>
                  <button type="button" onClick={() => commit()} className="w-full min-h-11 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer">Add as someone else’s notes</button>
                  <p className="text-xs text-slate-600">For a backup from another tech. Only cards you do not have are added, and they arrive unconfirmed.</p>
                </>
              )}
              {preview.phi.length === 0 && !preview.parsed.restorable && (
                <button type="button" onClick={() => commit()} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold text-sm cursor-pointer">Add unconfirmed</button>
              )}
              <button type="button" onClick={() => setPreview(null)} className="w-full py-2 rounded-xl text-sm font-bold text-slate-500 cursor-pointer">Cancel</button>
            </>
          )}
        </div>
      </div>
      {preview?.phi?.length > 0 && (
        <PhiPause
          signals={preview.phi}
          next="Nothing was saved. Ask the sender to take that detail out and share it again."
          action="Go back"
          onEdit={() => setPreview(null)}
        />
      )}
    </div>
  );
}
