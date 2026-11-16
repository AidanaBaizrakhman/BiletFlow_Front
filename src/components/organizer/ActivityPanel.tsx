import React, { useState } from 'react';
import { listAudit } from '../../api/organizer';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { AuditAction, EventFormData } from '../../types';
import { formatTimestamp } from '../../utils/format';
import { EmptyState, ErrorState, Field, Loading, Stamp, type StampTone } from '../ui';

const ACTIONS: AuditAction[] = [
  'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_PUBLISHED', 'EVENT_UNPUBLISHED', 'EVENT_CANCELLED', 'TICKET_HIDDEN', 'TICKET_UNHIDDEN',
  'ORDER_REFUNDED', 'REGISTRATION_CANCELLED', 'STAFF_ASSIGNED', 'STAFF_REVOKED', 'CHECK_IN', 'PROMO_CREATED',
];

const TONE: Partial<Record<AuditAction, StampTone>> = {
  EVENT_CANCELLED: 'danger', ORDER_REFUNDED: 'refund', REGISTRATION_CANCELLED: 'refund', EVENT_PUBLISHED: 'success', CHECK_IN: 'success', TICKET_HIDDEN: 'muted', STAFF_REVOKED: 'hold',
};

/** Module 2.7 — read-only audit trail (also for Completed & Cancelled events) */
export const ActivityPanel: React.FC<{ event: EventFormData }> = ({ event }) => {
  const { t, lang } = useTranslation();
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, refetch } = useAsync(() => listAudit(event.id!, { action, from, to }), [event.id, action, from, to]);

  return (
    <div>
      <div className="spread">
        <h3>{t('audit.title')}</h3>
        <Stamp tone="draft" straight>{t('audit.readOnly')}</Stamp>
      </div>
      <div className="toolbar" style={{ margin: '12px 0 18px' }}>
        <Field label={t('audit.type')}>
          <select className="bf-input" value={action} onChange={(e) => setAction(e.target.value as AuditAction | 'all')}>
            <option value="all">{t('common.all')}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{t(`audit.action.${a}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('catalog.dateFrom')}>
          <input type="date" className="bf-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('catalog.dateTo')}>
          <input type="date" className="bf-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <EmptyState title={t('audit.empty')} />
      ) : (
        <ol className="timeline" aria-label={t('audit.title')}>
          {data.map((a) => (
            <li key={a.id}>
              <div className="tl-head">
                <time dateTime={a.timestamp}>{formatTimestamp(a.timestamp, lang)}</time>
                <Stamp tone={TONE[a.action] ?? 'draft'} straight>{t(`audit.action.${a.action}`)}</Stamp>
                <span className="tl-entity">{a.entity}</span>
              </div>
              <p>{a.description}</p>
              <p className="mono-sm muted">{t('audit.by', { actor: a.actor })}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
