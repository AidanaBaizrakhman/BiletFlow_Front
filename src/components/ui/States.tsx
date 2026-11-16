import React from 'react';
import { useTranslation } from '../../i18n';
import { Button } from './Button';

export const Loading: React.FC<{ label?: string }> = ({ label }) => {
  const { t } = useTranslation();
  return (
    <p className="bf-loading" role="status" aria-live="polite">
      <span className="bf-loading__dots" aria-hidden="true">
        ···
      </span>{' '}
      {label ?? t('common.loading')}
    </p>
  );
};

export const EmptyState: React.FC<{ title: React.ReactNode; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="empty-events-state">
    <h3>{title}</h3>
    {children && <div>{children}</div>}
  </div>
);

export const ErrorState: React.FC<{ error: Error; onRetry?: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="bf-notice bf-notice--error" role="alert">
      <span className="bf-notice__icon" aria-hidden="true">
        ×
      </span>
      <div className="bf-notice__body">
        <strong className="bf-notice__title">{t('common.error')}</strong>
        <div>{error.message}</div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
};
