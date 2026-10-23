import { isQuotaError, safeGet, safeRemove } from './storage';

const DB_NAME = 'scrubplaybook';
const DB_VERSION = 1;
const STORE = 'kv';
const CHANNEL = 'scrubplaybook';

let dbPromise = null;

function idb() {
  return globalThis.indexedDB || null;
}

/** Resolves to null when this browser has no usable IndexedDB, so callers fall back to localStorage. */
export function openStore() {
  if (dbPromise) return dbPromise;
  const factory = idb();
  if (!factory) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    let request;
    try {
      request = factory.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

export function resetStoreForTests() {
  dbPromise = null;
}

function run(db, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    const request = work(store);
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || request?.error);
    tx.onabort = () => reject(tx.error || request?.error || new Error('aborted'));
  });
}

/** Reads a stored value, or undefined. Values written before IndexedDB are read from localStorage. */
export async function readValue(key) {
  const db = await openStore();
  if (db) {
    try {
      const value = await run(db, 'readonly', store => store.get(key));
      if (value !== undefined) return value;
    } catch {
      /* fall through to the older copy */
    }
  }
  const raw = safeGet(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Writes a value. Never throws.
 * `{ ok: true, where }` or `{ ok: false, reason: 'full' | 'blocked' }`.
 * After a successful IndexedDB write, the older localStorage copy is removed to free room.
 */
export async function writeValue(key, value) {
  const db = await openStore();
  if (db) {
    try {
      await run(db, 'readwrite', store => store.put(value, key));
      safeRemove(key);
      return { ok: true, where: 'indexeddb' };
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? 'full' : 'blocked' };
    }
  }
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, where: 'local' };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'full' : 'blocked' };
  }
}

export async function storageWhere() {
  return (await openStore()) ? 'indexeddb' : 'local';
}

/** Tells other open tabs that a key changed, and listens for their changes. */
export function openChannel(onChange) {
  const tabId = Math.random().toString(36).slice(2);
  let channel = null;
  if (typeof globalThis.BroadcastChannel === 'function') {
    channel = new globalThis.BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.tabId !== tabId && event.data?.key) onChange(event.data.key);
    };
  }
  const onStorage = (event) => { if (event.key) onChange(event.key); };
  globalThis.addEventListener?.('storage', onStorage);
  return {
    post(key) {
      try { channel?.postMessage({ tabId, key }); } catch { /* the other tab reloads on focus instead */ }
    },
    close() {
      channel?.close();
      globalThis.removeEventListener?.('storage', onStorage);
    },
  };
}
