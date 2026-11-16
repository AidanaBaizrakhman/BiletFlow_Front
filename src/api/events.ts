import type { AuditAction, EventFormData, EventStatus } from '../types';
import { ApiError, call, qs } from './client';
import { CURRENT_ORGANIZER, commit, db, nextId, nowIso } from './mockDb';

export interface CatalogQuery {
  q?: string;
  category?: string;
  city?: string;
  venue?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9а-яёәғқңөұүһі\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'event';

export function logAudit(eventId: string, action: AuditAction, entity: string, description: string, actor = CURRENT_ORGANIZER.email) {
  db.audit.push({ id: nextId('AUD'), eventId, timestamp: nowIso(), actor, action, entity, description });
}

const isUpcomingPublic = (e: EventFormData) =>
  e.status === 'Published' && e.visibility === 'Public' && new Date(e.eventDate).getTime() >= Date.now() - 6 * 3600 * 1000;

/** GET /api/v1/events — public catalog (upcoming, published, public visibility only) */
export function listPublicEvents(query: CatalogQuery = {}) {
  return call('GET', `/api/v1/events${qs({ ...query })}`, () => {
    const q = query.q?.trim().toLowerCase();
    return db.events
      .filter(isUpcomingPublic)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
      .filter((e) => !query.category || e.category === query.category)
      .filter((e) => !query.city || e.city === query.city)
      .filter((e) => !query.venue || e.venue === query.venue)
      .filter((e) => !query.from || e.eventDate.slice(0, 10) >= query.from)
      .filter((e) => !query.to || e.eventDate.slice(0, 10) <= query.to)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  });
}

/** GET /api/v1/events/:slugOrId — public landing (Unlisted reachable by link; Private/Draft are 404) */
export function getPublicEvent(slugOrId: string) {
  return call('GET', `/api/v1/events/${encodeURIComponent(slugOrId)}`, () => {
    const e = db.events.find((x) => x.slug === slugOrId || x.id === slugOrId);
    if (!e || e.visibility === 'Private' || e.status === 'Draft' || e.status === 'Unpublished') throw new ApiError(404, 'Event not found');
    return { ...e, tickets: e.tickets.filter((t) => !t.hidden) };
  });
}

/** GET /api/v1/organizer/events */
export function listOrganizerEvents() {
  return call('GET', '/api/v1/organizer/events', () =>
    db.events
      .filter((e) => e.organizerId === CURRENT_ORGANIZER.id || !e.organizerId)
      .map((e) => ({
        ...e,
        attendeesCount: db.orders
          .filter((o) => o.eventId === e.id && (o.status === 'Paid' || o.status === 'Registered'))
          .reduce((s, o) => s + o.quantity, 0),
      }))
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  );
}

/** GET /api/v1/organizer/events/:id */
export function getOrganizerEvent(id: string) {
  return call('GET', `/api/v1/organizer/events/${id}`, () => {
    const e = db.events.find((x) => x.id === id);
    if (!e) throw new ApiError(404, 'Event not found');
    return e;
  });
}

/** POST /api/v1/organizer/events */
export function createEvent(data: EventFormData) {
  return call('POST', '/api/v1/organizer/events', () => {
    const id = nextId('evt');
    const evt: EventFormData = {
      ...data,
      id,
      slug: `${slugify(data.title)}-${id.slice(-4).toLowerCase()}`,
      status: 'Published',
      attendeesCount: 0,
      city: data.city ?? (data.venue.includes('Online') ? 'Online' : 'Astana'),
      timezone: data.timezone ?? 'Asia/Almaty',
      organizerId: CURRENT_ORGANIZER.id,
      organizerName: CURRENT_ORGANIZER.name,
      organizerEmail: CURRENT_ORGANIZER.email,
      createdAt: nowIso(),
    };
    db.events.push(evt);
    logAudit(id, 'EVENT_CREATED', evt.title, 'Event created via wizard');
    logAudit(id, 'EVENT_PUBLISHED', evt.title, 'Event published and visible in catalog');
    commit();
    return evt;
  }, data);
}

/** PUT /api/v1/organizer/events/:id */
export function updateEvent(id: string, data: EventFormData) {
  return call('PUT', `/api/v1/organizer/events/${id}`, () => {
    const i = db.events.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError(404, 'Event not found');
    const before = db.events[i];
    const changed = (Object.keys(data) as (keyof EventFormData)[]).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(data[k])
    );
    db.events[i] = { ...before, ...data, id, status: before.status };
    logAudit(id, 'EVENT_UPDATED', data.title, changed.length ? `Updated fields: ${changed.join(', ')}` : 'Saved without changes');
    commit();
    return db.events[i];
  }, data);
}

