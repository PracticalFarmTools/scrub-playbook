import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Zero-typing capture for gloved/sterile hands.
 * Wraps the Web Speech API (available on Chrome/Android + Safari 14.5+).
 * Feature-detects and no-ops gracefully where unsupported (e.g. Firefox).
 */
export function useSpeechToText({ onResult } = {}) {
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const supported = !!SpeechRecognition;

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript) onResult?.(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }, [supported, listening, onResult, SpeechRecognition]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}
