/**
 * InstrumentPhoto — Smart Placeholder with Category-Color Fallback
 *
 * Displays an instrument photo from the Visual Dictionary.
 * If the photo URL is missing or fails to load, shows a CSS-based
 * category-colored icon (e.g., red ✂️ for Cutting, blue 🔒 for Clamping).
 *
 * Never looks broken — always shows something meaningful.
 */
import { useState, memo } from 'react';
import { getInstrumentPhoto } from '../../data/instrumentPhotos';

/**
 * Category color map — matches SORT_GROUPS visual system.
 * sortGroup → { bg gradient, icon, border }
 */
const CATEGORY_STYLES = {
  1: { bg: 'linear-gradient(135deg, #fecdd3, #fda4af)', border: '#f43f5e', icon: '✂️', label: 'Cut' },
  2: { bg: 'linear-gradient(135deg, #fde68a, #fcd34d)', border: '#f59e0b', icon: '🔒', label: 'Clamp' },
  3: { bg: 'linear-gradient(135deg, #bae6fd, #7dd3fc)', border: '#0ea5e9', icon: '🤏', label: 'Grasp' },
  4: { bg: 'linear-gradient(135deg, #bbf7d0, #86efac)', border: '#22c55e', icon: '📐', label: 'Retract' },
  5: { bg: 'linear-gradient(135deg, #ddd6fe, #c4b5fd)', border: '#8b5cf6', icon: '🪡', label: 'Specialty' },
};

function InstrumentPhoto({ instrumentName, sortGroup = 5, size = 32 }) {
  const photoUrl = getInstrumentPhoto(instrumentName);
  const [imgFailed, setImgFailed] = useState(false);
  const cat = CATEGORY_STYLES[sortGroup] || CATEGORY_STYLES[5];

  // Show photo if available and not failed
  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={instrumentName}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className="instrument-photo"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, border: `1.5px solid ${cat.border}` }}
      />
    );
  }

  // Fallback: category-colored CSS icon
  return (
    <div
      className="instrument-placeholder"
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: cat.bg,
        border: `1.5px solid ${cat.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        flexShrink: 0,
      }}
      title={`${instrumentName} — ${cat.label}`}
    >
      {cat.icon}
    </div>
  );
}

export default memo(InstrumentPhoto);
