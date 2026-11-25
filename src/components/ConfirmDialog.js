import React from 'react';
import Dialog from './Dialog';

/** Replaces window.confirm(): styled, accessible, and the destructive choice says so. */
export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel,
}) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      actions={(
        <>
          <button type="button" className="lx-btn lx-btn--secondary" onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            data-autofocus
            className={`lx-btn ${danger ? 'lx-btn--danger' : 'lx-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      )}
    >
      {typeof message === 'string' ? <p>{message}</p> : message}
    </Dialog>
  );
}

/**
 * window.confirm() as a promise, rendered with ConfirmDialog:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title: 'Delete?', message: '…', danger: true }))) return;
 *   …
 *   return <>{page}{confirmDialog}</>;
 */
export function useConfirm() {
  const [pending, setPending] = React.useState(null);

  const confirm = React.useCallback((options) => new Promise((resolve) => {
    setPending({ ...options, resolve });
  }), []);

  const settle = (answer) => {
    if (pending) pending.resolve(answer);
    setPending(null);
  };

  const confirmDialog = pending ? (
    <ConfirmDialog
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      danger={pending.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
