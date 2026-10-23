import { BOOK_KEY } from '../data/schema';
import { readValue } from '../data/store';
import { safeGet } from '../data/storage';

export function downloadText(filename, body) {
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadSavedBook() {
  let value = await readValue(BOOK_KEY);
  if (value === undefined) value = safeGet(BOOK_KEY);
  const body = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
  downloadText(`scrubplaybook-saved-book-${new Date().toISOString().slice(0, 10)}.json`, body);
}
