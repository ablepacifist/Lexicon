import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrls } from '../utils/apiUrls';

const { lexiconApiUrl } = getApiUrls();

const DEFAULT_PREFS = {
  enableMessage: true,
  enableVoiceJoin: true,
  enableMention: true,
  enableMusic: false,
  enablePush: true,
};

/**
 * Manages the notification stream for a logged-in user:
 * - loads history + unread count + preferences
 * - opens the SSE stream for live delivery (bell badge + toasts)
 * - exposes markAllRead / updatePrefs
 *
 * Delivery/preference rules and self-exclusion are enforced server-side; this
 * hook only calls the REST endpoints on NotificationController.
 */
export function useNotifications(user) {
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [toasts, setToasts] = useState([]);
  const esRef = useRef(null);
  const toastTimers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t._toastId !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const pushToast = useCallback((n) => {
    const toastId = `${n.id}-${Date.now()}`;
    const toast = { ...n, _toastId: toastId };
    setToasts((prev) => [toast, ...prev].slice(0, 4));
    toastTimers.current[toastId] = setTimeout(() => dismissToast(toastId), 6000);
  }, [dismissToast]);

  // Load history + unread + prefs, then open the live stream.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadInitial() {
      try {
        const [histRes, unreadRes, prefsRes] = await Promise.all([
          fetch(`${lexiconApiUrl}/api/notifications?userId=${userId}&limit=30`),
          fetch(`${lexiconApiUrl}/api/notifications/unread-count?userId=${userId}`),
          fetch(`${lexiconApiUrl}/api/notifications/prefs?userId=${userId}`),
        ]);
        if (cancelled) return;
        if (histRes.ok) setNotifications(await histRes.json());
        if (unreadRes.ok) setUnreadCount((await unreadRes.json()).count || 0);
        if (prefsRes.ok) setPrefs({ ...DEFAULT_PREFS, ...(await prefsRes.json()) });
      } catch (e) {
        // Backend unreachable — the bell simply stays empty.
      }
    }
    loadInitial();

    const es = new EventSource(`${lexiconApiUrl}/api/notifications/stream?userId=${userId}`);
    esRef.current = es;

    es.addEventListener('init', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof d.unreadCount === 'number') setUnreadCount(d.unreadCount);
      } catch (_) {}
    });

    es.addEventListener('notification', (e) => {
      try {
        const n = JSON.parse(e.data);
        setNotifications((prev) => [n, ...prev].slice(0, 100));
        setUnreadCount((c) => c + 1);
        pushToast(n);
      } catch (_) {}
    });

    return () => {
      cancelled = true;
      es.close();
      esRef.current = null;
      Object.values(toastTimers.current).forEach(clearTimeout);
      toastTimers.current = {};
    };
  }, [userId, pushToast]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setUnreadCount(0);
    try {
      await fetch(`${lexiconApiUrl}/api/notifications/read-all?userId=${userId}`, { method: 'POST' });
    } catch (_) {}
  }, [userId]);

  const updatePrefs = useCallback(async (next) => {
    if (!userId) return;
    setPrefs(next);
    try {
      await fetch(`${lexiconApiUrl}/api/notifications/prefs?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch (_) {}
  }, [userId]);

  return { notifications, unreadCount, prefs, toasts, markAllRead, updatePrefs, dismissToast };
}
