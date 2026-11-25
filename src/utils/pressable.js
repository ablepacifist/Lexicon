/**
 * Props that make a clickable card or row usable without a mouse: announced as a button,
 * reachable with Tab, and activated by Enter or Space. Use it where turning the element
 * into a real <button> would fight its layout (cards holding their own buttons).
 *
 *   <div className="video-item" {...pressable(() => playVideo(video))}>
 *
 * Keys pressed on a control inside the card are left to that control.
 */
export default function pressable(onActivate) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  };
}
