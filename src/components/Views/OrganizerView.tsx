import React from 'react';
import type { EventFormData, SupportTicket } from '../../types';
import { useTranslation } from '../../i18n';
import { navigate } from '../../router';
import { OrganizerAnalytics } from '../../pages/organizer/OrganizerAnalytics';
import { formatDate, formatKZT } from '../../utils/format';
import { Button, EmptyState, Stamp, StatusStamp, TabPanel, Tabs } from '../ui';

interface OrganizerViewProps {
  events: EventFormData[];
  supportTickets: SupportTicket[];
  onOpenCreateWizard: () => void;
  onOpenPaidActivation: () => void;
  onResolveTicket: (ticketId: string) => void;
  onResendEmail: (ticketId: string) => void;
  onTriggerRefund: (ticketId: string) => void;
  // ---- Additions ----
  onOpenPlatformSupport?: () => void;
  tab?: 'events' | 'analytics' | 'support';
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  events,
  supportTickets,
  onOpenCreateWizard,
  onOpenPaidActivation,
  onResolveTicket,
  onResendEmail,
  onTriggerRefund,
  onOpenPlatformSupport,
  tab = 'events',
}) => {
  const { t, lang } = useTranslation();
  const openSupport = supportTickets.filter((s) => s.status === 'Open').length;

  return (
    <div className="role-view active-view">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">{t('role.Organizer')}</span>
          <h1 style={{ fontSize: 34 }}>{t('org.dashboard')}</h1>
        </div>
        <div className="row">
          {onOpenPlatformSupport && (
            <Button variant="secondary" onClick={onOpenPlatformSupport}>
              {t('psupport.button')}
            </Button>
          )}
          <Button onClick={onOpenCreateWizard}>+ {t('org.create')}</Button>
        </div>
      </div>

      <Tabs
        label={t('org.sections')}
        idPrefix="org"
        value={tab}
        onChange={(id) => navigate(id === 'events' ? '/organizer' : `/organizer/${id}`)}
        items={[
          { id: 'events', label: t('org.tabEvents'), count: events.length },
          { id: 'analytics', label: t('org.tabAnalytics') },
          { id: 'support', label: t('org.tabSupport'), count: openSupport },
        ]}
      />

      <TabPanel id={tab} idPrefix="org">
        {tab === 'analytics' && <OrganizerAnalytics />}

        {tab === 'events' && (
          <div className="dashboard-panel">
            <h3>{t('org.eventsTitle')}</h3>
            {events.length === 0 ? (
              <EmptyState title={t('org.noEvents')} />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('org.colEvent')}</th>
                      <th scope="col">{t('org.colType')}</th>
                      <th scope="col">{t('org.colStatus')}</th>
                      <th scope="col" className="num">{t('org.colAttendees')}</th>
                      <th scope="col">{t('org.colVenue')}</th>
                      <th scope="col">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => {
                      const isPaid = evt.tickets.some((tk) => tk.type === 'Paid');
                      const from = Math.min(...evt.tickets.filter((x) => x.price > 0).map((x) => x.price));
                      return (
                        <tr key={evt.id}>
                          <td>
                            <strong>{evt.title}</strong>
                            <div className="mono-sm muted">{formatDate(evt.eventDate, lang)}</div>
                          </td>
                          <td>
                            {isPaid ? (
                              <span className="mono-sm">{t('common.paid')} · {t('catalog.from')} {formatKZT(from)}</span>
                            ) : (
                              <Stamp tone="free" straight>{t('stamp.free')}</Stamp>
                            )}
                          </td>
                          <td><StatusStamp status={evt.status ?? 'Published'} /></td>
                          <td className="num">{evt.attendeesCount || 0} / {evt.maxCapacity}</td>
                          <td>{evt.venue}</td>
                          <td>
                            <div className="actions">
                              <button type="button" className="sm-btn primary" onClick={() => navigate(`/organizer/events/${evt.id}`)}>
                                {t('org.manage')}
                              </button>
                              {isPaid && (
                                <button type="button" className="sm-btn success" onClick={onOpenPaidActivation}>
                                  {t('org.paidActivation')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Task F8.2: Organizer / Admin Support Back-Office */}
        {tab === 'support' && (
          <div className="dashboard-panel">
            <h3>{t('org.supportTitle')}</h3>
            {supportTickets.length === 0 ? (
              <EmptyState title={t('org.noSupport')} />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('org.colRef')}</th>
                      <th scope="col">{t('attendees.attendee')}</th>
                      <th scope="col">{t('psupport.subject')}</th>
                      <th scope="col">{t('org.colIssue')}</th>
                      <th scope="col">{t('org.colStatus')}</th>
                      <th scope="col">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.map((st) => (
                      <tr key={st.id}>
                        <td className="mono">{st.id}</td>
                        <td>
                          {st.attendeeName}
                          <div className="mono-sm muted">{st.attendeeEmail}</div>
                        </td>
                        <td>{st.subject}</td>
                        <td className="mono-sm">{st.issueType}</td>
                        <td>
                          <Stamp tone={st.status === 'Resolved' ? 'success' : 'hold'}>{t(`psupport.status.${st.status}`)}</Stamp>
                        </td>
                        <td>
                          <div className="actions">
                            <button type="button" className="sm-btn" onClick={() => onResendEmail(st.id)}>
                              {t('org.resend')}
                            </button>
                            <button type="button" className="sm-btn danger" onClick={() => onTriggerRefund(st.id)}>
                              {t('org.manualRefund')}
                            </button>
                            {st.status === 'Open' && (
                              <button type="button" className="sm-btn success" onClick={() => onResolveTicket(st.id)}>
                                {t('org.markResolved')}
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
          </div>
        )}
      </TabPanel>
    </div>
  );
};
