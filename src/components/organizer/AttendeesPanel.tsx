import React, { useState } from 'react';
import { cancelRegistration, listEventOrders, refundOrder } from '../../api/orders';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { EventFormData, Order, OrderStatus } from '../../types';
import { formatKZT, formatTimestamp } from '../../utils/format';
import { ConfirmModal, EmptyState, ErrorState, Field, Loading, OrderStamp, Stamp, useToast } from '../ui';

const STATUSES: (OrderStatus | 'all')[] = ['all', 'Paid', 'Registered', 'Reserved', 'Refunded', 'Cancelled'];

/** Module 2.3 — attendee & order management */
export const AttendeesPanel: React.FC<{ event: EventFormData }> = ({ event }) => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [checkIn, setCheckIn] = useState<'all' | 'in' | 'out'>('all');
  const { data, loading, error, refetch, setData } = useAsync(
    () => listEventOrders(event.id!, { q, ticketTypeId: tier, status, checkIn }),
    [event.id, q, tier, status, checkIn]
  );
  const [action, setAction] = useState<{ kind: 'cancel' | 'refund'; order: Order } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [page, setPage] = useState(0);
  const PAGE = 25;
  React.useEffect(() => setPage(0), [q, tier, status, checkIn]);

  const run = async () => {
    if (!action) return;
    setBusy(true);
    setErr(undefined);
    const prev = data;
    const next: OrderStatus = action.kind === 'refund' ? 'Refunded' : 'Cancelled';
    setData((rows) => rows?.map((r) => (r.id === action.order.id ? { ...r, status: next } : r))); // optimistic
    try {
      if (action.kind === 'refund') await refundOrder(action.order.id);
      else await cancelRegistration(action.order.id);
      toast(action.kind === 'refund' ? t('attendees.refundedToast', { id: action.order.id }) : t('attendees.cancelledToast', { id: action.order.id }));
      setAction(null);
    } catch (e) {
      setData(prev); // rollback
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      refetch();
    }
  };

  const all = data ?? [];
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const rows = all.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div>
      <h3>{t('attendees.title')}</h3>
      <div className="toolbar" style={{ marginTop: 12 }}>
        <Field label={t('attendees.search')} className="grow">
          <input type="search" className="bf-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('attendees.searchPh')} />
        </Field>
        <Field label={t('tickets.tier')}>
          <select className="bf-input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {event.tickets.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('attendees.status')}>
          <select className="bf-input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'all' ? t('common.all') : t(`orderStatus.${s}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('attendees.checkIn')}>
          <select className="bf-input" value={checkIn} onChange={(e) => setCheckIn(e.target.value as 'all' | 'in' | 'out')}>
            <option value="all">{t('common.all')}</option>
            <option value="in">{t('attendees.checkedIn')}</option>
            <option value="out">{t('attendees.notCheckedIn')}</option>
          </select>
        </Field>
      </div>
      <p className="mono-sm muted" aria-live="polite" style={{ marginTop: 10 }}>
        {loading ? t('common.loading') : t('attendees.count', { count: all.length })}
      </p>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <Loading />
      ) : all.length === 0 ? (
        <EmptyState title={t('attendees.empty')} />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('attendees.attendee')}</th>
                <th scope="col">{t('tickets.tier')}</th>
                <th scope="col">{t('attendees.order')}</th>
                <th scope="col" className="num">{t('attendees.amount')}</th>
                <th scope="col">{t('attendees.status')}</th>
                <th scope="col">{t('attendees.checkIn')}</th>
                <th scope="col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.attendeeName}</strong>
                    <div className="mono-sm muted">{o.attendeeEmail}</div>
                  </td>
                  <td>
                    {o.ticketTypeName} × {o.quantity}
                    {o.seats?.length ? <div className="mono-sm muted">{o.seats.join(', ')}</div> : null}
                  </td>
                  <td className="mono">
                    {o.id}
                    <div className="muted">{formatTimestamp(o.createdAt, lang)}</div>
                    {o.promoCode && <div>{o.promoCode}</div>}
                  </td>
                  <td className="num">{o.unitPrice ? formatKZT(o.total) : '—'}</td>
                  <td><OrderStamp status={o.status} /></td>
                  <td>
                    {o.checkedIn ? <Stamp tone="success" straight>✓ {t('attendees.in')}</Stamp> : <span className="mono-sm muted">{t('attendees.notYet')}</span>}
                  </td>
                  <td>
                    <div className="actions">
                      {o.unitPrice === 0 && (o.status === 'Registered' || o.status === 'Reserved') && (
                        <button type="button" className="sm-btn" onClick={() => setAction({ kind: 'cancel', order: o })}>
                          {t('attendees.cancelReg')}
                        </button>
                      )}
                      {o.unitPrice > 0 && o.status === 'Paid' && (
                        <button type="button" className="sm-btn danger-outline" onClick={() => setAction({ kind: 'refund', order: o })}>
                          {t('attendees.refund')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <nav className="spread" style={{ padding: '10px 12px' }} aria-label={t('common.pagination')}>
              <button type="button" className="sm-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← {t('common.prev')}</button>
              <span className="mono-sm" aria-live="polite">{t('common.pageOf', { page: page + 1, pages })}</span>
              <button type="button" className="sm-btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t('common.next')} →</button>
            </nav>
          )}
        </div>
      )}

      {action && (
        <ConfirmModal
          title={action.kind === 'refund' ? t('attendees.refundTitle') : t('attendees.cancelTitle')}
          body={
            action.kind === 'refund'
              ? t('attendees.refundBody', { name: action.order.attendeeName, amount: formatKZT(action.order.total), id: action.order.id })
              : t('attendees.cancelBody', { name: action.order.attendeeName, id: action.order.id })
          }
          confirmLabel={action.kind === 'refund' ? t('attendees.refundConfirm', { amount: formatKZT(action.order.total) }) : t('attendees.cancelConfirm')}
          busy={busy}
          error={err}
          onConfirm={run}
          onClose={() => {
            setAction(null);
            setErr(undefined);
          }}
        />
      )}
    </div>
  );
};
