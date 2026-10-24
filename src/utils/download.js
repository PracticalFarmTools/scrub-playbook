import { BOOK_KEY } from '../data/schema';
import { readValue } from '../data/store';
import { safeGet } from '../data/storage';

/** Safari and Firefox can drop a download whose address is revoked in the same task. */
const REVOKE_AFTER_MS = 10000;

export function downloadText(filename, body) {
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

/** Lowercase letters and digits joined by dashes, for file names and element ids. */
export function slugify(text, fallback = 'place') {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
}

export function dayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Sends a JSON file through the share sheet where the phone supports sharing files, otherwise saves it.
 * Resolves to 'shared', 'saved', or 'cancelled'.
 */
export async function shareFile(filename, data) {
  const body = JSON.stringify(data, null, 2);
  const file = typeof File === 'function' ? new File([body], filename, { type: 'application/json' }) : null;
  if (file && globalThis.navigator?.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadText(filename, body);
  return 'saved';
}

export async function downloadSavedBook() {
  let value = await readValue(BOOK_KEY);
  if (value === undefined) value = safeGet(BOOK_KEY);
  const body = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
  downloadText(`scrubplaybook-saved-book-${dayStamp()}.json`, body);
}
