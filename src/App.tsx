import React, { useEffect, useState } from 'react';
import type { Role, EventFormData, TicketOrder, SupportTicket } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';

import { OrganizerView } from './components/Views/OrganizerView';
import { EventAdminView } from './components/Views/EventAdminView';
import { PlatformAdminView } from './components/Views/PlatformAdminView';

import { AuthModal } from './components/Modals/AuthModal';
import { CreateEventWizard } from './components/Modals/CreateEventWizard';
import { LivePreviewModal } from './components/Modals/LivePreviewModal';
import { PaidActivationModal } from './components/Modals/PaidActivationModal';
import { CheckoutModal } from './components/Modals/CheckoutModal';
import { OrderConfirmationModal } from './components/Modals/OrderConfirmationModal';
import { PlatformSupportModal } from './components/organizer/PlatformSupportModal';

import { EventCatalog } from './pages/EventCatalog';
import { EventLanding } from './pages/EventLanding';
import { EventManage } from './pages/organizer/EventManage';

import { createEvent, listOrganizerEvents } from './api/events';
import { createOrder } from './api/orders';
import { useAsync } from './hooks/useAsync';
import { I18nProvider, useTranslation } from './i18n';
import { navigate, useRoute } from './router';
import { Button, Notice, ToastProvider } from './components/ui';

import './App.css';

const ROLE_HOME: Record<Role, string> = {
  Attendee: '/events',
  Organizer: '/organizer',
  'Event Admin': '/scanner',
  'Platform Admin': '/admin',
};

function initialRole(): Role {
  try {
    const r = localStorage.getItem('bf-role') as Role | null;
    if (r && r in ROLE_HOME) return r;
  } catch {
    /* ignore */
  }
  return 'Attendee';
}

/** Shown when the current demo role can't access a route (role-based UI routing). */
const RoleGate: React.FC<{ need: Role; current: Role; onSwitch: (r: Role) => void; children: React.ReactNode }> = ({ need, current, onSwitch, children }) => {
  const { t } = useTranslation();
  if (need === current) return <>{children}</>;
  return (
    <Notice tone="warning" title={t('gate.title')} action={<Button size="sm" onClick={() => onSwitch(need)}>{t('gate.switch', { role: t(`role.${need}`) })}</Button>}>
      {t('gate.body', { role: t(`role.${need}`) })}
    </Notice>
  );
};

