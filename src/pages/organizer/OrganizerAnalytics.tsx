import React, { useMemo, useState } from 'react';
import { listOrganizerEvents } from '../../api/events';
import { getAnalytics } from '../../api/organizer';
import { ColumnChart, HBarList } from '../../components/organizer/Charts';
import { ErrorState, Field, Loading, Tabs } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { formatKZT, pct } from '../../utils/format';

const Kpi: React.FC<{ label: string; value: string; sub?: string; accent?: boolean; danger?: boolean }> = ({ label, value, sub, accent, danger }) => (
  <div className={`kpi${accent ? ' kpi--accent' : ''}${danger ? ' kpi--danger' : ''}`}>
    <div className="kpi__label">{label}</div>
    <div className="kpi__value">{value}</div>
    {sub && <div className="kpi__sub">{sub}</div>}
  </div>
);

function weekKey(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Module 2.6 — Organizer analytics dashboard */
export const OrganizerAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { data: events } = useAsync(() => listOrganizerEvents(), []);
  const [eventId, setEventId] = useState<string>('all');
  const [ticketTypeId, setTicketTypeId] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metric, setMetric] = useState<'tickets' | 'revenue'>('tickets');
  const { data, loading, error, refetch } = useAsync(() => getAnalytics({ eventId, ticketTypeId, from, to }), [eventId, ticketTypeId, from, to]);

  const tiers = useMemo(() => (events ?? []).filter((e) => eventId === 'all' || e.id === eventId).flatMap((e) => e.tickets.map((tk) => ({ ...tk, eventTitle: e.title }))), [events, eventId]);

  const series = useMemo(() => {
    const days = data?.salesByDay ?? [];
    const weekly = days.length > 40;
    const m = new Map<string, number>();
    days.forEach((d) => {
      const k = weekly ? weekKey(d.day) : d.day;
      m.set(k, (m.get(k) ?? 0) + (metric === 'tickets' ? d.tickets : d.revenue));
    });
    return { weekly, points: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value })) };
  }, [data, metric]);

  return (
    <div>
      <div className="toolbar" role="search" aria-label={t('analytics.filters')} style={{ marginBottom: 18 }}>
        <Field label={t('analytics.event')} className="grow">
          <select className="bf-input" value={eventId} onChange={(e) => { setEventId(e.target.value); setTicketTypeId('all'); }}>
            <option value="all">{t('analytics.allEvents')}</option>
            {(events ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </Field>
        <Field label={t('tickets.tier')}>
          <select className="bf-input" value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {tiers.map((tk) => (
              <option key={tk.id} value={tk.id}>{eventId === 'all' ? `${tk.name} · ${tk.eventTitle}` : tk.name}</option>
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
      ) : !data ? (
        <Loading />
      ) : (
        <div className="stack" aria-busy={loading}>
          <section aria-label={t('analytics.kpis')} className="kpi-grid">
            <Kpi label={t('analytics.capacity')} value={String(data.totalCapacity)} />
            <Kpi label={t('analytics.sold')} value={String(data.sold)} />
            <Kpi label={t('analytics.remaining')} value={String(data.remaining)} />
            <Kpi label={t('analytics.pctSold')} value={pct(data.pctSold)} />
            <Kpi label={t('analytics.checkedIn')} value={String(data.checkedIn)} />
            <Kpi label={t('analytics.absent')} value={String(data.absent)} sub={t('analytics.absentSub')} />
            <Kpi label={t('analytics.checkInPct')} value={pct(data.checkInPct)} sub={t('analytics.absentSub')} />
            <Kpi label={t('analytics.gross')} value={formatKZT(data.gross)} />
            <Kpi label={t('analytics.discounts')} value={formatKZT(-data.discounts)} danger />
            <Kpi label={t('analytics.refunds')} value={formatKZT(-data.refunds)} danger />
            <Kpi label={t('analytics.net')} value={formatKZT(data.net)} accent />
          </section>

          <section className="chart-card" aria-labelledby="ch-sales">
            <div className="spread" style={{ marginBottom: 10 }}>
              <div>
                <h3 id="ch-sales">{t('analytics.salesOverTime')}</h3>
                <p className="mono-sm muted">{series.weekly ? t('analytics.weekly') : t('analytics.daily')}</p>
              </div>
              <Tabs
                label={t('analytics.metric')}
                idPrefix="metric"
                value={metric}
                onChange={setMetric}
                items={[
                  { id: 'tickets', label: t('analytics.tickets') },
                  { id: 'revenue', label: t('analytics.revenue') },
                ]}
              />
            </div>
            {series.points.length ? (
              <ColumnChart
                data={series.points}
                title={metric === 'tickets' ? t('analytics.tickets') : t('analytics.revenue')}
                format={metric === 'tickets' ? (n) => String(Math.round(n)) : (n) => (n >= 1000 ? `${Math.round(n / 1000)}k ₸` : formatKZT(n))}
              />
            ) : (
              <p className="mono-sm muted">{t('analytics.noData')}</p>
            )}
          </section>

          <div className="grid-2">
            <section className="chart-card" aria-labelledby="ch-type">
              <h3 id="ch-type" style={{ marginBottom: 10 }}>{t('analytics.byType')}</h3>
              <HBarList data={data.byTicketType} />
            </section>
            <section className="chart-card" aria-labelledby="ch-camp">
              <h3 id="ch-camp">{t('analytics.campaigns')}</h3>
              {data.campaigns.length ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('analytics.promo')}</th>
                        <th scope="col" className="num">{t('analytics.redemptions')}</th>
                        <th scope="col" className="num">{t('analytics.tickets')}</th>
                        <th scope="col" className="num">{t('analytics.net')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaigns.map((c) => (
                        <tr key={c.code}>
                          <td>
                            <strong className="mono">{c.code}</strong>
                            {c.campaign && <div className="mono-sm muted">{c.campaign}</div>}
                          </td>
                          <td className="num">{c.redemptions}</td>
                          <td className="num">{c.tickets}</td>
                          <td className="num">{formatKZT(c.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mono-sm muted" style={{ marginTop: 10 }}>{t('analytics.noCampaigns')}</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
