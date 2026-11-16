import React, { useState } from 'react';
import {
  adminListEvents,
  adminListOrders,
  adminListPayments,
  adminListReports,
  adminListUsers,
  adminResolveReport,
  adminSetUserStatus,
  adminSuspendEvent,
} from '../../api/admin';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { Link } from '../../router';
import type { EventFormData, EventReport, PlatformUser, Role } from '../../types';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatKZT, formatTimestamp } from '../../utils/format';
import { Button, ConfirmModal, EmptyState, ErrorState, Field, Loading, OrderStamp, Stamp, StatusStamp, TabPanel, Tabs, useToast } from '../ui';

type DirTab = 'users' | 'events' | 'orders' | 'payments' | 'reports';

const Toolbar: React.FC<{ q: string; setQ: (s: string) => void; children?: React.ReactNode; onExport?: () => void }> = ({ q, setQ, children, onExport }) => {
  const { t } = useTranslation();
  return (
    <div className="toolbar">
      <Field label={t('admin.search')} className="grow">
        <input type="search" className="bf-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchPh')} />
      </Field>
      {children}
      {onExport && (
        <Button variant="secondary" onClick={onExport}>
          ⤓ {t('admin.exportCsv')}
        </Button>
      )}
    </div>
  );
};

function Wrap<T>({ state, empty, children }: { state: { data?: T[]; loading: boolean; error?: Error; refetch: () => void }; empty: string; children: (rows: T[]) => React.ReactNode }) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.refetch} />;
  if (state.loading && !state.data) return <Loading />;
  if (!state.data?.length) return <EmptyState title={empty} />;
  return <>{children(state.data)}</>;
}

