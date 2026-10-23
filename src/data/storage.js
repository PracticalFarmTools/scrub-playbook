/**
 * Asks the browser not to clear this site's storage under pressure.
 * Safari and Chrome may still say no; the backup reminder stays the safety net.
 */
export async function requestPersistentStorage(storage = globalThis.navigator?.storage) {
  if (typeof storage?.persist !== 'function') return 'unsupported';
  try {
    if (typeof storage.persisted === 'function' && await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** localStorage that never throws. A full or blocked store reports false instead of crashing the screen. */
export function safeGet(key, fallback = null) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

export function safeSet(key, value) {
  try {
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key) {
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    /* nothing to free */
  }
}

export function safeJson(key, fallback) {
  const raw = safeGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function isQuotaError(error) {
  return error?.name === 'QuotaExceededError'
    || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error?.code === 22
    || error?.code === 1014;
}

/** iPhone and iPad Safari outside the home screen may clear site data after a week without a visit. */
export function needsHomeScreen({ nav = globalThis.navigator, win = globalThis.window } = {}) {
  const ua = nav?.userAgent || '';
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints || 0) > 1);
  if (!apple) return false;
  const standalone = nav?.standalone === true || win?.matchMedia?.('(display-mode: standalone)')?.matches === true;
  return !standalone;
}
