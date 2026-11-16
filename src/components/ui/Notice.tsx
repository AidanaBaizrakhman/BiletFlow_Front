import React from 'react';

export type NoticeTone = 'info' | 'promo' | 'warning' | 'error' | 'success';

const ICON: Record<NoticeTone, string> = { info: 'i', promo: '%', warning: '!', error: '×', success: '✓' };

export const Notice: React.FC<{
  tone?: NoticeTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ tone = 'info', title, children, action, className = '' }) => (
  <div className={`bf-notice bf-notice--${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : 'status'}>
    <span className="bf-notice__icon" aria-hidden="true">
      {ICON[tone]}
    </span>
    <div className="bf-notice__body">
      {title && <strong className="bf-notice__title">{title}</strong>}
      {children && <div>{children}</div>}
    </div>
    {action && <div className="bf-notice__action">{action}</div>}
  </div>
);
