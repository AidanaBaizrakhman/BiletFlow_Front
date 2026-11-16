import React, { useState } from 'react';
import { getOrganizerEvent, setEventStatus, updateEvent } from '../../api/events';
import { CreateEventWizard } from '../../components/Modals/CreateEventWizard';
import { LivePreviewModal } from '../../components/Modals/LivePreviewModal';
import { ActivityPanel } from '../../components/organizer/ActivityPanel';
import { AttendeesPanel } from '../../components/organizer/AttendeesPanel';
import { InventoryPanel } from '../../components/organizer/InventoryPanel';
import { StaffPanel } from '../../components/organizer/StaffPanel';
import { Button, ConfirmModal, ErrorState, Field, Loading, Notice, StatusStamp, TabPanel, Tabs, useToast } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { Link, navigate } from '../../router';
import type { EventFormData } from '../../types';
import { formatDateTime } from '../../utils/format';

type Tab = 'tickets' | 'attendees' | 'staff' | 'activity';
type Lifecycle = 'publish' | 'unpublish' | 'cancel';

/** Module 2 — per-event management: lifecycle, inventory, attendees, staff, audit */
export const EventManage: React.FC<{ eventId: string; tab?: string }> = ({ eventId, tab: tabParam }) => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const { data: event, loading, error, refetch } = useAsync(() => getOrganizerEvent(eventId), [eventId]);
  const tab = (['tickets', 'attendees', 'staff', 'activity'].includes(tabParam ?? '') ? tabParam : 'tickets') as Tab;
  const [editing, setEditing] = useState(false);
  const [previewData, setPreviewData] = useState<EventFormData | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!event || (loading && !event)) return <Loading />;

  const status = event.status ?? 'Published';
  const locked = status === 'Cancelled' || status === 'Completed' || status === 'Suspended';

  const runLifecycle = async () => {
    if (!lifecycle) return;
    setBusy(true);
    setErr(undefined);
    try {
      const next = lifecycle === 'publish' ? 'Published' : lifecycle === 'unpublish' ? 'Unpublished' : 'Cancelled';
      await setEventStatus(event.id!, next, reason || undefined);
      toast(t(`lifecycle.${lifecycle}Done`, { title: event.title }));
      setLifecycle(null);
      setReason('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!previewData) return;
    try {
      await updateEvent(event.id!, previewData);
      toast(t('lifecycle.saved'));
      setPreviewData(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div>
      <nav aria-label={t('landing.breadcrumb')} className="mono-sm" style={{ marginBottom: 12 }}>
        <Link to="/organizer">{t('org.dashboard')}</Link> / <span aria-current="page">{event.title}</span>
      </nav>

      <header className="paper" style={{ marginBottom: 18 }}>
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="row" style={{ marginBottom: 6 }}>
              <StatusStamp status={status} />
              <span className="mono-sm muted">{event.id} · {t(`visibility.${event.visibility}`)}</span>
            </div>
            <h1 style={{ fontSize: 30 }}>{event.title}</h1>
            <p className="mono-sm muted" style={{ marginTop: 6 }}>
              {formatDateTime(event.eventDate, lang, true)} · {event.venue}
            </p>
          </div>
          <div className="row" role="group" aria-label={t('lifecycle.actions')}>
            <Link to={`/events/${event.slug ?? event.id}`} className="sm-btn">{t('lifecycle.viewPublic')} ↗</Link>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={locked}>
              {t('lifecycle.edit')}
            </Button>
            {status === 'Published' ? (
              <Button variant="secondary" size="sm" onClick={() => setLifecycle('unpublish')}>{t('lifecycle.unpublish')}</Button>
            ) : (
              <Button size="sm" onClick={() => setLifecycle('publish')} disabled={locked}>{t('lifecycle.publish')}</Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setLifecycle('cancel')} disabled={locked}>
              {t('lifecycle.cancel')}
            </Button>
          </div>
        </div>
        {status === 'Cancelled' && <Notice tone="error" className="" title={t('lifecycle.cancelledNotice')}>{t('lifecycle.cancelledBody')}</Notice>}
        {status === 'Suspended' && <Notice tone="warning" title={t('lifecycle.suspendedNotice')}>{t('lifecycle.suspendedBody')}</Notice>}
        {status === 'Unpublished' && <Notice tone="info">{t('lifecycle.unpublishedBody')}</Notice>}
      </header>

      <Tabs
        label={t('org.eventTabs')}
        idPrefix="evt"
        value={tab}
        onChange={(id) => navigate(`/organizer/events/${eventId}/${id}`, { replace: true })}
        items={[
          { id: 'tickets', label: t('org.tabTickets') },
          { id: 'attendees', label: t('org.tabAttendees') },
          { id: 'staff', label: t('org.tabStaff') },
          { id: 'activity', label: t('org.tabActivity') },
        ]}
      />
      <TabPanel id={tab} idPrefix="evt">
        {tab === 'tickets' && <InventoryPanel event={event} />}
        {tab === 'attendees' && <AttendeesPanel event={event} />}
        {tab === 'staff' && <StaffPanel event={event} />}
        {tab === 'activity' && <ActivityPanel event={event} />}
      </TabPanel>

      {editing && (
        <CreateEventWizard
          initialData={previewData ?? event}
          onClose={() => setEditing(false)}
          onPreview={(d) => {
            setPreviewData(d);
            setEditing(false);
          }}
        />
      )}
      {previewData && !editing && (
        <LivePreviewModal
          data={previewData}
          publishLabel={t('lifecycle.saveChanges')}
          onClose={() => setPreviewData(null)}
          onBackToEdit={() => setEditing(true)}
          onPublish={saveEdit}
        />
      )}

      {lifecycle && (
        <ConfirmModal
          title={t(`lifecycle.${lifecycle}Title`)}
          body={t(`lifecycle.${lifecycle}Body`, { title: event.title })}
          confirmLabel={t(`lifecycle.${lifecycle}Confirm`)}
          tone={lifecycle === 'publish' ? 'success' : lifecycle === 'cancel' ? 'danger' : 'primary'}
          busy={busy}
          error={err}
          onConfirm={runLifecycle}
          confirmDisabled={lifecycle === 'cancel' && reason.trim().length < 5}
          onClose={() => {
            setLifecycle(null);
            setErr(undefined);
          }}
        >
          {lifecycle === 'cancel' && (
            <Field label={t('lifecycle.reason')} required helper={t('lifecycle.reasonHelper')}>
              <textarea className="bf-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
        </ConfirmModal>
      )}
    </div>
  );
};
