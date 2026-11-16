import type { Order, OrderStatus, PromoValidationResult, TicketOrder } from '../types';
import { ApiError, call, qs } from './client';
import { logAudit } from './events';
import { commit, db, nextId, nowIso } from './mockDb';

/** Statuses that consume inventory */
export const LIVE_STATUSES: OrderStatus[] = ['Paid', 'Registered', 'Reserved'];

export function soldCountFor(eventId: string, ticketTypeId: string) {
  return db.orders
    .filter((o) => o.eventId === eventId && o.ticketTypeId === ticketTypeId && LIVE_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.quantity, 0);
}

/** GET /api/v1/events/:id/availability — remaining per ticket type (drives Sold Out states) */
export function getAvailability(eventId: string) {
  return call('GET', `/api/v1/events/${eventId}/availability`, () => {
    const e = db.events.find((x) => x.id === eventId);
    if (!e) throw new ApiError(404, 'Event not found');
    const out: Record<string, number> = {};
    e.tickets.forEach((t) => (out[t.id] = Math.max(0, t.quantity - soldCountFor(eventId, t.id))));
    return out;
  });
}

/** POST /api/v1/orders/apply-promo (existing endpoint) */
export function applyPromo(eventId: string, code: string) {
  return call<PromoValidationResult>('POST', '/api/v1/orders/apply-promo', () => {
    const c = code.trim().toUpperCase();
    const p = db.promos.find((x) => x.code === c);
    if (!p) return { valid: false, code: c, reason: 'NOT_FOUND' };
    if (p.eventId !== eventId) return { valid: false, code: c, reason: 'WRONG_EVENT' };
    if (new Date(p.expiresAt).getTime() < Date.now()) return { valid: false, code: c, reason: 'EXPIRED' };
    if (p.redemptions >= p.maxRedemptions) return { valid: false, code: c, reason: 'EXHAUSTED' };
    return { valid: true, code: c, kind: p.kind, value: p.value, campaign: p.campaign };
  }, { eventId, code });
}

export function computeDiscount(subtotal: number, quantity: number, promo?: PromoValidationResult | null) {
  if (!promo?.valid || !promo.value) return 0;
  if (promo.kind === 'percent') return Math.round((subtotal * promo.value) / 100);
  return Math.min(subtotal, promo.value * quantity);
}

export interface CreateOrderInput {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  promoCode?: string;
  seats?: string[];
  holderId?: string;
}

/** POST /api/v1/orders — finalize after sandbox payment success */
export function createOrder(input: CreateOrderInput) {
  return call('POST', '/api/v1/orders', () => {
    const e = db.events.find((x) => x.id === input.eventId);
    const t = e?.tickets.find((x) => x.id === input.ticketTypeId);
    if (!e || !t) throw new ApiError(404, 'Ticket type not found');
    const promo = input.promoCode ? db.promos.find((p) => p.code === input.promoCode && p.eventId === e.id) : undefined;
    const subtotal = t.price * input.quantity;
    const discount = promo
      ? computeDiscount(subtotal, input.quantity, { valid: true, code: promo.code, kind: promo.kind, value: promo.value })
      : 0;
    if (promo) promo.redemptions += 1;
    const order: Order = {
      id: nextId('ORD'),
      eventId: e.id!,
      ticketTypeId: t.id,
      ticketTypeName: t.name,
      attendeeName: input.attendeeName,
      attendeeEmail: input.attendeeEmail,
      attendeePhone: input.attendeePhone,
      quantity: input.quantity,
      unitPrice: t.price,
      discount,
      total: subtotal - discount,
      promoCode: promo?.code,
      status: t.price > 0 ? 'Paid' : 'Registered',
      checkedIn: false,
      createdAt: nowIso(),
      seats: input.seats,
    };
    db.orders.push(order);
    if (input.holderId) db.seatHolds = db.seatHolds.filter((h) => h.holderId !== input.holderId);
    db.notifications.unshift({
      id: nextId('n'), kind: 'ticket', title: 'Your ticket is ready', body: `${e.title} — ${t.name} ×${input.quantity}`,
      createdAt: nowIso(), read: false, audience: 'Attendee', link: `/events/${e.slug ?? e.id}`,
    });
    commit();
    return order;
  }, input);
}

