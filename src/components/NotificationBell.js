import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationSettings from './NotificationSettings';
import { TYPE_ICON, relativeTime, followLink } from './notificationUtils';
import './NotificationBell.css';

/**
 * Presentational notification bell + dropdown. State is owned by the
 * useNotifications hook in Navbar and passed in as props, so multiple bells
 * (desktop + mobile) can share one SSE connection.
 */
function NotificationBell({ userId, notifications, unreadCount, prefs, markAllRead, updatePrefs }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
    if (!next) setShowSettings(false);
  };

  const go = (link) => {
    setOpen(false);
    followLink(link, navigate);
  };

  return (
    <div className="notif-bell-root" ref={rootRef}>
      <button className="notif-bell-btn" onClick={toggleOpen} aria-label="Notifications">
        <span className="notif-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            <button
              className="notif-gear"
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Notification settings"
              title="Settings"
            >
              ⚙️
            </button>
          </div>

          {showSettings ? (
            <NotificationSettings userId={userId} prefs={prefs} updatePrefs={updatePrefs} />
          ) : (
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">You're all caught up 🎉</div>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} className="notif-item" onClick={() => go(n.link)}>
                    <span className="notif-item-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                    <span className="notif-item-body">
                      <span className="notif-item-title">{n.title}</span>
                      {n.body && <span className="notif-item-text">{n.body}</span>}
                      <span className="notif-item-time">{relativeTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
