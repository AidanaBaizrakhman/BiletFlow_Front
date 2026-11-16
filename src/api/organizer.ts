import type {
  AnalyticsFilter,
  AnalyticsSummary,
  AuditAction,
  InventoryRow,
  PlatformSupportCategory,
  PlatformSupportThread,
  StaffAssignment,
} from '../types';
import { ApiError, call, qs } from './client';
import { logAudit } from './events';
import { CURRENT_ORGANIZER, commit, db, nextId, nowIso } from './mockDb';
import { activeHoldsByTier } from './seating';

/** GET /api/v1/organizer/events/:id/inventory — live breakdown per tier */
export function getInventory(eventId: string) {
  return call<InventoryRow[]>('GET', `/api/v1/organizer/events/${eventId}/inventory`, () => {
    const e = db.events.find((x) => x.id === eventId);
    if (!e) throw new ApiError(404, 'Event not found');
    const holdsByTier = activeHoldsByTier(eventId);
    return e.tickets.map((t) => {
      const os = db.orders.filter((o) => o.eventId === eventId && o.ticketTypeId === t.id);
      const sum = (f: (o: (typeof os)[number]) => boolean) => os.filter(f).reduce((s, o) => s + o.quantity, 0);
      const sold = sum((o) => o.status === 'Paid' || o.status === 'Registered');
      const reserved = sum((o) => o.status === 'Reserved') + (holdsByTier[t.id] ?? 0);
      return {
        ticketTypeId: t.id,
        name: t.name,
        hidden: !!t.hidden,
        capacity: t.quantity,
        sold,
        reserved,
        refunded: sum((o) => o.status === 'Refunded' || o.status === 'Cancelled'),
        checkedIn: sum((o) => o.checkedIn),
        available: Math.max(0, t.quantity - sold - reserved),
      };
    });
  });
}

/* ---------------- Check-in staff ---------------- */

/** GET /api/v1/organizer/events/:id/staff */
export function listStaff(eventId: string) {
  return call('GET', `/api/v1/organizer/events/${eventId}/staff`, () => db.staff.filter((s) => s.eventId === eventId));
}

/** GET /api/v1/users/search?q= — user lookup for staff assignment */
export function searchUsers(q: string) {
  return call('GET', `/api/v1/users/search${qs({ q })}`, () => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return db.users.filter((u) => u.status === 'Active' && (u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s))).slice(0, 6);
  });
}

/** POST /api/v1/organizer/events/:id/staff */
export function assignStaff(eventId: string, email: string) {
  return call<StaffAssignment>('POST', `/api/v1/organizer/events/${eventId}/staff`, () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ApiError(422, 'Enter a valid email address', 'INVALID_EMAIL');
    if (db.staff.some((s) => s.eventId === eventId && s.email === e)) throw new ApiError(409, 'Already assigned', 'DUPLICATE');
    const user = db.users.find((u) => u.email === e);
    const a: StaffAssignment = { id: nextId('stf'), eventId, email: e, name: user?.name ?? e.split('@')[0], assignedAt: nowIso() };
    db.staff.push(a);
    logAudit(eventId, 'STAFF_ASSIGNED', e, 'Check-in (Event Admin) access granted');
    db.notifications.unshift({ id: nextId('n'), kind: 'event_update', title: 'Staff assignment', body: `You were assigned as check-in staff`, createdAt: nowIso(), read: false, audience: 'Event Admin', link: '/scanner' });
    commit();
    return a;
  }, { email });
}

/** DELETE /api/v1/organizer/events/:id/staff/:staffId */
export function revokeStaff(eventId: string, staffId: string) {
  return call('DELETE', `/api/v1/organizer/events/${eventId}/staff/${staffId}`, () => {
    const a = db.staff.find((s) => s.id === staffId);
    db.staff = db.staff.filter((s) => s.id !== staffId);
    if (a) logAudit(eventId, 'STAFF_REVOKED', a.email, 'Check-in access revoked');
    commit();
    return { ok: true };
  });
}

/* ---------------- Audit trail ---------------- */

export interface AuditQuery {
  action?: AuditAction | 'all';
  from?: string;
  to?: string;
}

