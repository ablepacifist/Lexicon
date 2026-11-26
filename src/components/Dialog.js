import React, { useId, useRef } from 'react';
import useModalFocus from '../hooks/useModalFocus';
import '../pages/PageStyles.css';

/**
 * The one styled modal dialog. The site's modals were bare divs: no dialog role, no Escape,
 * and focus wandered behind them. This one is announced as a dialog, closes on Escape or a
 * press on the backdrop, keeps Tab inside itself, and hands focus back to whatever opened
 * it when it closes.
 */
export default function Dialog({ title, onClose, children, actions, size = 'md' }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useModalFocus(panelRef, onClose);

  return (
    <div className="lx-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        className={`lx-dialog lx-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="lx-dialog__title">{title}</h2>
        <div className="lx-dialog__body">{children}</div>
        {actions && <div className="lx-dialog__actions">{actions}</div>}
      </div>
    </div>
  );
}
