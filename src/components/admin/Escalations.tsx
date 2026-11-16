import React, { useState } from 'react';
import { adminListDisputes, adminListSupportThreads, adminReplyThread } from '../../api/admin';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { downloadCsv } from '../../utils/csv';
import { formatKZT, formatTimestamp } from '../../utils/format';
import { Button, EmptyState, ErrorState, Field, Loading, Stamp, TabPanel, Tabs, useToast } from '../ui';
import { PaymentsTable } from './Directory';

const Disputes: React.FC = () => {
  const { t, lang } = useTranslation();
  const { data, loading, error, refetch } = useAsync(() => adminListDisputes(), []);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading && !data) return <Loading />;
  return (
    <>
      <div className="spread">
        <h3>{t('admin.disputes')}</h3>
        <Button variant="secondary" size="sm" disabled={!data?.length} onClick={() => data && downloadCsv('disputes.csv', data as unknown as Record<string, unknown>[])}>
          ⤓ {t('admin.exportCsv')}
        </Button>
      </div>
      {!data?.length ? (
        <EmptyState title={t('admin.noDisputes')} />
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('admin.dispute')}</th>
                <th scope="col">{t('admin.payment')}</th>
                <th scope="col">{t('admin.reason')}</th>
                <th scope="col" className="num">{t('attendees.amount')}</th>
                <th scope="col">{t('attendees.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.id}<div className="muted">{formatTimestamp(d.openedAt, lang)}</div></td>
                  <td className="mono">{d.paymentId}</td>
                  <td>{d.reason}</td>
                  <td className="num">{formatKZT(d.amount)}</td>
                  <td><Stamp tone={d.status === 'Open' ? 'hold' : d.status === 'Won' ? 'success' : 'danger'}>{t(`admin.disputeStatus.${d.status}`)}</Stamp></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

/** Escalated organizer→platform support threads, with reply & resolve. */
const SupportCases: React.FC = () => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const { data, loading, error, refetch } = useAsync(() => adminListSupportThreads(), []);
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading && !data) return <Loading />;
  const threads = data ?? [];
  const current = threads.find((x) => x.id === active) ?? threads[0];

  const send = async (resolve: boolean) => {
    if (!current) return;
    setBusy(true);
    try {
      await adminReplyThread(current.id, reply, resolve);
      setReply('');
      toast(resolve ? t('admin.caseResolved') : t('admin.replySent'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="spread">
        <h3>{t('admin.supportCases')}</h3>
        <Button variant="secondary" size="sm" disabled={!threads.length} onClick={() => downloadCsv('support-cases.csv', threads.map(({ messages, ...x }) => ({ ...x, messages: messages.length })))}>
          ⤓ {t('admin.exportCsv')}
        </Button>
      </div>
      {!threads.length ? (
        <EmptyState title={t('admin.noCases')} />
      ) : (
        <div className="grid-2" style={{ gridTemplateColumns: 'minmax(220px, 1fr) 2fr', marginTop: 12 }}>
          <ul className="admin-list" style={{ marginTop: 0 }} aria-label={t('admin.supportCases')}>
            {threads.map((th) => (
              <li key={th.id}>
                <button type="button" className="bf-btn bf-btn--ghost bf-btn--sm" style={{ width: '100%', justifyContent: 'space-between', textAlign: 'left' }} aria-current={current?.id === th.id} onClick={() => setActive(th.id)}>
                  <span>
                    <span className="mono-sm">{th.id} · {t(`psupport.cat.${th.category}`)}</span>
                    <br />
                    {th.subject}
                  </span>
                  <Stamp tone={th.status === 'Resolved' ? 'success' : th.status === 'Escalated' ? 'danger' : 'hold'} straight>{t(`psupport.status.${th.status}`)}</Stamp>
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <section className="thread" aria-label={current.subject}>
              <div className="thread__head">
                <div>
                  <span className="eyebrow" style={{ margin: 0 }}>{current.organizerName} · {current.organizerEmail}</span>
                  <strong>{current.subject}</strong>
                </div>
                <Stamp tone={current.status === 'Resolved' ? 'success' : current.status === 'Escalated' ? 'danger' : 'hold'}>{t(`psupport.status.${current.status}`)}</Stamp>
              </div>
              {current.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.author === 'Platform' ? 'bubble--me' : 'bubble--them'}`}>
                  <span className="bubble__who">{m.author === 'Platform' ? t('chat.you') : t('chat.organizer')} · {formatTimestamp(m.at, lang)}</span>
                  {m.body}
                </div>
              ))}
              {current.status !== 'Resolved' && (
                <form onSubmit={(e) => { e.preventDefault(); send(false); }}>
                  <Field label={t('admin.reply')}>
                    <textarea className="bf-input" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                  </Field>
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={() => send(true)} loading={busy}>{t('admin.resolve')}</Button>
                    <Button type="submit" disabled={!reply.trim()} loading={busy}>{t('admin.send')}</Button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
};

type EscTab = 'failures' | 'disputes' | 'cases';

/** Module 3.2 — monitoring: payment failures, disputes, escalated support */
export const Escalations: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<EscTab>('failures');
  return (
    <div>
      <Tabs
        label={t('admin.escalations')}
        idPrefix="esc"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'failures', label: t('admin.failures') },
          { id: 'disputes', label: t('admin.disputes') },
          { id: 'cases', label: t('admin.supportCases') },
        ]}
      />
      <TabPanel id={tab} idPrefix="esc">
        {tab === 'failures' && <PaymentsTable fixedStatus="Failed" title={t('admin.failures')} />}
        {tab === 'disputes' && <Disputes />}
        {tab === 'cases' && <SupportCases />}
      </TabPanel>
    </div>
  );
};
