import React, { useEffect, useId, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { Button } from './Button';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: role="dialog", aria-modal, labelled by its title, focus trapped,
 * Escape closes, focus returns to the opener, background scroll locked.
 */
export const Modal: React.FC<{
  title: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** hide visual title (still announced) */
  hideTitle?: boolean;
}> = ({ title, onClose, wide, className = '', footer, children, hideTitle }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (!node) return;
      // only the top-most dialog handles keys
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== node) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-card${wide ? ' wide-modal' : ''} ${className}`.trim()}
      >
        <button type="button" className="close-modal" onClick={onClose} aria-label={t('common.close')}>
          &times;
        </button>
        <h2 id={titleId} className={hideTitle ? 'sr-only' : 'bf-modal__title'}>
          {title}
        </h2>
        <div className="bf-modal__body">{children}</div>
        {footer && <div className="wizard-actions">{footer}</div>}
      </div>
    </div>
  );
};

/** Confirmation dialog used for every destructive / state-changing action. */
export const ConfirmModal: React.FC<{
  title: React.ReactNode;
  body: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary' | 'success';
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}> = ({ title, body, confirmLabel, tone = 'danger', busy, error, onConfirm, onClose, children, confirmDisabled }) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            {t('common.cancel')}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="bf-confirm-body">{body}</div>
      {children}
      {error && (
        <p className="bf-helper bf-helper--error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
};