export const orderToTicket = (o: Order, eventTitle: string, date: string, venue: string): TicketOrder => ({
  id: o.id,
  eventId: o.eventId,
  eventName: eventTitle,
  attendeeName: o.attendeeName,
  attendeeEmail: o.attendeeEmail,
  attendeePhone: o.attendeePhone,
  ticketName: o.ticketTypeName,
  price: o.total,
  date,
  venue,
  quantity: o.quantity,
  discount: o.discount,
  promoCode: o.promoCode,
  seats: o.seats,
});

export interface AttendeeQuery {
  q?: string;
  ticketTypeId?: string;
  status?: OrderStatus | 'all';
  checkIn?: 'all' | 'in' | 'out';
}

/** GET /api/v1/organizer/events/:id/orders */
export function listEventOrders(eventId: string, query: AttendeeQuery = {}) {
  return call('GET', `/api/v1/organizer/events/${eventId}/orders${qs({ ...query })}`, () => {
    const q = query.q?.trim().toLowerCase();
    return db.orders
      .filter((o) => o.eventId === eventId)
      .filter((o) => !q || o.attendeeName.toLowerCase().includes(q) || o.attendeeEmail.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
      .filter((o) => !query.ticketTypeId || query.ticketTypeId === 'all' || o.ticketTypeId === query.ticketTypeId)
      .filter((o) => !query.status || query.status === 'all' || o.status === query.status)
      .filter((o) => !query.checkIn || query.checkIn === 'all' || (query.checkIn === 'in' ? o.checkedIn : !o.checkedIn))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

/** POST /api/v1/organizer/orders/:id/cancel — free registrations */
export function cancelRegistration(orderId: string) {
  return call('POST', `/api/v1/organizer/orders/${orderId}/cancel`, () => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError(404, 'Order not found');
    if (o.unitPrice > 0) throw new ApiError(409, 'Paid orders must be refunded instead');
    o.status = 'Cancelled';
    logAudit(o.eventId, 'REGISTRATION_CANCELLED', o.id, `Registration of ${o.attendeeName} cancelled`);
    commit();
    return o;
  });
}

/** POST /api/v1/organizer/orders/:id/refund — full refund for paid orders */
export function refundOrder(orderId: string) {
  return call('POST', `/api/v1/organizer/orders/${orderId}/refund`, () => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError(404, 'Order not found');
    if (o.status !== 'Paid') throw new ApiError(409, 'Only paid orders can be refunded');
    o.status = 'Refunded';
    const pay = db.payments.find((p) => p.orderId === o.id);
    if (pay) pay.status = 'Refunded';
    logAudit(o.eventId, 'ORDER_REFUNDED', o.id, `Full refund of ${o.total} KZT issued to ${o.attendeeName}`);
    db.notifications.unshift({
      id: nextId('n'), kind: 'refund', title: 'Refund processed', body: `${o.total} ₸ refunded for order ${o.id}`,
      createdAt: nowIso(), read: false, audience: 'Attendee',
    });
    commit();
    return o;
  });
}

export type ScanOutcome =
  | { kind: 'valid'; order: Order }
  | { kind: 'used'; order: Order }
  | { kind: 'promo'; code: string }
  | { kind: 'not_found'; query: string };

/** POST /api/v1/checkin/scan — used by Event Admin scanner */
export function scanTicket(raw: string) {
  return call<ScanOutcome>('POST', '/api/v1/checkin/scan', () => {
    let id = raw.trim();
    try {
      const j = JSON.parse(raw) as { ticketId?: string };
      if (j.ticketId) id = j.ticketId;
    } catch {
      /* plain text query */
    }
    const promo = db.promos.find((p) => p.code === id.toUpperCase());
    if (promo) return { kind: 'promo', code: promo.code };
    const q = id.toLowerCase();
    const o = db.orders.find(
      (x) => (x.id.toLowerCase() === q || x.attendeeName.toLowerCase() === q) && (x.status === 'Paid' || x.status === 'Registered')
    );
    if (!o) return { kind: 'not_found', query: id };
    return o.checkedIn ? { kind: 'used', order: o } : { kind: 'valid', order: o };
  }, { raw });
}

/** POST /api/v1/checkin/:orderId */
export function confirmCheckIn(orderId: string, staffEmail = 'scanner1@techcorp.kz') {
  return call('POST', `/api/v1/checkin/${orderId}`, () => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError(404, 'Order not found');
    o.checkedIn = true;
    o.checkedInAt = nowIso();
    logAudit(o.eventId, 'CHECK_IN', o.id, `${o.attendeeName} checked in`, staffEmail);
    commit();
    return o;
  });
}
