import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TYPE_ICON, followLink } from './notificationUtils';
import './NotificationBell.css';

/**
 * Single fixed-position toast stack for live notifications. Rendered once
 * (in Navbar) so notifications aren't duplicated across bell instances.
 */
function NotificationToasts({ toasts, dismissToast }) {
  const navigate = useNavigate();
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="notif-toast-stack">
      {toasts.map((t) => (
        <div
          key={t._toastId}
          className="notif-toast"
          onClick={() => { dismissToast(t._toastId); followLink(t.link, navigate); }}
        >
          <span className="notif-toast-icon">{TYPE_ICON[t.type] || '🔔'}</span>
          <span className="notif-toast-body">
            <span className="notif-toast-title">{t.title}</span>
            {t.body && <span className="notif-toast-text">{t.body}</span>}
          </span>
          <button
            className="notif-toast-close"
            onClick={(e) => { e.stopPropagation(); dismissToast(t._toastId); }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationToasts;