/** GET /api/v1/organizer/events/:id/audit */
export function listAudit(eventId: string, query: AuditQuery = {}) {
  return call('GET', `/api/v1/organizer/events/${eventId}/audit${qs({ ...query })}`, () =>
    db.audit
      .filter((a) => a.eventId === eventId)
      .filter((a) => !query.action || query.action === 'all' || a.action === query.action)
      .filter((a) => !query.from || a.timestamp.slice(0, 10) >= query.from)
      .filter((a) => !query.to || a.timestamp.slice(0, 10) <= query.to)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
}

/* ---------------- Analytics ---------------- */

/** GET /api/v1/organizer/analytics */
export function getAnalytics(filter: AnalyticsFilter) {
  return call<AnalyticsSummary>('GET', `/api/v1/organizer/analytics${qs({ ...filter })}`, () => {
    const events = db.events.filter((e) => (filter.eventId === 'all' ? e.organizerId === CURRENT_ORGANIZER.id : e.id === filter.eventId));
    const ids = new Set(events.map((e) => e.id));
    const tiers = events.flatMap((e) => e.tickets).filter((t) => filter.ticketTypeId === 'all' || t.id === filter.ticketTypeId);
    const tierIds = new Set(tiers.map((t) => t.id));
    const orders = db.orders
      .filter((o) => ids.has(o.eventId) && tierIds.has(o.ticketTypeId))
      .filter((o) => !filter.from || o.createdAt.slice(0, 10) >= filter.from)
      .filter((o) => !filter.to || o.createdAt.slice(0, 10) <= filter.to);

    const valid = orders.filter((o) => o.status === 'Paid' || o.status === 'Registered');
    const refunded = orders.filter((o) => o.status === 'Refunded');
    const totalCapacity = tiers.reduce((s, t) => s + t.quantity, 0);
    const sold = valid.reduce((s, o) => s + o.quantity, 0);
    const checkedIn = valid.filter((o) => o.checkedIn).reduce((s, o) => s + o.quantity, 0);
    const pastEventIds = new Set(events.filter((e) => new Date(e.eventDate).getTime() < Date.now()).map((e) => e.id));
    const soldPast = valid.filter((o) => pastEventIds.has(o.eventId)).reduce((s, o) => s + o.quantity, 0);
    const gross = [...valid, ...refunded].reduce((s, o) => s + o.unitPrice * o.quantity, 0);
    const discounts = [...valid, ...refunded].reduce((s, o) => s + o.discount, 0);
    const refunds = refunded.reduce((s, o) => s + o.total, 0);

    const dayMap = new Map<string, { tickets: number; revenue: number }>();
    valid.forEach((o) => {
      const d = o.createdAt.slice(0, 10);
      const cur = dayMap.get(d) ?? { tickets: 0, revenue: 0 };
      cur.tickets += o.quantity;
      cur.revenue += o.total;
      dayMap.set(d, cur);
    });
    const typeMap = new Map<string, { tickets: number; revenue: number }>();
    valid.forEach((o) => {
      const ev = events.find((e) => e.id === o.eventId);
      const key = filter.eventId === 'all' ? `${o.ticketTypeName} · ${ev?.title.split(' ').slice(0, 2).join(' ')}` : o.ticketTypeName;
      const cur = typeMap.get(key) ?? { tickets: 0, revenue: 0 };
      cur.tickets += o.quantity;
      cur.revenue += o.total;
      typeMap.set(key, cur);
    });
    const promoMap = new Map<string, { redemptions: number; tickets: number; net: number }>();
    valid.filter((o) => o.promoCode).forEach((o) => {
      const cur = promoMap.get(o.promoCode!) ?? { redemptions: 0, tickets: 0, net: 0 };
      cur.redemptions += 1;
      cur.tickets += o.quantity;
      cur.net += o.total;
      promoMap.set(o.promoCode!, cur);
    });

    return {
      totalCapacity,
      sold,
      remaining: Math.max(0, totalCapacity - sold),
      pctSold: totalCapacity ? (sold / totalCapacity) * 100 : 0,
      checkedIn,
      absent: Math.max(0, soldPast - checkedIn),
      checkInPct: soldPast ? (checkedIn / soldPast) * 100 : 0,
      gross,
      discounts,
      refunds,
      net: gross - discounts - refunds,
      salesByDay: [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      byTicketType: [...typeMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
      campaigns: [...promoMap.entries()].map(([code, v]) => ({ code, campaign: db.promos.find((p) => p.code === code)?.campaign, ...v })),
    };
  });
}

/* ---------------- Organizer → Platform support ---------------- */

/** GET /api/v1/organizer/platform-support */
export function listMyPlatformThreads() {
  return call('GET', '/api/v1/organizer/platform-support', () =>
    db.platformThreads.filter((t) => t.organizerEmail === CURRENT_ORGANIZER.email)
  );
}

/** POST /api/v1/organizer/platform-support */
export function createPlatformThread(input: { category: PlatformSupportCategory; subject: string; message: string; eventId?: string }) {
  return call<PlatformSupportThread>('POST', '/api/v1/organizer/platform-support', () => {
    if (!input.subject.trim() || !input.message.trim()) throw new ApiError(422, 'Subject and message are required');
    const t: PlatformSupportThread = {
      id: nextId('PST'),
      organizerEmail: CURRENT_ORGANIZER.email,
      organizerName: CURRENT_ORGANIZER.name,
      category: input.category,
      subject: input.subject.trim(),
      status: 'Open',
      createdAt: nowIso(),
      messages: [{ id: nextId('m'), author: 'Organizer', authorName: CURRENT_ORGANIZER.name, body: input.message.trim(), at: nowIso() }],
    };
    db.platformThreads.unshift(t);
    db.notifications.unshift({ id: nextId('n'), kind: 'support', title: 'New organizer support request', body: `${t.category}: ${t.subject}`, createdAt: nowIso(), read: false, audience: 'Platform Admin', link: '/admin' });
    commit();
    return t;
  }, input);
}
