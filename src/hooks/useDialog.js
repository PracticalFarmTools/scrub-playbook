import { useEffect, useRef } from 'react';

const open = [];
let bodyOverflow = '';
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Shared behavior for every overlay: focus moves in, Tab stays inside, Escape closes only the
 * top one, the page behind does not scroll, and focus goes back where it was. Without
 * `onClose`, Escape does nothing, for a notice that has to be answered.
 */
export function useDialog({ onClose, initialFocus } = {}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const entry = { node };
    open.push(entry);
    if (open.length === 1) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const previous = document.activeElement;
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    const target = initialFocus?.current || node.querySelector('[autofocus]') || node.querySelector(FOCUSABLE) || node;
    target.focus?.({ preventScroll: true });

    const onKey = (event) => {
      if (open.at(-1) !== entry) return;
      if (event.key === 'Escape') {
        if (!closeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      const inside = node.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first || document.activeElement === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = open.indexOf(entry);
      if (index >= 0) open.splice(index, 1);
      if (!open.length) document.body.style.overflow = bodyOverflow;
      if (previous && previous !== document.body && document.contains(previous)) previous.focus?.({ preventScroll: true });
    };
  }, [initialFocus]);

  return ref;
}
