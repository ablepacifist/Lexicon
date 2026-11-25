import React, { useRef } from 'react';
import useModalFocus from '../hooks/useModalFocus';

/**
 * Behaviour for the pages' own modals, keeping their look. Each was an overlay div whose
 * click closed it and a panel div that stopped the click: a mouse-only box that screen
 * readers did not announce and Escape did not close. The overlay and panel keep their
 * existing classes or styles; this adds the dialog role, Escape, the focus trap and focus
 * return (see useModalFocus).
 */
export default function ModalFrame({
  onClose, overlayClassName, overlayStyle, className, style, label, children,
}) {
  const panelRef = useRef(null);
  useModalFocus(panelRef, onClose);
  return (
    <div
      className={overlayClassName}
      style={overlayStyle}
      // mousedown, so a drag that starts inside the panel (selecting text) does not close it
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} className={className} style={style} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
