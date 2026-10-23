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
