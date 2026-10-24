/**
 * Runs `task` while no other tab of this app on the phone holds the same lock.
 * Browsers without the Web Locks API run it directly.
 */
export function withLock(name, task) {
  const locks = globalThis.navigator?.locks;
  if (typeof locks?.request === 'function') return locks.request(name, () => task());
  return Promise.resolve().then(task);
}

export const PUBLISHING_LOCK = 'scrubplaybook-publishing';
