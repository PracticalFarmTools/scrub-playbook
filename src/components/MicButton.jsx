import { Mic, Square } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { hapticLight } from '../utils/haptics';

/**
 * Drop-in dictation button. Appends recognized speech to the caller's text
 * via `onTranscript`. Renders nothing if the browser lacks Speech Recognition
 * — never blocks the manual-typing fallback.
 */
export default function MicButton({ onTranscript, variant = 'dark', className = '' }) {
  const { supported, listening, start, stop } = useSpeechToText({
    onResult: (text) => onTranscript(text),
  });

  if (!supported) return null;

  const idleClass = variant === 'light'
    ? 'bg-medical-50 text-medical-600 hover:bg-medical-100 border border-medical-200'
    : 'bg-slate-700 text-amber-400 hover:bg-slate-600';

  return (
    <button
      type="button"
      onClick={() => { hapticLight(); listening ? stop() : start(); }}
      title={listening ? 'Stop dictating' : 'Dictate (hands-free)'}
      aria-label={listening ? 'Stop dictating' : 'Dictate hands-free'}
      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${
        listening ? 'bg-rose-500 text-white animate-pulse' : idleClass
      } ${className}`}
    >
      {listening ? <Square size={13} /> : <Mic size={14} />}
    </button>
  );
}