const AppShell: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const [currentRole, setCurrentRole] = useState<Role>(initialRole);

  // Organizer events now come from the API layer (mock DB until the backend is wired)
  const { data: orgEvents } = useAsync(() => listOrganizerEvents(), []);
  const events: EventFormData[] = orgEvents ?? [];

  // Task F8.2: Support tickets queue state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'SUP-101',
      ticketOrderId: 'TICK-99A1',
      attendeeName: 'Alex Nurmanov',
      attendeeEmail: 'alex@example.com',
      subject: 'Did not receive ticket confirmation email',
      issueType: 'Email Re-send',
      status: 'Open',
      createdAt: '2026-10-14 14:30',
    },
    {
      id: 'SUP-102',
      ticketOrderId: 'TICK-88B2',
      attendeeName: 'Dana Saparova',
      attendeeEmail: 'dana@example.com',
      subject: 'Accidental duplicate purchase refund requested',
      issueType: 'Refund Request',
      status: 'Open',
      createdAt: '2026-10-14 15:10',
    },
  ]);

  // Modal states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isPlatformSupportOpen, setIsPlatformSupportOpen] = useState(false);

  // Checkout & Confirmation States (Task F2 & F3) — kept for programmatic checkout entry points
  const [selectedEventForCheckout, setSelectedEventForCheckout] = useState<EventFormData | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<TicketOrder | null>(null);

  const [previewData, setPreviewData] = useState<EventFormData | null>(null);

  const changeRole = (role: Role) => {
    setCurrentRole(role);
    try {
      localStorage.setItem('bf-role', role);
    } catch {
      /* ignore */
    }
    navigate(ROLE_HOME[role]);
  };

  useEffect(() => {
    document.title = `BiletFlow · ${t('meta.tagline')}`;
  }, [t]);

  const handleOpenPreview = (data: EventFormData) => {
    setPreviewData(data);
    setIsWizardOpen(false);
    setIsPreviewOpen(true);
  };

  const handlePublishEvent = async () => {
    if (previewData) {
      const createdEvent = await createEvent({ ...previewData, attendeesCount: 0 });
      setPreviewData(null);
      setIsPreviewOpen(false);
      alert('Event Published successfully! It is now visible to attendees.');
      navigate(`/organizer/events/${createdEvent.id}`);
    }
  };

  const handlePaymentSuccess = async (ticket: TicketOrder) => {
    // Persist order (updates attendee registration count on the event)
    const evt = events.find((e) => e.id === ticket.eventId) ?? selectedEventForCheckout;
    const tier = evt?.tickets.find((x) => x.name === ticket.ticketName) ?? evt?.tickets[0];
    if (evt?.id && tier) {
      await createOrder({
        eventId: evt.id,
        ticketTypeId: tier.id,
        quantity: ticket.quantity ?? 1,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        attendeePhone: ticket.attendeePhone,
      });
    }
    setSelectedEventForCheckout(null);
    setConfirmedTicket(ticket);
  };

  // Task F8.2: Back-office support handlers
  const handleResolveSupportTicket = (id: string) => {
    setSupportTickets((prev) =>
      prev.map((st) => (st.id === id ? { ...st, status: 'Resolved' } : st))
    );
    alert(`Support Ticket ${id} marked as Resolved.`);
  };

  const handleResendTicketEmail = (id: string) => {
    const ticket = supportTickets.find((st) => st.id === id);
    alert(`Re-sent ticket confirmation email to ${ticket?.attendeeEmail || 'attendee'}.`);
  };

  const handleTriggerManualRefund = (id: string) => {
    setSupportTickets((prev) =>
      prev.map((st) => (st.id === id ? { ...st, status: 'Resolved' } : st))
    );
    alert(`Manual refund triggered and processed for Support Ticket ${id}.`);
  };

  /* ---------------- Routing ---------------- */
  const [s0, s1, s2, s3] = route.segments;
  let page: React.ReactNode;
  if (!s0 || (s0 === 'events' && !s1)) {
    page = <EventCatalog />;
  } else if (s0 === 'events' && s1) {
    page = <EventLanding key={s1} slugOrId={s1} />;
  } else if (s0 === 'organizer') {
    page = (
      <RoleGate need="Organizer" current={currentRole} onSwitch={changeRole}>
        {s1 === 'events' && s2 ? (
          <EventManage key={s2} eventId={s2} tab={s3} />
        ) : (
          <OrganizerView
            events={events}
            supportTickets={supportTickets}
            onOpenCreateWizard={() => setIsWizardOpen(true)}
            onOpenPaidActivation={() => setIsActivationOpen(true)}
            onResolveTicket={handleResolveSupportTicket}
            onResendEmail={handleResendTicketEmail}
            onTriggerRefund={handleTriggerManualRefund}
            onOpenPlatformSupport={() => setIsPlatformSupportOpen(true)}
            tab={s1 === 'analytics' ? 'analytics' : s1 === 'support' ? 'support' : 'events'}
          />
        )}
      </RoleGate>
    );
  } else if (s0 === 'scanner') {
    page = (
      <RoleGate need="Event Admin" current={currentRole} onSwitch={changeRole}>
        <EventAdminView />
      </RoleGate>
    );
  } else if (s0 === 'admin') {
    page = (
      <RoleGate need="Platform Admin" current={currentRole} onSwitch={changeRole}>
        <PlatformAdminView tab={s1} />
      </RoleGate>
    );
  } else {
    page = (
      <Notice tone="error" title="404" action={<Button size="sm" onClick={() => navigate('/')}>{t('nav.allEvents')}</Button>}>
        {t('common.notFound')}
      </Notice>
    );
  }

  return (
    <div className="app-root">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t('common.skip')}
      </a>
      <Header
        currentRole={currentRole}
        onRoleChange={changeRole}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      <Navigation role={currentRole} />

      <main id="main" className="main-content" tabIndex={-1}>
        {page}
      </main>

      <Footer />

      {/* Modals */}
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      {isWizardOpen && (
        <CreateEventWizard
          initialData={previewData ?? undefined}
          mode="create"
          onClose={() => setIsWizardOpen(false)}
          onPreview={handleOpenPreview}
        />
      )}

      {isPreviewOpen && previewData && (
        <LivePreviewModal
          data={previewData}
          onClose={() => setIsPreviewOpen(false)}
          onBackToEdit={() => {
            setIsPreviewOpen(false);
            setIsWizardOpen(true);
          }}
          onPublish={handlePublishEvent}
        />
      )}

      {isActivationOpen && (
        <PaidActivationModal onClose={() => setIsActivationOpen(false)} />
      )}

      {isPlatformSupportOpen && (
        <PlatformSupportModal events={events} onClose={() => setIsPlatformSupportOpen(false)} />
      )}

      {/* Task F2: Checkout Modal */}
      {selectedEventForCheckout && (
        <CheckoutModal
          event={selectedEventForCheckout}
          onClose={() => setSelectedEventForCheckout(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Task F3: Order Confirmation Modal & QR Display */}
      {confirmedTicket && (
        <OrderConfirmationModal
          ticket={confirmedTicket}
          onClose={() => setConfirmedTicket(null)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => (
  <I18nProvider>
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  </I18nProvider>
);

export default App;
