import type { PlatformSettings, Role } from '../types';
import { ApiError, call, qs } from './client';
import { logAudit } from './events';
import { commit, db, nextId, nowIso } from './mockDb';

const match = (q: string | undefined, ...fields: (string | undefined)[]) => {
  const s = q?.trim().toLowerCase();
  return !s || fields.some((f) => f?.toLowerCase().includes(s));
};

const ADMIN = 'ops@biletflow.kz';

/** GET /api/v1/admin/users */
export function adminListUsers(q?: string, role?: Role | 'all', status?: string) {
  return call('GET', `/api/v1/admin/users${qs({ q, role, status })}`, () =>
    db.users
      .filter((u) => match(q, u.name, u.email, u.id))
      .filter((u) => !role || role === 'all' || u.role === role)
      .filter((u) => !status || status === 'all' || u.status === status)
  );
}

/** PATCH /api/v1/admin/users/:id/status */
export function adminSetUserStatus(id: string, status: 'Active' | 'Suspended') {
  return call('PATCH', `/api/v1/admin/users/${id}/status`, () => {
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new ApiError(404, 'User not found');
    u.status = status;
    commit();
    return u;
  }, { status });
}

/** GET /api/v1/admin/events */
export function adminListEvents(q?: string, status?: string, reportedOnly?: boolean) {
  return call('GET', `/api/v1/admin/events${qs({ q, status, reported: reportedOnly ? 1 : undefined })}`, () =>
    db.events
      .filter((e) => match(q, e.title, e.organizerName, e.id, e.city))
      .filter((e) => !status || status === 'all' || e.status === status)
      .filter((e) => !reportedOnly || db.reports.some((r) => r.eventId === e.id && r.status === 'Open'))
  );
}

/** POST /api/v1/admin/events/:id/suspend — immediately halts sales */
export function adminSuspendEvent(id: string, suspend: boolean) {
  return call('POST', `/api/v1/admin/events/${id}/suspend`, () => {
    const e = db.events.find((x) => x.id === id);
    if (!e) throw new ApiError(404, 'Event not found');
    e.status = suspend ? 'Suspended' : 'Published';
    logAudit(id, suspend ? 'EVENT_UNPUBLISHED' : 'EVENT_PUBLISHED', e.title, suspend ? 'Suspended by Platform Admin — sales halted' : 'Suspension lifted by Platform Admin', ADMIN);
    db.notifications.unshift({ id: nextId('n'), kind: 'event_update', title: suspend ? 'Event suspended' : 'Event reinstated', body: e.title, createdAt: nowIso(), read: false, audience: 'Organizer' });
    commit();
    return e;
  }, { suspend });
}

/** GET /api/v1/admin/reports */
export function adminListReports() {
  return call('GET', '/api/v1/admin/reports', () => db.reports.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

/** PATCH /api/v1/admin/reports/:id */
export function adminResolveReport(id: string, status: 'Dismissed' | 'Actioned') {
  return call('PATCH', `/api/v1/admin/reports/${id}`, () => {
    const r = db.reports.find((x) => x.id === id);
    if (!r) throw new ApiError(404, 'Report not found');
    r.status = status;
    if (status === 'Actioned') {
      const e = db.events.find((x) => x.id === r.eventId);
      if (e && e.status !== 'Cancelled') e.status = 'Suspended';
    }
    commit();
    return r;
  }, { status });
}

/** GET /api/v1/admin/orders */
export function adminListOrders(q?: string, status?: string) {
  return call('GET', `/api/v1/admin/orders${qs({ q, status })}`, () =>
    db.orders
      .filter((o) => match(q, o.id, o.attendeeName, o.attendeeEmail, db.events.find((e) => e.id === o.eventId)?.title))
      .filter((o) => !status || status === 'all' || o.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({ ...o, eventTitle: db.events.find((e) => e.id === o.eventId)?.title ?? o.eventId }))
  );
}

/** GET /api/v1/admin/payments */
export function adminListPayments(q?: string, status?: string) {
  return call('GET', `/api/v1/admin/payments${qs({ q, status })}`, () =>
    db.payments
      .filter((p) => match(q, p.id, p.orderId, p.method, p.failureReason))
      .filter((p) => !status || status === 'all' || p.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

/** GET /api/v1/admin/activations */
export function adminListActivations() {
  return call('GET', '/api/v1/admin/activations', () => db.activations);
}

/** PATCH /api/v1/admin/activations/:id */
export function adminDecideActivation(id: string, status: 'Approved' | 'Rejected', note: string) {
  return call('PATCH', `/api/v1/admin/activations/${id}`, () => {
    const a = db.activations.find((x) => x.id === id);
    if (!a) throw new ApiError(404, 'Request not found');
    a.status = status;
    a.log.push({ at: nowIso(), message: `${status} by ${ADMIN}${note ? ` — ${note}` : ''}` });
    db.notifications.unshift({ id: nextId('n'), kind: 'payout', title: `Paid sales ${status.toLowerCase()}`, body: note || `Your activation request ${a.id} was ${status.toLowerCase()}`, createdAt: nowIso(), read: false, audience: 'Organizer' });
    commit();
    return a;
  }, { status, note });
}

/** GET /api/v1/admin/disputes */
export function adminListDisputes() {
  return call('GET', '/api/v1/admin/disputes', () => db.disputes);
}

/** GET /api/v1/admin/support-threads?status=Escalated */
export function adminListSupportThreads() {
  return call('GET', '/api/v1/admin/support-threads', () => db.platformThreads);
}

/** POST /api/v1/admin/support-threads/:id/reply */
export function adminReplyThread(id: string, body: string, resolve: boolean) {
  return call('POST', `/api/v1/admin/support-threads/${id}/reply`, () => {
    const t = db.platformThreads.find((x) => x.id === id);
    if (!t) throw new ApiError(404, 'Thread not found');
    if (body.trim()) t.messages.push({ id: nextId('m'), author: 'Platform', authorName: 'BiletFlow Support', body: body.trim(), at: nowIso() });
    if (resolve) t.status = 'Resolved';
    db.notifications.unshift({ id: nextId('n'), kind: 'support', title: 'Support replied', body: t.subject, createdAt: nowIso(), read: false, audience: 'Organizer' });
    commit();
    return t;
  }, { body, resolve });
}

/** GET /api/v1/admin/settings */
export function getPlatformSettings() {
  return call('GET', '/api/v1/admin/settings', () => db.settings);
}

/** PUT /api/v1/admin/settings */
export function updatePlatformSettings(s: PlatformSettings) {
  return call('PUT', '/api/v1/admin/settings', () => {
    if (s.activationFeeKzt < 0 || !Number.isFinite(s.activationFeeKzt)) throw new ApiError(422, 'Fee must be a positive number');
    db.settings = { ...s };
    commit();
    return db.settings;
  }, s);
}
