// Shared helpers for notification UI (icons, time formatting, link handling).

export const TYPE_ICON = {
  message: '💬',
  voice_join: '🔊',
  mention: '@',
  music: '🎵',
};

export function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (isNaN(then)) return 'just now';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Navigate to a notification link — external URLs open a new tab. */
export function followLink(link, navigate) {
  if (!link) return;
  if (/^https?:\/\//i.test(link)) {
    window.open(link, '_blank', 'noopener');
  } else {
    navigate(link);
  }
}
