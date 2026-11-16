import React, { useState } from 'react';
import { setTicketHidden } from '../../api/events';
import { getInventory } from '../../api/organizer';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { EventFormData } from '../../types';
import { formatKZT } from '../../utils/format';
import { ConfirmModal, ErrorState, Loading, Stamp, useToast } from '../ui';

/** Module 2.2 — Hide/Unhide per tier + live inventory breakdown */
export const InventoryPanel: React.FC<{ event: EventFormData }> = ({ event }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, loading, error, refetch, setData } = useAsync(() => getInventory(event.id!), [event.id]);
  const [pending, setPending] = useState<{ id: string; name: string; hide: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // live: poll every 15s so holds/expirations show up
  React.useEffect(() => {
    const i = setInterval(refetch, 15000);
    return () => clearInterval(i);
  }, [refetch]);

  const confirmToggle = async () => {
    if (!pending) return;
    setBusy(true);
    setData((rows) => rows?.map((r) => (r.ticketTypeId === pending.id ? { ...r, hidden: pending.hide } : r))); // optimistic
    try {
      await setTicketHidden(event.id!, pending.id, pending.hide);
      toast(pending.hide ? t('tickets.hiddenToast', { name: pending.name }) : t('tickets.shownToast', { name: pending.name }));
    } catch (e) {
      toast((e as Error).message, 'error');
      refetch();
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading && !data) return <Loading />;
  const rows = data ?? [];
  const totals = rows.reduce(
    (a, r) => ({ capacity: a.capacity + r.capacity, available: a.available + r.available, reserved: a.reserved + r.reserved, sold: a.sold + r.sold, refunded: a.refunded + r.refunded, checkedIn: a.checkedIn + r.checkedIn }),
    { capacity: 0, available: 0, reserved: 0, sold: 0, refunded: 0, checkedIn: 0 }
  );

  return (
    <div>
      <div className="spread">
        <div>
          <h3>{t('tickets.inventoryTitle')}</h3>
          <p className="mono-sm muted">{t('tickets.inventoryDesc')}</p>
        </div>
        <span className="mono-sm" aria-live="polite">
          {loading ? t('common.refreshing') : t('tickets.live')}
        </span>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <caption>{t('tickets.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('tickets.tier')}</th>
              <th scope="col">{t('tickets.visibility')}</th>
              <th scope="col" className="num">{t('tickets.capacity')}</th>
              <th scope="col" className="num">{t('tickets.available')}</th>
              <th scope="col" className="num">{t('tickets.reserved')}</th>
              <th scope="col" className="num">{t('tickets.sold')}</th>
              <th scope="col" className="num">{t('tickets.refunded')}</th>
              <th scope="col" className="num">{t('tickets.checkedIn')}</th>
              <th scope="col" style={{ minWidth: 120 }}>{t('tickets.fill')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tier = event.tickets.find((x) => x.id === r.ticketTypeId);
              const fill = r.capacity ? Math.round(((r.sold + r.reserved) / r.capacity) * 100) : 0;
              return (
                <tr key={r.ticketTypeId}>
                  <th scope="row" style={{ textTransform: 'none', font: '700 14px var(--bf-sans)', background: 'transparent', borderBottom: '1px dashed var(--bf-ink-75)' }}>
                    {r.name}
                    <div className="mono-sm muted">{tier?.price ? formatKZT(tier.price) : t('common.free')}</div>
                  </th>
                  <td>
                    <label className="bf-toggle">
                      <input
                        type="checkbox"
                        checked={!r.hidden}
                        onChange={(e) => setPending({ id: r.ticketTypeId, name: r.name, hide: !e.target.checked })}
                        aria-label={t('tickets.toggleAria', { name: r.name })}
                      />
                      <span className="bf-toggle__track" aria-hidden="true" />
                      {r.hidden ? <Stamp tone="muted" straight>{t('tickets.hiddenStamp')}</Stamp> : t('tickets.visible')}
                    </label>
                  </td>
                  <td className="num">{r.capacity}</td>
                  <td className="num"><strong>{r.available}</strong></td>
                  <td className="num" style={{ color: r.reserved ? 'var(--bf-rust)' : undefined }}>{r.reserved}</td>
                  <td className="num">{r.sold}</td>
                  <td className="num">{r.refunded}</td>
                  <td className="num">{r.checkedIn}</td>
                  <td>
                    <div className="meter" role="img" aria-label={`${fill}%`}>
                      <span style={{ width: `${Math.min(100, fill)}%` }} />
                    </div>
                    <span className="mono-sm">{fill}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" style={{ background: 'transparent' }}>{t('common.total')}</th>
              <td />
              <td className="num">{totals.capacity}</td>
              <td className="num"><strong>{totals.available}</strong></td>
              <td className="num">{totals.reserved}</td>
              <td className="num">{totals.sold}</td>
              <td className="num">{totals.refunded}</td>
              <td className="num">{totals.checkedIn}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {pending && (
        <ConfirmModal
          title={pending.hide ? t('tickets.hideTitle', { name: pending.name }) : t('tickets.unhideTitle', { name: pending.name })}
          body={pending.hide ? t('tickets.hideBody') : t('tickets.unhideBody')}
          confirmLabel={pending.hide ? t('tickets.hide') : t('tickets.unhide')}
          tone="primary"
          busy={busy}
          onConfirm={confirmToggle}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
};