const UsersTable: React.FC = () => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [status, setStatus] = useState('all');
  const s = useAsync(() => adminListUsers(q, role, status), [q, role, status]);
  const [target, setTarget] = useState<PlatformUser | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async () => {
    if (!target) return;
    setBusy(true);
    const next = target.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await adminSetUserStatus(target.id, next);
      toast(t(next === 'Suspended' ? 'admin.userSuspended' : 'admin.userRestored', { email: target.email }));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Toolbar q={q} setQ={setQ} onExport={() => s.data && downloadCsv('users.csv', s.data as unknown as Record<string, unknown>[])}>
        <Field label={t('admin.role')}>
          <select className="bf-input" value={role} onChange={(e) => setRole(e.target.value as Role | 'all')}>
            <option value="all">{t('common.all')}</option>
            {(['Attendee', 'Organizer', 'Event Admin', 'Platform Admin'] as Role[]).map((r) => (
              <option key={r} value={r}>{t(`role.${r}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('attendees.status')}>
          <select className="bf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            <option value="Active">{t('admin.active')}</option>
            <option value="Suspended">{t('admin.suspended')}</option>
          </select>
        </Field>
      </Toolbar>
      <Wrap state={s} empty={t('admin.noResults')}>
        {(rows) => (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.user')}</th>
                  <th scope="col">{t('admin.role')}</th>
                  <th scope="col">{t('admin.joined')}</th>
                  <th scope="col">{t('attendees.status')}</th>
                  <th scope="col">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong><div className="mono-sm muted">{u.email}</div></td>
                    <td className="mono-sm">{t(`role.${u.role}`)}</td>
                    <td className="mono-sm">{formatDate(u.createdAt, lang)}</td>
                    <td><Stamp tone={u.status === 'Active' ? 'success' : 'danger'}>{u.status === 'Active' ? t('admin.active') : t('admin.suspended')}</Stamp></td>
                    <td>
                      {u.role !== 'Platform Admin' && (
                        <button type="button" className={`sm-btn${u.status === 'Active' ? ' danger-outline' : ''}`} onClick={() => setTarget(u)}>
                          {u.status === 'Active' ? t('admin.suspend') : t('admin.unsuspend')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Wrap>
      {target && (
        <ConfirmModal
          title={target.status === 'Active' ? t('admin.suspendUserTitle') : t('admin.unsuspendUserTitle')}
          body={target.status === 'Active' ? t('admin.suspendUserBody', { email: target.email }) : t('admin.unsuspendUserBody', { email: target.email })}
          confirmLabel={target.status === 'Active' ? t('admin.suspend') : t('admin.unsuspend')}
          tone={target.status === 'Active' ? 'danger' : 'success'}
          busy={busy}
          onConfirm={act}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
};

const EventsTable: React.FC<{ reportedOnly?: boolean }> = ({ reportedOnly }) => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const s = useAsync(() => adminListEvents(q, status, reportedOnly), [q, status, reportedOnly]);
  const [target, setTarget] = useState<EventFormData | null>(null);
  const [busy, setBusy] = useState(false);
  const suspend = target?.status !== 'Suspended';
  const act = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await adminSuspendEvent(target.id!, suspend);
      toast(t(suspend ? 'admin.eventSuspended' : 'admin.eventRestored', { title: target.title }));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Toolbar q={q} setQ={setQ} onExport={() => s.data && downloadCsv('events.csv', s.data.map(({ tickets, ...e }) => ({ ...e, tiers: tickets.length })) as Record<string, unknown>[])}>
        <Field label={t('attendees.status')}>
          <select className="bf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {['Published', 'Unpublished', 'Suspended', 'Cancelled', 'Completed'].map((x) => (
              <option key={x} value={x}>{t(`eventStatus.${x}`)}</option>
            ))}
          </select>
        </Field>
      </Toolbar>
      <Wrap state={s} empty={t('admin.noResults')}>
        {(rows) => (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('org.colEvent')}</th>
                  <th scope="col">{t('landing.organizer')}</th>
                  <th scope="col">{t('landing.when')}</th>
                  <th scope="col">{t('attendees.status')}</th>
                  <th scope="col">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.title}</strong>
                      <div className="mono-sm muted">{e.id} · {e.city}</div>
                      {e.reported && <Stamp tone="danger" straight>{t('admin.reported')}</Stamp>}
                    </td>
                    <td className="mono-sm">{e.organizerName}</td>
                    <td className="mono-sm">{formatDate(e.eventDate, lang)}</td>
                    <td><StatusStamp status={e.status ?? 'Published'} /></td>
                    <td>
                      <div className="actions">
                        <Link className="sm-btn" to={`/events/${e.slug ?? e.id}`}>{t('admin.view')}</Link>
                        {e.status !== 'Cancelled' && e.status !== 'Completed' && (
                          <button type="button" className={`sm-btn${e.status === 'Suspended' ? '' : ' danger-outline'}`} onClick={() => setTarget(e)}>
                            {e.status === 'Suspended' ? t('admin.reinstate') : t('admin.suspendEvent')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Wrap>
      {target && (
        <ConfirmModal
          title={suspend ? t('admin.suspendEventTitle') : t('admin.reinstateTitle')}
          body={suspend ? t('admin.suspendEventBody', { title: target.title }) : t('admin.reinstateBody', { title: target.title })}
          confirmLabel={suspend ? t('admin.suspendEvent') : t('admin.reinstate')}
          tone={suspend ? 'danger' : 'success'}
          busy={busy}
          onConfirm={act}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
};

const ReportsQueue: React.FC = () => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const s = useAsync(() => adminListReports(), []);
  const [target, setTarget] = useState<{ r: EventReport; decision: 'Dismissed' | 'Actioned' } | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await adminResolveReport(target.r.id, target.decision);
      toast(t(target.decision === 'Actioned' ? 'admin.reportActioned' : 'admin.reportDismissed'));
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h3 style={{ margin: '4px 0 6px' }}>{t('admin.reportsTitle')}</h3>
      <Wrap state={s} empty={t('admin.noReports')}>
        {(rows) => (
          <ul className="admin-list">
            {rows.map((r) => (
              <li key={r.id} className="spread">
                <div>
                  <div className="row">
                    <strong>{r.eventTitle}</strong>
                    <Stamp tone={r.status === 'Open' ? 'hold' : r.status === 'Actioned' ? 'danger' : 'muted'}>{t(`admin.reportStatus.${r.status}`)}</Stamp>
                  </div>
                  <p style={{ margin: '4px 0' }}>“{r.reason}”</p>
                  <div className="mono-sm muted">{r.id} · {r.reporterEmail} · {formatTimestamp(r.createdAt, lang)}</div>
                </div>
                {r.status === 'Open' && (
                  <div className="actions">
                    <Link className="sm-btn" to={`/events/${r.eventId}`}>{t('admin.view')}</Link>
                    <button type="button" className="sm-btn" onClick={() => setTarget({ r, decision: 'Dismissed' })}>{t('admin.dismiss')}</button>
                    <button type="button" className="sm-btn danger" onClick={() => setTarget({ r, decision: 'Actioned' })}>{t('admin.actionSuspend')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Wrap>
      {target && (
        <ConfirmModal
          title={target.decision === 'Actioned' ? t('admin.actionTitle') : t('admin.dismissTitle')}
          body={target.decision === 'Actioned' ? t('admin.actionBody', { title: target.r.eventTitle }) : t('admin.dismissBody')}
          confirmLabel={target.decision === 'Actioned' ? t('admin.actionSuspend') : t('admin.dismiss')}
          tone={target.decision === 'Actioned' ? 'danger' : 'primary'}
          busy={busy}
          onConfirm={act}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
};

const OrdersTable: React.FC = () => {
  const { t, lang } = useTranslation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const s = useAsync(() => adminListOrders(q, status), [q, status]);
  return (
    <>
      <Toolbar q={q} setQ={setQ} onExport={() => s.data && downloadCsv('orders.csv', s.data as unknown as Record<string, unknown>[])}>
        <Field label={t('attendees.status')}>
          <select className="bf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {['Paid', 'Registered', 'Reserved', 'Refunded', 'Cancelled'].map((x) => (
              <option key={x} value={x}>{t(`orderStatus.${x}`)}</option>
            ))}
          </select>
        </Field>
      </Toolbar>
      <Wrap state={s} empty={t('admin.noResults')}>
        {(rows) => (
          <div className="table-responsive" style={{ maxHeight: 560, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('attendees.order')}</th>
                  <th scope="col">{t('org.colEvent')}</th>
                  <th scope="col">{t('attendees.attendee')}</th>
                  <th scope="col" className="num">{t('attendees.amount')}</th>
                  <th scope="col">{t('attendees.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}<div className="muted">{formatTimestamp(o.createdAt, lang)}</div></td>
                    <td>{o.eventTitle}<div className="mono-sm muted">{o.ticketTypeName} × {o.quantity}</div></td>
                    <td>{o.attendeeName}<div className="mono-sm muted">{o.attendeeEmail}</div></td>
                    <td className="num">{o.unitPrice ? formatKZT(o.total) : '—'}</td>
                    <td><OrderStamp status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 200 && <caption>{t('admin.showingFirst', { n: 200, total: rows.length })}</caption>}
            </table>
          </div>
        )}
      </Wrap>
    </>
  );
};

export const PaymentsTable: React.FC<{ fixedStatus?: string; title?: string }> = ({ fixedStatus, title }) => {
  const { t, lang } = useTranslation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(fixedStatus ?? 'all');
  const s = useAsync(() => adminListPayments(q, status), [q, status]);
  return (
    <>
      {title && <h3 style={{ margin: '4px 0 6px' }}>{title}</h3>}
      <Toolbar q={q} setQ={setQ} onExport={() => s.data && downloadCsv(`payments${fixedStatus ? `-${fixedStatus.toLowerCase()}` : ''}.csv`, s.data as unknown as Record<string, unknown>[])}>
        {!fixedStatus && (
          <Field label={t('attendees.status')}>
            <select className="bf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t('common.all')}</option>
              {['Succeeded', 'Failed', 'Refunded', 'Disputed'].map((x) => (
                <option key={x} value={x}>{t(`payStatus.${x}`)}</option>
              ))}
            </select>
          </Field>
        )}
      </Toolbar>
      <Wrap state={s} empty={t('admin.noResults')}>
        {(rows) => (
          <div className="table-responsive" style={{ maxHeight: 520, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.payment')}</th>
                  <th scope="col">{t('attendees.order')}</th>
                  <th scope="col">{t('admin.method')}</th>
                  <th scope="col" className="num">{t('attendees.amount')}</th>
                  <th scope="col">{t('attendees.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.id}<div className="muted">{formatTimestamp(p.createdAt, lang)}</div></td>
                    <td className="mono">{p.orderId}</td>
                    <td className="mono-sm">{p.method}{p.failureReason && <div style={{ color: 'var(--bf-danger)' }}>{p.failureReason}</div>}</td>
                    <td className="num">{formatKZT(p.amount)}</td>
                    <td>
                      <Stamp tone={p.status === 'Succeeded' ? 'success' : p.status === 'Refunded' ? 'refund' : p.status === 'Disputed' ? 'hold' : 'danger'}>
                        {t(`payStatus.${p.status}`)}
                      </Stamp>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Wrap>
    </>
  );
};

/** Module 3.1 — Global search & moderation directory */
export const Directory: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DirTab>('users');
  return (
    <div>
      <Tabs
        label={t('admin.directory')}
        idPrefix="dir"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'users', label: t('admin.users') },
          { id: 'events', label: t('admin.events') },
          { id: 'orders', label: t('admin.orders') },
          { id: 'payments', label: t('admin.payments') },
          { id: 'reports', label: t('admin.reports') },
        ]}
      />
      <TabPanel id={tab} idPrefix="dir">
        {tab === 'users' && <UsersTable />}
        {tab === 'events' && <EventsTable />}
        {tab === 'orders' && <OrdersTable />}
        {tab === 'payments' && <PaymentsTable />}
        {tab === 'reports' && (
          <div className="stack">
            <ReportsQueue />
            <h3>{t('admin.reportedEvents')}</h3>
            <EventsTable reportedOnly />
          </div>
        )}
      </TabPanel>
    </div>
  );
};
