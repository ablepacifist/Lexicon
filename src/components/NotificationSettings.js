import React from 'react';
import { subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications';

const CATEGORIES = [
  { key: 'enableMessage', label: 'Text messages', icon: '💬' },
  { key: 'enableVoiceJoin', label: 'Voice joins', icon: '🔊' },
  { key: 'enableMention', label: 'Mentions of me', icon: '@' },
  { key: 'enableMusic', label: 'Now playing (music)', icon: '🎵' },
];

/**
 * Per-user notification preference toggles. Category toggles just persist via
 * updatePrefs; the "Browser/OS push" toggle also (un)registers the Web Push
 * subscription using the existing pushNotifications helper.
 */
function NotificationSettings({ userId, prefs, updatePrefs }) {
  const toggle = (key) => updatePrefs({ ...prefs, [key]: !prefs[key] });

  const togglePush = async () => {
    const next = !prefs.enablePush;
    updatePrefs({ ...prefs, enablePush: next });
    try {
      if (next) {
        await subscribeToPush(userId);
      } else {
        await unsubscribeFromPush();
      }
    } catch (_) {
      // Permission denied or unsupported — the pref still reflects intent.
    }
  };

  return (
    <div className="notif-settings">
      <div className="notif-settings-title">Notify me about</div>
      {CATEGORIES.map((c) => (
        <label key={c.key} className="notif-setting-row">
          <span className="notif-setting-label"><span className="notif-setting-icon">{c.icon}</span>{c.label}</span>
          <button
            type="button"
            className={`notif-switch ${prefs[c.key] ? 'on' : ''}`}
            onClick={() => toggle(c.key)}
            aria-pressed={!!prefs[c.key]}
          >
            <span className="notif-switch-knob" />
          </button>
        </label>
      ))}

      <div className="notif-settings-divider" />

      <label className="notif-setting-row">
        <span className="notif-setting-label"><span className="notif-setting-icon">🔔</span>Browser / OS push</span>
        <button
          type="button"
          className={`notif-switch ${prefs.enablePush ? 'on' : ''}`}
          onClick={togglePush}
          aria-pressed={!!prefs.enablePush}
        >
          <span className="notif-switch-knob" />
        </button>
      </label>
      <div className="notif-settings-hint">Push lets you get notified even when this tab is closed.</div>
    </div>
  );
}

export default NotificationSettings;
