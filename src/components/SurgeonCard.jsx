import { memo, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, User, Scissors, Stethoscope, Edit3, Check, X, ExternalLink, Plus, UserPlus, Clock, FileText, MapPin, ShieldCheck, ShieldAlert, ShieldQuestion, Share2 } from 'lucide-react';
import { SURGICAL_GLOVES, GLOVE_SIZES } from '../data/gloves';
import { ASSIST_ROLES, CARD_STATUS } from '../data/constants';
import MicButton from './MicButton';
import ShareCardModal from './ShareCardModal';
import ConfirmNameModal from './ConfirmNameModal';

// ── Verification status: badge + next-action config ──
const STATUS_META = {
  [CARD_STATUS.VERIFIED]: { label: 'Verified', icon: ShieldCheck, className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  [CARD_STATUS.PENDING_COSIGN]: { label: '1 of 2 Confirms', icon: Clock, className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  [CARD_STATUS.UNCONFIRMED]: { label: 'Unconfirmed', icon: ShieldQuestion, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  [CARD_STATUS.DISPUTED]: { label: 'Disputed', icon: ShieldAlert, className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

// ── Glove color map (static) ──
const GLOVE_COLORS = {
  'Green': '#22c55e', 'Blue': '#3b82f6', 'White': '#e2e8f0',
  'Straw/Tan': '#d4a574', 'Straw': '#d4a574', 'Ivory': '#f5f0e8',
  'Brown/Green': '#6b7a3d', 'Dark Brown': '#5c3a1e', 'Cream': '#f5e6c8',
};

const GLOVE_OPTIONS = SURGICAL_GLOVES.map(g => ({
  id: g.id, label: `${g.brand} – ${g.model}`, model: g.model, brand: g.brand, color: g.color,
}));

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EMPTY_ASSIST = { name: '', role: 'PA', gloveId: SURGICAL_GLOVES[0].id, gloveSize: '7.0' };

function SurgeonCard({ surgeon, onDelete, onUpdate, index, vendorLinks = [], onAudit, auditLog = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTips, setEditingTips] = useState(false);
  const [tipDraft, setTipDraft] = useState(surgeon.tips || '');
  const [tipNote, setTipNote] = useState('');

  // Quick-Add Assist state
  const [showAssistForm, setShowAssistForm] = useState(false);
  const [assistDraft, setAssistDraft] = useState({ ...EMPTY_ASSIST });
  const [assistNote, setAssistNote] = useState('');

  // History toggle
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filter audit log for this surgeon
  const cardHistory = auditLog.filter(e => e.surgeonName === surgeon.name);
  const status = surgeon.status || CARD_STATUS.UNCONFIRMED;
  const statusMeta = STATUS_META[status];

  const submitConfirmName = (name) => {
    const now = new Date().toISOString();

    if (status === CARD_STATUS.PENDING_COSIGN) {
      // Co-signing step
      const firstConfirmer = surgeon.confirmedBy?.[0] || surgeon.lastVerifiedBy || '';
      if (name.toLowerCase() === firstConfirmer.toLowerCase()) {
        return { error: 'Needs a second tech to confirm — try a different name.' };
      }

      const newConfirmedBy = [firstConfirmer, name];
      const firstConfirmedAt = surgeon.confirmedAt?.[0] || surgeon.lastVerifiedAt || now;
      const newConfirmedAt = [firstConfirmedAt, now];

      onUpdate({
        ...surgeon,
        status: CARD_STATUS.VERIFIED,
        confirmedBy: newConfirmedBy,
        confirmedAt: newConfirmedAt,
        lastVerifiedBy: name,
        lastVerifiedAt: now
      });

      onAudit?.({
        action: 'Co-Signed',
        surgeonName: surgeon.name,
        user: name,
        note: `Co-signed after ${firstConfirmer}`
      });
    } else {
      // First confirm step (from unconfirmed, disputed, or otherwise)
      onUpdate({
        ...surgeon,
        status: CARD_STATUS.PENDING_COSIGN,
        confirmedBy: [name],
        confirmedAt: [now],
        lastVerifiedBy: name,
        lastVerifiedAt: now
      });

      onAudit?.({
        action: 'First Confirm',
        surgeonName: surgeon.name,
        user: name
      });
    }
    return {};
  };

  const flagDisputed = () => {
    onUpdate({ ...surgeon, status: CARD_STATUS.DISPUTED, confirmedBy: null, confirmedAt: null });
    onAudit?.({ action: 'Flagged as Disputed', surgeonName: surgeon.name, user: surgeon.addedBy || 'Kyle' });
  };

  const saveTips = () => {
    const oldTips = surgeon.tips || '';
    onUpdate({ ...surgeon, tips: tipDraft });
    if (onAudit) {
      onAudit({
        action: oldTips ? 'Tips Updated' : 'Tips Added',
        surgeonName: surgeon.name,
        user: surgeon.addedBy || 'Kyle',
        note: tipNote || null,
      });
    }
    setEditingTips(false);
    setTipNote('');
  };

  const saveAssist = () => {
    if (!assistDraft.name.trim()) return;
    const glove = SURGICAL_GLOVES.find(g => g.id === assistDraft.gloveId);
    const newAssist = {
      name: assistDraft.name.trim(),
      role: assistDraft.role,
      gloveModel: glove?.model || '',
      gloveBrand: glove?.brand || '',
      gloveSize: assistDraft.gloveSize,
      addedBy: surgeon.addedBy || 'Kyle',
      addedOn: new Date().toISOString(),
    };
    onUpdate({
      ...surgeon,
      assists: [...(surgeon.assists || []), newAssist],
    });
    if (onAudit) {
      onAudit({
        action: `Assist Added: ${newAssist.name} (${newAssist.role})`,
        surgeonName: surgeon.name,
        user: surgeon.addedBy || 'Kyle',
        note: assistNote || null,
      });
    }
    setAssistDraft({ ...EMPTY_ASSIST });
    setAssistNote('');
    setShowAssistForm(false);
  };

  const removeAssist = (idx) => {
    const removed = surgeon.assists[idx];
    onUpdate({
      ...surgeon,
      assists: surgeon.assists.filter((_, i) => i !== idx),
    });
    if (onAudit) {
      onAudit({
        action: `Assist Removed: ${removed.name}`,
        surgeonName: surgeon.name,
        user: surgeon.addedBy || 'Kyle',
      });
    }
  };

  const inputClass = "w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-medical-400/50 transition-all placeholder-slate-400";

  return (
    <div
      className="card-animate bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-medical-700 to-medical-800 px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate">{surgeon.name}</h3>
            <p className="text-medical-200 text-sm flex items-center gap-1.5 mt-0.5">
              <Stethoscope size={14} />
              {surgeon.specialty}
            </p>
            {surgeon.facility && (
              <p className="text-medical-300 text-xs flex items-center gap-1.5 mt-1">
                <MapPin size={12} />
                {surgeon.facility}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 -mr-1 -mt-1">
            <button
              onClick={() => setShowShare(true)}
              className="text-medical-300 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label="Share surgeon card"
              title="Share card (no network needed)"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={() => onDelete(surgeon.id)}
              className="text-medical-300 hover:text-rose-400 transition-colors p-1 cursor-pointer"
              aria-label="Delete surgeon"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-medical-300 text-xs italic">
            Added by {surgeon.addedBy || 'Unknown'} on {formatDate(surgeon.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Trust Bar: Verification Status ── */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.className}`}>
          <statusMeta.icon size={12} />
          {statusMeta.label}
          {surgeon.lastVerifiedAt && (status === CARD_STATUS.VERIFIED || status === CARD_STATUS.PENDING_COSIGN) && (
            <span className="opacity-70 font-medium">
              · {timeAgo(surgeon.lastVerifiedAt)}
              {surgeon.confirmedBy && surgeon.confirmedBy.length > 0 && (
                ` (${surgeon.confirmedBy.join(', ')})`
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status !== CARD_STATUS.VERIFIED && (
            <button onClick={() => setShowConfirmModal(true)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-2.5 py-1 transition-all cursor-pointer">
              Confirm Current
            </button>
          )}
          {status !== CARD_STATUS.DISPUTED && (
            <button onClick={flagDisputed}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg px-2.5 py-1 transition-all cursor-pointer">
              Flag
            </button>
          )}
        </div>
      </div>

      {/* ── Vitals: Glove Badge ── */}
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Glove</p>
        <div className="inline-flex items-center gap-2 bg-medical-50 border border-medical-200 rounded-full px-4 py-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GLOVE_COLORS[surgeon.gloveColor] || '#94a3b8' }} />
          <span className="text-sm font-semibold text-medical-800">{surgeon.gloveModel}</span>
          <span className="text-medical-500 text-sm">·</span>
          <span className="text-sm font-bold text-medical-700">Size {surgeon.gloveSize}</span>
        </div>
      </div>

      {/* ── Suture Pills ── */}
      {surgeon.sutures?.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sutures</p>
          <div className="flex flex-wrap gap-2">
            {surgeon.sutures.map((s, i) => (
              <span
                key={i}
                className="suture-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm"
                style={{ backgroundColor: s.color, color: s.textColor, animationDelay: `${i * 60}ms` }}
              >
                {s.name}
                {s.size && <span className="opacity-75">({s.size})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Librarian Links ── */}
      {vendorLinks.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">📋 Librarian Links</p>
          <div className="flex flex-wrap gap-2">
            {vendorLinks.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-medical-50 text-medical-700 border border-medical-200 hover:bg-medical-100 hover:border-medical-400 transition-all group"
              >
                {v.name}
                <ExternalLink size={11} className="opacity-50 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Expandable Section ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span>{expanded ? 'Less Detail' : 'More Detail'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* ── Ground Truth: Tips ── */}
          <div className="px-5 py-4 bg-slate-900 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors size={12} />
                Tech-to-Tech Tips & Nicknames
              </p>
              {!editingTips && (
                <button
                  onClick={() => { setTipDraft(surgeon.tips || ''); setEditingTips(true); }}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            {editingTips ? (
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    value={tipDraft}
                    onChange={(e) => setTipDraft(e.target.value)}
                    rows={3}
                    placeholder={`e.g. "Likes the Bovie at 30/30. Calls the Debakey pickups."`}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 pr-11 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                  />
                  <MicButton
                    className="absolute right-2 top-2"
                    onTranscript={(text) => setTipDraft(d => (d ? d.trim() + ' ' : '') + text)}
                  />
                </div>
                {/* ── Change Note (optional) ── */}
                <input
                  value={tipNote}
                  onChange={(e) => setTipNote(e.target.value)}
                  placeholder="Why this change? (optional)"
                  className="w-full rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs px-3 py-1.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditingTips(false); setTipNote(''); }} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X size={16} /></button>
                  <button onClick={saveTips} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"><Check size={16} /></button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {surgeon.tips || <span className="italic text-slate-500">No tips yet — tap edit to add.</span>}
              </p>
            )}
          </div>

          {/* ── Nicknames ── */}
          {surgeon.nicknames?.length > 0 && (
            <div className="px-5 py-4 bg-slate-800 border-t border-slate-700">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Instrument Nicknames</p>
              <div className="space-y-1">
                {surgeon.nicknames.map((n, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="text-white font-semibold">"{n.nickname}"</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300">{n.actual}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════ */}
          {/* ── Surgical Team (with Quick-Add)   ── */}
          {/* ══════════════════════════════════════ */}
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} /> Surgical Team
              </p>
              {!showAssistForm && (
                <button onClick={() => setShowAssistForm(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-medical-600 hover:text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                >
                  <Plus size={12} /> Add Assist
                </button>
              )}
            </div>

            {surgeon.assists?.length > 0 && (
              <div className="space-y-2 mb-3">
                {surgeon.assists.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 group">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-medical-600">{a.gloveModel}</p>
                        <p className="text-xs text-slate-400">Size {a.gloveSize}</p>
                      </div>
                      <button onClick={() => removeAssist(i)}
                        className="text-transparent group-hover:text-slate-300 hover:!text-rose-500 transition-colors cursor-pointer p-0.5"
                        aria-label="Remove assist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {surgeon.assists?.length === 0 && !showAssistForm && (
              <p className="text-sm text-slate-300 italic">No assists yet — tap "Add Assist" to get started.</p>
            )}

            {/* ── Quick-Add Assist Form ── */}
            {showAssistForm && (
              <div className="bg-medical-50 border border-medical-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus size={14} className="text-medical-600" />
                  <p className="text-xs font-bold text-medical-700 uppercase tracking-wider">Quick-Add Assist</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <input value={assistDraft.name} onChange={e => setAssistDraft(d => ({ ...d, name: e.target.value }))}
                      placeholder="Assistant name" className={inputClass} autoFocus />
                  </div>
                  <div className="col-span-2">
                    <select value={assistDraft.role} onChange={e => setAssistDraft(d => ({ ...d, role: e.target.value }))} className={inputClass}>
                      {ASSIST_ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <select value={assistDraft.gloveId} onChange={e => setAssistDraft(d => ({ ...d, gloveId: e.target.value }))} className={inputClass}>
                      {GLOVE_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select value={assistDraft.gloveSize} onChange={e => setAssistDraft(d => ({ ...d, gloveSize: e.target.value }))} className={inputClass}>
                      {GLOVE_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {/* ── Change Note (optional) ── */}
                <input
                  value={assistNote}
                  onChange={(e) => setAssistNote(e.target.value)}
                  placeholder="Change note / reason (optional)"
                  className="w-full rounded-lg bg-white border border-medical-200 text-slate-600 text-xs px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-medical-400/40"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => { setShowAssistForm(false); setAssistDraft({ ...EMPTY_ASSIST }); setAssistNote(''); }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">Cancel</button>
                  <button type="button" onClick={saveAssist} disabled={!assistDraft.name.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-medical-600 text-white text-xs font-bold hover:bg-medical-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Check size={13} /> Add to Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════ */}
          {/* ── History / Audit Trail             ── */}
          {/* ══════════════════════════════════════ */}
          {cardHistory.length > 0 && (
            <div className="border-t border-slate-100">
              <button
                onClick={() => setShowHistory(h => !h)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  History ({cardHistory.length})
                </span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHistory && (
                <div className="px-5 pb-4 space-y-1.5">
                  {cardHistory.slice(0, 15).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5 py-1.5">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-medical-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-medium text-slate-600 truncate">{entry.action}</p>
                          <span className="text-[10px] text-slate-300 whitespace-nowrap shrink-0">{timeAgo(entry.timestamp)}</span>
                        </div>
                        {/* Quote block for notes */}
                        {entry.note && (
                          <div className="mt-0.5 border-l-2 border-medical-200 pl-2">
                            <p className="text-[11px] text-slate-400 italic leading-snug">"{entry.note}"</p>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-300">by {entry.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showShare && <ShareCardModal surgeon={surgeon} onClose={() => setShowShare(false)} />}
      {showConfirmModal && (
        <ConfirmNameModal
          title={status === CARD_STATUS.PENDING_COSIGN ? 'Co-Sign Card' : 'Confirm Current'}
          subtitle={status === CARD_STATUS.PENDING_COSIGN
            ? 'A second tech needs to confirm this is still accurate.'
            : 'Enter your name to confirm this card is up to date.'}
          onClose={() => setShowConfirmModal(false)}
          onSubmit={submitConfirmName}
        />
      )}
    </div>
  );
}

export default memo(SurgeonCard);