const STATUS_ACTION: Partial<Record<EventStatus, AuditAction>> = {
  Published: 'EVENT_PUBLISHED',
  Unpublished: 'EVENT_UNPUBLISHED',
  Cancelled: 'EVENT_CANCELLED',
};

/** PATCH /api/v1/organizer/events/:id/status */
export function setEventStatus(id: string, status: 'Published' | 'Unpublished' | 'Cancelled', reason?: string) {
  return call('PATCH', `/api/v1/organizer/events/${id}/status`, () => {
    const e = db.events.find((x) => x.id === id);
    if (!e) throw new ApiError(404, 'Event not found');
    if (e.status === 'Cancelled') throw new ApiError(409, 'Cancelled events cannot change status');
    e.status = status;
    if (status === 'Cancelled') {
      let refunded = 0;
      db.orders
        .filter((o) => o.eventId === id && (o.status === 'Paid' || o.status === 'Registered' || o.status === 'Reserved'))
        .forEach((o) => {
          o.status = o.unitPrice > 0 ? 'Refunded' : 'Cancelled';
          if (o.unitPrice > 0) refunded += o.total;
        });
      db.notifications.unshift({
        id: nextId('n'), kind: 'event_cancelled', title: 'Event cancelled', body: `${e.title} was cancelled. Refunds are on their way.`,
        createdAt: nowIso(), read: false, audience: 'Attendee',
      });
      logAudit(id, 'EVENT_CANCELLED', e.title, `Event cancelled${reason ? `: ${reason}` : ''}. Refunded ${refunded} KZT across paid orders.`);
    } else {
      logAudit(id, STATUS_ACTION[status]!, e.title, status === 'Published' ? 'Event published' : 'Event unpublished — hidden from catalog, sales paused');
    }
    commit();
    return e;
  }, { status, reason });
}

/** PATCH /api/v1/organizer/events/:id/tickets/:ticketId — Hide / Unhide */
export function setTicketHidden(eventId: string, ticketId: string, hidden: boolean) {
  return call('PATCH', `/api/v1/organizer/events/${eventId}/tickets/${ticketId}`, () => {
    const e = db.events.find((x) => x.id === eventId);
    const t = e?.tickets.find((x) => x.id === ticketId);
    if (!e || !t) throw new ApiError(404, 'Ticket type not found');
    t.hidden = hidden;
    logAudit(eventId, hidden ? 'TICKET_HIDDEN' : 'TICKET_UNHIDDEN', t.name, `${t.name} ${hidden ? 'hidden from' : 'shown at'} public checkout`);
    commit();
    return t;
  }, { hidden });
}

export const CATEGORIES = ['Technology & IT', 'Music & Concerts', 'Business & Networking', 'Sports & Health', 'Culture & Arts'];
export const VENUES = ['Astana Hub (Mangilik El C5.1)', 'EXPO Congress Center', 'Barys Arena', 'Central Park Open Stage', 'Online Stream (Zoom/YouTube)'];
export const CITIES = ['Astana', 'Almaty', 'Shymkent', 'Online'];
