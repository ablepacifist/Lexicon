import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../pages/PageStyles.css';

/**
 * Replaces alert(): a message that appears, says whether it worked, and leaves on its own.
 * alert() froze the page, could not tell success from failure, and showed raw server text.
 */
export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((text, tone = 'success') => {
    clearTimeout(timer.current);
    setToast({ text, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className={`lx-toast lx-toast--${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onClick={onDismiss}
    >
      {toast.text}
    </div>
  );
}

export default Toast;
