import { useEffect, useId, useLayoutEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What every modal needs, for the panel `panelRef` points at:
 * - focus moves into it on open (to `[data-autofocus]`, else the first control);
 * - Escape calls `onClose`, and Tab stays inside;
 * - focus goes back to whatever opened it when it closes;
 * - it is named by its first heading when it has no `aria-label(ledby)`.
 *
 * Runs once per opening. `onClose` is read through a ref, because callers pass it inline:
 * depending on it re-ran the effect on every parent render, which threw focus back to the
 * first field on each keystroke in a form dialog.
 */
export default function useModalFocus(panelRef, onClose) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });
  const headingId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    if (!panel) return undefined;

    if (!panel.hasAttribute('aria-label') && !panel.hasAttribute('aria-labelledby')) {
      const heading = panel.querySelector('h1, h2, h3, h4');
      if (heading) {
        if (!heading.id) heading.id = headingId;
        panel.setAttribute('aria-labelledby', heading.id);
      }
    }

    const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
    if (first) first.focus(); else { panel.tabIndex = -1; panel.focus(); }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [panelRef, headingId]);
}
