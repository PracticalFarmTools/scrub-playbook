/**
 * InstrumentVerifyModal — Inspector Modal
 *
 * Header: Instrument Name + AST Category (1–5)
 * Body:   Large, high-resolution instrument image
 * Footer: Practical Tip for inspection/use
 *
 * Closes via ✕, backdrop click, or Escape key.
 */
import { useEffect, useCallback, memo } from 'react';
import { X, Lightbulb, ShieldCheck, Clock } from 'lucide-react';
import InstrumentPhoto from './InstrumentPhoto';

function formatStamp(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── AST Category metadata ──
const GROUP_META = {
  1: { label: 'Cutting / Dissecting',  color: '#e11d48', bg: 'linear-gradient(135deg, #ffe4e6, #fecdd3)', emoji: '✂️' },
  2: { label: 'Clamping / Occluding',  color: '#d97706', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', emoji: '🔒' },
  3: { label: 'Grasping / Holding',    color: '#0284c7', bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', emoji: '🤏' },
  4: { label: 'Retracting / Exposing', color: '#16a34a', bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', emoji: '📐' },
  5: { label: 'Specialty / Suturing',  color: '#7c3aed', bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', emoji: '🪡' },
};

// ── Practical Tips Dictionary ──
// Category-level defaults, then instrument-specific overrides.
const CATEGORY_TIPS = {
  1: 'Check blade edges for nicks. Test scissors tips for alignment — they should meet evenly with no light gap.',
  2: 'Ensure ratchet is smooth and locks at each click. Jaws should meet flush with no overlap.',
  3: 'Verify serrations / teeth are intact and aligned. Tips should close evenly without crossing.',
  4: 'Inspect for bends or cracks. Blade edges should be smooth and free of burrs.',
  5: 'Confirm all moving parts function correctly. Check for loose screws or fittings.',
};

const INSTRUMENT_TIPS = {
  'mayo scissors':              'Test cutting edge with a suture strand — should cut cleanly in one motion.',
  'metzenbaum scissors':        'Tips must close precisely. Used for delicate tissue — even a small nick dulls them.',
  'iris scissors':              'Micro tips — handle with care. Inspect under magnification if possible.',
  'bandage scissors':           'Blunt lower blade should glide under dressings. Test smooth cutting action.',
  'crile hemostat':             'All three ratchet stops must engage. Jaws should align perfectly.',
  'kelly clamp':                'Ensure ratchet is smooth and jaws are not sprung. Test with tissue.',
  'kocher clamp':               'Teeth at tips must interdigitate cleanly. Check ratchet integrity.',
  'mosquito hemostat':          'Delicate tips — inspect for bending. Ratchet should catch at first click.',
  'towel clip':                 'Points must be sharp and meet precisely. Spring tension should feel uniform.',
  'right-angle clamp':          'Jaw angle must hold shape. Test ratchet at multiple positions.',
  'adson forceps':              'Teeth should mesh without overlap. Spring tension should feel balanced.',
  'debakey forceps':            'Atraumatic serrations must be intact. Tips should close parallel.',
  'tissue forceps':             'Teeth should interdigitate cleanly. Check spring tension.',
  'russian forceps':            'Cup tips must align face-to-face. Polish should be smooth.',
  'allis clamp':                'Teeth at jaw tips must interdigitate. Check ratchet at each click.',
  'babcock clamp':              'Atraumatic jaws — no teeth. Verify smooth rounded edges intact.',
  'army-navy retractor':        'Both ends should be free of burs. Edges smooth for tissue contact.',
  'senn retractor':             'Rake prongs must be sharp and evenly spaced. Flat end smooth.',
  'richardson retractor':       'Blade should be smooth and free of burs. No cracks at the curve.',
  'deaver retractor':           'Check full blade for bends. Smooth edges are critical for deep retraction.',
  'hohmann retractor':          'Tip must be sharp. Check for stress cracks at the bend.',
  'weitlaner retractor':        'Prongs must open symmetrically. Ratchet should hold securely.',
  'balfour retractor':          'Test all blades and the ratchet mechanism. Bladder blade must seat securely.',
  'mayo-hegar needle driver':   'Jaws must grip suture needle firmly without rotation. Check tungsten carbide inserts for wear.',
  'webster needle driver':      'Fine jaws for small needles. TC inserts should show crosshatch pattern.',
  'castroviejo needle driver':  'Lock mechanism must engage cleanly. Micro jaws — check under magnification.',
  'yankauer suction':           'Check tip opening is clear. Test suction with water before case.',
  'frazier suction':            'Verify thumb-hole functions. Check tip is not bent or occluded.',
  'poole suction':              'Inner tube must slide freely inside guard. Test suction flow.',
  'mallet':                     'Head must be firmly attached to handle. Check nylon cap for cracks.',
  'osteotome':                  'Cutting edge must be sharp and chip-free. Handle should be intact.',
};

function getPracticalTip(instrument) {
  // Try instrument-specific tip first
  const key = (instrument.name || '').toLowerCase();
  if (INSTRUMENT_TIPS[key]) return INSTRUMENT_TIPS[key];
  // Fall back to category tip
  return CATEGORY_TIPS[instrument.sortGroup] || CATEGORY_TIPS[5];
}

function InstrumentVerifyModal({ instrument, tray, onClose }) {
  if (!instrument) return null;

  const meta = GROUP_META[instrument.sortGroup] || GROUP_META[5];
  const tip = getPracticalTip(instrument);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div className="verify-modal-backdrop" onClick={onClose}>
      <div className="verify-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>

        {/* ── HEADER: Name + AST Category ── */}
        <div style={{
          background: meta.bg,
          borderBottom: `2px solid ${meta.color}22`,
          padding: '16px 20px 14px',
          borderRadius: '16px 16px 0 0',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer backdrop-blur-sm"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 8px 0',
            lineHeight: 1.2,
            paddingRight: 36,
          }}>
            {instrument.name}
          </h3>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'white',
            color: meta.color,
            border: `1.5px solid ${meta.color}`,
            borderRadius: 9999,
            padding: '3px 12px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            {meta.emoji} {instrument.sortGroup}. {meta.label}
          </span>

          {instrument.specs && (
            <p style={{ fontSize: 12, color: '#475569', marginTop: 8, fontWeight: 500 }}>
              {instrument.specs} · Qty {instrument.qty}
            </p>
          )}
        </div>

        {/* ── BODY: Large instrument image ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 20px',
          background: '#f8fafc',
          minHeight: 180,
        }}>
          <InstrumentPhoto
            instrumentName={instrument.name}
            sortGroup={instrument.sortGroup}
            size={200}
          />
        </div>

        {/* ── FOOTER: Practical Tip ── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#fffbeb',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Lightbulb size={16} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#92400e',
                margin: '0 0 4px 0',
              }}>
                Practical Tip
              </p>
              <p style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: '#78350f',
                margin: 0,
                fontWeight: 500,
              }}>
                {tip}
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER: Verified By Signature ── */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid #e2e8f0',
          background: '#0f172a',
          borderRadius: '0 0 16px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} style={{ color: '#34d399' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Verified For {tray?.hospital || tray?.name || 'This Facility'}
              </span>
            </div>
          </div>
          {tray?.verifiedBy?.name ? (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{tray.verifiedBy.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#34d399',
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                  padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                }}>{tray.verifiedBy.title}</span>
              </div>
              {tray.verifiedBy.timestamp && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                  <Clock size={10} />
                  <span style={{ fontSize: 10, fontWeight: 500 }}>{formatStamp(tray.verifiedBy.timestamp)}</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ marginTop: 4, fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
              Not yet verified — sign via the tray count sheet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(InstrumentVerifyModal);
