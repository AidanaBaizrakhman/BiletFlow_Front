import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getPublicEvent } from '../api/events';
import { createOrder, getAvailability, orderToTicket } from '../api/orders';
import { getLayoutSync, getSeatStates, holdSeats, releaseHolds, findSeat } from '../api/seating';
import { db } from '../api/mockDb';
import { Cover } from '../components/discovery/EventCard';
import { TicketSelector, promoErrorKey, type Selection } from '../components/discovery/TicketSelector';
import { CheckoutModal } from '../components/Modals/CheckoutModal';
import { OrderConfirmationModal } from '../components/Modals/OrderConfirmationModal';
import { SeatMap } from '../components/seating/SeatMap';
import { Button, ErrorState, Loading, Notice, StatusStamp, useToast } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useCampaignPromo } from '../hooks/useCampaignPromo';
import { useTranslation } from '../i18n';
import { Link, stripQuery } from '../router';
import type { LayoutSeat, PromoValidationResult, SeatState, TicketOrder } from '../types';
import { createGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { KZ_TZ_LABEL, formatDateTime, formatKZT, toDate } from '../utils/format';

function holderId() {
  try {
    let id = sessionStorage.getItem('bf-holder');
    if (!id) {
      id = `h-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('bf-holder', id);
    }
    return id;
  } catch {
    return 'h-anon';
  }
}

/** Module 1.2 — public event landing at /events/:slugOrId */
export const EventLanding: React.FC<{ slugOrId: string }> = ({ slugOrId }) => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const { data: event, loading, error, refetch } = useAsync(() => getPublicEvent(slugOrId), [slugOrId]);
  const { data: availability } = useAsync(() => (event?.id ? getAvailability(event.id) : Promise.resolve({} as Record<string, number>)), [event?.id]);
  const campaign = useCampaignPromo(event?.id);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [promo, setPromo] = useState<PromoValidationResult | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number>();
  const [confirmed, setConfirmed] = useState<TicketOrder | null>(null);
  const [busy, setBusy] = useState(false);

  // Seating
  const holder = useMemo(holderId, []);
  const layout = event?.seatingMode === 'AssignedSeating' ? getLayoutSync(event.seatingLayoutId) : undefined;
  const [seatStates, setSeatStates] = useState<Record<string, SeatState>>({});
  const [mySeats, setMySeats] = useState<string[]>([]);

  const loadSeats = useCallback(() => {
    if (!event?.id || !layout) return;
    getSeatStates(event.id, holder).then(setSeatStates).catch(() => undefined);
  }, [event?.id, layout, holder]);

  useEffect(() => {
    loadSeats();
    if (!layout) return;
    const i = setInterval(loadSeats, 10000); // reflect other shoppers' holds & expirations
    return () => clearInterval(i);
  }, [loadSeats, layout]);

  // Campaign QR → pre-apply discount to the selector
  useEffect(() => {
    if (campaign.state.status === 'applied') setPromo(campaign.state.result);
  }, [campaign.state]);

  const seatTicketId = mySeats.length && layout ? findSeat(layout, mySeats[0])?.tierId ?? null : null;

  const toggleSeat = (seat: LayoutSeat) => {
    if (!event) return;
    const tier = event.tickets.find((x) => x.id === seat.tierId);
    setMySeats((prev) => {
      if (prev.includes(seat.id)) return prev.filter((s) => s !== seat.id);
      if (prev.length && layout && findSeat(layout, prev[0])?.tierId !== seat.tierId) {
        toast(t('seat.oneTier'), 'info');
        return [seat.id];
      }
      if (tier && prev.length >= tier.limitPerOrder) {
        toast(t('seat.maxReached', { n: tier.limitPerOrder }), 'info');
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  const displayStates = useMemo(() => {
    const s = { ...seatStates };
    mySeats.forEach((id) => {
      if (s[id] === 'available' || s[id] === 'accessible' || s[id] === 'selected') s[id] = 'selected';
    });
    Object.keys(s).forEach((id) => {
      if (s[id] === 'selected' && !mySeats.includes(id)) s[id] = findSeat(layout!, id)?.accessible ? 'accessible' : 'available';
    });
    return s;
  }, [seatStates, mySeats, layout]);

  if (loading && !event) return <Loading />;
  if (error || !event)
    return (
      <div className="stack">
        <ErrorState error={error ?? new Error(t('landing.notFound'))} onRetry={refetch} />
        <Link to="/events" className="bf-btn bf-btn--secondary bf-btn--md">
          ← {t('landing.back')}
        </Link>
      </div>
    );

  const started = toDate(event.eventDate).getTime() < Date.now();
  const regClosed = event.regWindow && toDate(event.regWindow).getTime() < Date.now();
  const disabledReason =
    event.status === 'Cancelled'
      ? t('landing.cancelled')
      : event.status === 'Suspended'
        ? t('landing.suspended')
        : event.status === 'Completed' || started
          ? t('landing.ended')
          : regClosed
            ? t('landing.regClosed')
            : undefined;

  const startCheckout = async () => {
    if (!event.id) return;
    if (layout) {
      setBusy(true);
      try {
        const minutes = db.settings.reservationHoldMinutes;
        const r = await holdSeats(event.id, mySeats, holder, minutes);
        setHoldExpiresAt(r.expiresAt);
        setCheckoutOpen(true);
      } catch (e) {
        toast((e as Error).message, 'error');
        setMySeats([]);
        loadSeats();
      } finally {
        setBusy(false);
      }
    } else {
      setHoldExpiresAt(undefined);
      setCheckoutOpen(true);
    }
  };

  const closeCheckout = (expired = false) => {
    setCheckoutOpen(false);
    if (layout) {
      releaseHolds(holder).finally(loadSeats);
      if (expired) {
        setMySeats([]);
        toast(t('seat.holdExpired'), 'error');
      }
    } else if (expired) toast(t('checkout.expired'), 'error');
  };

  const onPaid = async (ticket: TicketOrder) => {
    const ticketTypeId = seatTicketId ?? event.tickets.find((x) => x.name === ticket.ticketName)?.id ?? selection?.ticketId ?? event.tickets[0].id;
    try {
      const order = await createOrder({
        eventId: event.id!,
        ticketTypeId,
        quantity: ticket.quantity ?? 1,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        attendeePhone: ticket.attendeePhone,
        promoCode: promo?.valid ? promo.code : undefined,
        seats: layout ? mySeats : undefined,
        holderId: holder,
      });
      setCheckoutOpen(false);
      setSelection(null);
      setMySeats([]);
      setPromo(null);
      if (campaign.state.status !== 'idle') stripQuery(['promo', 'campaign']);
      setConfirmed(orderToTicket(order, event.title, event.eventDate, event.venue));
      loadSeats();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const gcal = createGoogleCalendarUrl(event.title, event.description, `${event.venue}${event.venueAddress ? `, ${event.venueAddress}` : ''}`, event.eventDate);
  const ics = () => downloadIcsFile(event.title, event.description, `${event.venue}${event.venueAddress ? `, ${event.venueAddress}` : ''}`, event.eventDate);
  const qtyForCheckout = layout ? mySeats.length : selection?.quantity ?? 1;
  const ticketForCheckout = layout ? seatTicketId ?? undefined : selection?.ticketId;

  return (
    <article>
      <nav aria-label={t('landing.breadcrumb')} className="mono-sm" style={{ marginBottom: 14 }}>
        <Link to="/events">{t('nav.allEvents')}</Link> / <span aria-current="page">{event.title}</span>
      </nav>

      {/* Campaign QR banner */}
      {campaign.state.status === 'checking' && <Notice tone="info">{t('promo.checking', { code: campaign.state.code })}</Notice>}
      {campaign.state.status === 'applied' && (
        <Notice
          tone="promo"
          title={t('promo.campaignApplied', { code: campaign.state.result.code })}
          action={
            <Button variant="link" onClick={campaign.dismiss}>
              {t('common.dismiss')}
            </Button>
          }
        >
          {campaign.state.result.campaign ? `${campaign.state.result.campaign} · ` : ''}
          {campaign.state.result.kind === 'percent'
            ? t('promo.percentOff', { value: campaign.state.result.value ?? 0 })
            : t('promo.fixedOff', { value: formatKZT(campaign.state.result.value ?? 0) })}
        </Notice>
      )}
      {campaign.state.status === 'error' && (
        <Notice tone="error" title={t('promo.campaignFailed')} action={<Button variant="link" onClick={campaign.dismiss}>{t('common.dismiss')}</Button>}>
          {t(promoErrorKey(campaign.state.result.reason), { code: campaign.state.result.code })}
        </Notice>
      )}

      <div className="landing" style={{ marginTop: 16 }}>
        <div>
          <Cover event={event} className="" />
          <div className="row">
            <span className="eyebrow" style={{ margin: 0 }}>
              {t(`category.${event.category}`)}
            </span>
            {event.status !== 'Published' && <StatusStamp status={event.status ?? 'Published'} />}
          </div>
          <h1 className="landing__title">{event.title}</h1>

          <dl className="landing__facts">
            <div className="fact">
              <dt>{t('landing.when')}</dt>
              <dd>
                {formatDateTime(event.eventDate, lang)}
                <small>
                  {t('landing.timezone')}: {KZ_TZ_LABEL}
                </small>
              </dd>
            </div>
            <div className="fact">
              <dt>{t('landing.where')}</dt>
              <dd>
                {event.venue}
                {event.venueAddress && <small>{event.venueAddress}</small>}
              </dd>
            </div>
            <div className="fact">
              <dt>{t('landing.capacity')}</dt>
              <dd>
                {event.maxCapacity}
                <small>{event.seatingMode === 'AssignedSeating' ? t('seat.assigned') : t('seat.ga')}</small>
              </dd>
            </div>
          </dl>

          <div className="row" role="group" aria-label={t('calendar.add')} style={{ margin: '4px 0 26px' }}>
            <a className="sm-btn" href={gcal} target="_blank" rel="noopener noreferrer">
              + Google
            </a>
            <button type="button" className="sm-btn" onClick={ics}>
              + Apple / iCal
            </button>
            <button type="button" className="sm-btn" onClick={ics}>
              .ics
            </button>
          </div>

          <section aria-labelledby="about">
            <h2 id="about">{t('landing.about')}</h2>
            <p className="prose">{event.description}</p>
          </section>

          {layout && (
            <section aria-labelledby="seats-h">
              <h2 id="seats-h">{t('seat.choose')}</h2>
              <SeatMap
                layout={layout}
                states={displayStates}
                onToggle={disabledReason ? undefined : toggleSeat}
                priceFor={(tierId) => event.tickets.find((x) => x.id === tierId)?.price ?? layout.tiers.find((x) => x.id === tierId)?.price ?? 0}
              />
            </section>
          )}

          <section aria-labelledby="org-h">
            <h2 id="org-h">{t('landing.organizer')}</h2>
            <div className="organizer-card">
              <span className="avatar" aria-hidden="true">
                {(event.organizerName ?? 'BF').slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{event.organizerName ?? 'BiletFlow'}</strong>
                <div className="mono-sm muted">{event.organizerEmail}</div>
              </div>
            </div>
          </section>

          <section aria-labelledby="refund-h">
            <h2 id="refund-h">{t('landing.refundPolicy')}</h2>
            <div className="refund-box">{event.refundPolicy || t('landing.noRefundPolicy')}</div>
          </section>
        </div>

        <aside className="sticky-side" aria-label={t('selector.title')}>
          <TicketSelector
            event={event}
            availability={availability ?? {}}
            selection={selection}
            onSelectionChange={setSelection}
            promo={promo}
            onPromoChange={setPromo}
            disabledReason={disabledReason}
            onCheckout={startCheckout}
            checkoutBusy={busy}
            seatMode={layout ? { seats: mySeats, ticketId: seatTicketId } : undefined}
          />
        </aside>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          event={event}
          onClose={() => closeCheckout(false)}
          onExpire={() => closeCheckout(true)}
          onPaymentSuccess={onPaid}
          initialTicketId={ticketForCheckout}
          quantity={qtyForCheckout}
          promo={promo}
          seats={layout ? mySeats : undefined}
          expiresAt={holdExpiresAt}
        />
      )}
      {confirmed && <OrderConfirmationModal ticket={confirmed} onClose={() => setConfirmed(null)} />}
    </article>
  );
};
