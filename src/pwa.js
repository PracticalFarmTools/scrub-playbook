import { registerSW } from 'virtual:pwa-register';

let updateSW = null;
let ready = false;
const listeners = new Set();

/** A new version waits until the app says it is safe. It never reloads during a case. */
export function startPwa() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      listeners.forEach(listener => listener(true));
    },
  });
}

export function onUpdateReady(listener) {
  listeners.add(listener);
  if (ready) listener(true);
  return () => listeners.delete(listener);
}

export function applyUpdate() {
  if (ready) updateSW?.(true);
}
