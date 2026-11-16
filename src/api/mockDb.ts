/**
 * In-browser mock database used by the API adapters while backend endpoints are not wired.
 * Seeded deterministically so every flow is testable end-to-end; persisted to localStorage
 * (best effort) so state survives page reloads during manual QA.
 */
import type {
  ActivationRequest,
  AppNotification,
  AuditEntry,
  Dispute,
  EventFormData,
  EventReport,
  Order,
  Payment,
  PlatformSettings,
  PlatformSupportThread,
  PlatformUser,
  PromoCode,
  SeatHold,
  StaffAssignment,
} from '../types';

export interface MockDb {
  events: EventFormData[];
  orders: Order[];
  promos: PromoCode[];
  audit: AuditEntry[];
  staff: StaffAssignment[];
  users: PlatformUser[];
  payments: Payment[];
  activations: ActivationRequest[];
  disputes: Dispute[];
  reports: EventReport[];
  platformThreads: PlatformSupportThread[];
  notifications: AppNotification[];
  settings: PlatformSettings;
  seatHolds: SeatHold[];
}

const STORAGE_KEY = 'biletflow-mockdb-v2';

/* Deterministic PRNG so seeded data is stable between reloads */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORGANIZER = { id: 'org-1', name: 'TechCorp LLC', email: 'organizer@techcorp.kz' };

const REFUND_STD =
  'Full refund up to 7 days before the event. 50% refund between 7 and 2 days before. No refunds within 48 hours of the start time, except if the event is cancelled — then every paid order is refunded automatically within 10 business days.';

function seedEvents(): EventFormData[] {
  return [
    {
      id: 'evt-101',
      slug: 'astana-digital-forum-2026',
      title: 'Astana Digital Forum 2026',
      category: 'Technology & IT',
      description:
        'Two stages, 40 speakers and a startup alley. Product, AI and fintech leaders from across Central Asia share what is working right now in the region.',
      eventDate: '2026-11-21T10:00',
      regWindow: '2026-11-20T23:59',
      mediaUrl: '',
      venue: 'Astana Hub (Mangilik El C5.1)',
      venueAddress: 'Mangilik El Ave. 55/11, Astana',
      city: 'Astana',
      timezone: 'Asia/Almaty',
      maxCapacity: 400,
      tickets: [
        { id: 't-101-std', name: 'Standard Pass', type: 'Paid', price: 5600, quantity: 300, limitPerOrder: 5 },
        { id: 't-101-vip', name: 'VIP Pass', type: 'Paid', price: 18000, quantity: 60, limitPerOrder: 2 },
        { id: 't-101-stu', name: 'Student', type: 'Paid', price: 2500, quantity: 40, limitPerOrder: 1, hidden: false },
      ],
      visibility: 'Public',
      status: 'Published',
      refundPolicy: REFUND_STD,
      organizerId: ORGANIZER.id,
      organizerName: ORGANIZER.name,
      organizerEmail: ORGANIZER.email,
      seatingMode: 'GeneralAdmission',
      createdAt: '2026-09-02T09:12',
    },
    {
      id: 'evt-102',
      slug: 'dombra-night-barys-arena',
      title: 'Dombra Night: Live at Barys Arena',
      category: 'Music & Concerts',
      description:
        'An evening of modern and traditional Kazakh music with a 30-piece orchestra. Assigned seating — choose your seats on the interactive map.',
      eventDate: '2026-12-05T19:00',
      regWindow: '2026-12-05T18:00',
      mediaUrl: '',
      venue: 'Barys Arena',
      venueAddress: 'Turan Ave. 57, Astana',
      city: 'Astana',
      timezone: 'Asia/Almaty',
      maxCapacity: 96,
      tickets: [
        { id: 't-102-a', name: 'Parterre', type: 'Paid', price: 12000, quantity: 48, limitPerOrder: 6 },
        { id: 't-102-b', name: 'Balcony', type: 'Paid', price: 7000, quantity: 48, limitPerOrder: 6 },
      ],
      visibility: 'Public',
      status: 'Published',
      refundPolicy: REFUND_STD,
      organizerId: ORGANIZER.id,
      organizerName: ORGANIZER.name,
      organizerEmail: ORGANIZER.email,
      seatingMode: 'AssignedSeating',
      seatingLayoutId: 'layout-hall-96',
      createdAt: '2026-09-15T14:40',
    },
    {
      id: 'evt-103',
      slug: 'founders-breakfast-almaty',
      title: 'Founders Breakfast Almaty',
      category: 'Business & Networking',
      description: 'A free monthly meetup for early-stage founders. Coffee, 3 short talks and open networking.',
      eventDate: '2026-11-28T09:00',
      regWindow: '2026-11-27T20:00',
      mediaUrl: '',
      venue: 'Central Park Open Stage',
      venueAddress: 'Gogol St. 1, Almaty',
      city: 'Almaty',
      timezone: 'Asia/Almaty',
      maxCapacity: 120,
      tickets: [{ id: 't-103-free', name: 'Free Registration', type: 'Free', price: 0, quantity: 120, limitPerOrder: 2 }],
      visibility: 'Public',
      status: 'Published',
      refundPolicy: 'Free event — you can cancel your registration at any time from My Tickets.',
      organizerId: ORGANIZER.id,
      organizerName: ORGANIZER.name,
      organizerEmail: ORGANIZER.email,
      seatingMode: 'GeneralAdmission',
      createdAt: '2026-10-01T08:00',
    },
    {
      id: 'evt-104',
      slug: 'expo-run-10k',
      title: 'EXPO Run 10K',
      category: 'Sports & Health',
      description: 'City run around the EXPO district. 5K and 10K distances, timing chips and a finisher medal.',
      eventDate: '2027-01-18T08:30',
      regWindow: '2027-01-15T23:59',
      mediaUrl: '',
      venue: 'EXPO Congress Center',
      venueAddress: 'Mangilik El Ave. 53/1, Astana',
      city: 'Astana',
      timezone: 'Asia/Almaty',
      maxCapacity: 800,
      tickets: [
        { id: 't-104-5k', name: '5K', type: 'Paid', price: 4000, quantity: 400, limitPerOrder: 4 },
        { id: 't-104-10k', name: '10K', type: 'Paid', price: 6500, quantity: 400, limitPerOrder: 4 },
      ],
      visibility: 'Public',
      status: 'Published',
      refundPolicy: REFUND_STD,
      organizerId: ORGANIZER.id,
      organizerName: ORGANIZER.name,
      organizerEmail: ORGANIZER.email,
      seatingMode: 'GeneralAdmission',
      createdAt: '2026-10-11T10:00',
    },
    {
      id: 'evt-105',
      slug: 'shymkent-art-week',
      title: 'Shymkent Contemporary Art Week',
      category: 'Culture & Arts',
      description: 'Gallery walk and artist talks. Free entry with registration.',
      eventDate: '2026-10-10T12:00',
      regWindow: '2026-10-09T23:59',
      mediaUrl: '',
      venue: 'Online Stream (Zoom/YouTube)',
      venueAddress: 'https://youtube.com/@biletflow',
      city: 'Shymkent',
      timezone: 'Asia/Almaty',
      maxCapacity: 200,
      tickets: [{ id: 't-105-free', name: 'Free Entry', type: 'Free', price: 0, quantity: 200, limitPerOrder: 2 }],
      visibility: 'Public',
      status: 'Completed',
      refundPolicy: 'Free event.',
      organizerId: ORGANIZER.id,
      organizerName: ORGANIZER.name,
      organizerEmail: ORGANIZER.email,
      seatingMode: 'GeneralAdmission',
      createdAt: '2026-08-20T10:00',
    },
    {
      id: 'evt-106',
      slug: 'crypto-astana-conference-2026',
      title: 'Crypto Astana Conference 2026',
      category: 'Technology & IT',
      description: 'Blockchain regulation and digital assets in the AIFC.',
      eventDate: '2026-12-12T11:00',
      regWindow: '2026-12-11T23:59',
      mediaUrl: '',
      venue: 'EXPO Congress Center',
      venueAddress: 'Mangilik El Ave. 53/1, Astana',
      city: 'Astana',
      timezone: 'Asia/Almaty',
      maxCapacity: 300,
      tickets: [{ id: 't-106-std', name: 'Delegate', type: 'Paid', price: 25000, quantity: 300, limitPerOrder: 3 }],
      visibility: 'Public',
      status: 'Cancelled',
      refundPolicy: REFUND_STD,
      organizerId: 'org-2',
      organizerName: 'Chain Events KZ',
      organizerEmail: 'hello@chainevents.kz',
      seatingMode: 'GeneralAdmission',
      createdAt: '2026-09-28T10:00',
      reported: true,
    },
  ];
}

const FIRST = ['Alex', 'Dana', 'Aruzhan', 'Nursultan', 'Aigerim', 'Timur', 'Madina', 'Yerlan', 'Saule', 'Daulet', 'Kamila', 'Arman'];
const LAST = ['Nurmanov', 'Saparova', 'Bekova', 'Abenov', 'Zhaksybek', 'Ospanov', 'Kassymova', 'Iskakov', 'Tulegenova', 'Akhmetov'];

function seedOrders(events: EventFormData[], rand: () => number): Order[] {
  const orders: Order[] = [];
  let n = 1000;
  const plan: Record<string, number> = { 'evt-101': 70, 'evt-102': 26, 'evt-103': 45, 'evt-104': 30, 'evt-105': 80, 'evt-106': 14 };
  for (const evt of events) {
    const count = plan[evt.id!] ?? 0;
    const created = new Date(evt.createdAt ?? '2026-09-01T00:00').getTime();
    const end = Math.min(new Date(evt.eventDate).getTime(), new Date('2026-11-13T20:00').getTime());
    for (let i = 0; i < count; i++) {
      const tier = evt.tickets[Math.floor(rand() * evt.tickets.length)];
      const first = FIRST[Math.floor(rand() * FIRST.length)];
      const last = LAST[Math.floor(rand() * LAST.length)];
      const qty = tier.limitPerOrder > 1 && rand() > 0.75 ? 2 : 1;
      const ts = new Date(created + rand() * (end - created));
      const usePromo = tier.type === 'Paid' && rand() > 0.78;
      const promo = usePromo ? (rand() > 0.5 ? 'EARLY20' : 'HUBQR') : undefined;
      const unit = tier.price;
      const gross = unit * qty;
      const discount = promo === 'EARLY20' ? Math.round(gross * 0.2) : promo === 'HUBQR' ? Math.min(1000 * qty, gross) : 0;
      const r = rand();
      let status: Order['status'] = tier.type === 'Free' ? 'Registered' : 'Paid';
      if (evt.status === 'Cancelled') status = tier.type === 'Free' ? 'Cancelled' : 'Refunded';
      else if (r > 0.94) status = tier.type === 'Free' ? 'Cancelled' : 'Refunded';
      else if (r > 0.9 && evt.status !== 'Completed') status = 'Reserved';
      const checkedIn = evt.status === 'Completed' ? (status === 'Registered' || status === 'Paid') && rand() > 0.22 : false;
      let seats: string[] | undefined;
      if (evt.seatingMode === 'AssignedSeating') {
        seats = [];
        for (let q = 0; q < qty; q++) {
          const sectionId = tier.id === 't-102-a' ? 'P' : 'B';
          seats.push(`${sectionId}-${1 + ((i * 3 + q) % 4)}-${1 + ((i * 5 + q * 7) % 12)}`);
        }
      }
      orders.push({
        id: `ORD-${n++}`,
        eventId: evt.id!,
        ticketTypeId: tier.id,
        ticketTypeName: tier.name,
        attendeeName: `${first} ${last}`,
        attendeeEmail: `${first}.${last}${i}@mail.kz`.toLowerCase(),
        attendeePhone: `+7 701 ${String(100 + i).padStart(3, '0')} ${String(10 + (i % 89)).padStart(2, '0')} ${String(10 + ((i * 7) % 89)).padStart(2, '0')}`,
        quantity: qty,
        unitPrice: unit,
        discount,
        total: gross - discount,
        promoCode: promo,
        status,
        checkedIn,
        checkedInAt: checkedIn ? evt.eventDate : undefined,
        createdAt: ts.toISOString(),
        seats,
      });
    }
  }
  // dedupe seats so seeded assigned-seat orders never collide
  const taken = new Set<string>();
  for (const o of orders) {
    if (!o.seats) continue;
    o.seats = o.seats.filter((s) => (taken.has(s) ? false : (taken.add(s), true)));
    if (o.seats.length === 0) o.status = 'Cancelled';
  }
  return orders;
}

function seed(): MockDb {
  const rand = mulberry32(42);
  const events = seedEvents();
  const orders = seedOrders(events, rand);
  const payments: Payment[] = orders
    .filter((o) => o.unitPrice > 0)
    .map((o, i) => ({
      id: `PAY-${5000 + i}`,
      orderId: o.id,
      eventId: o.eventId,
      amount: o.total,
      method: (['Kaspi', 'Card', 'Halyk'] as const)[i % 3],
      status: o.status === 'Refunded' ? 'Refunded' : i % 23 === 0 ? 'Failed' : i % 37 === 0 ? 'Disputed' : 'Succeeded',
      failureReason: i % 23 === 0 ? (i % 2 ? 'Insufficient funds' : '3-D Secure timeout') : undefined,
      createdAt: o.createdAt,
    }));
  const disputes: Dispute[] = payments
    .filter((p) => p.status === 'Disputed')
    .map((p, i) => ({ id: `DSP-${300 + i}`, paymentId: p.id, amount: p.amount, reason: i % 2 ? 'Product not received' : 'Duplicate charge', status: 'Open', openedAt: p.createdAt }));

  const audit: AuditEntry[] = [];
  let a = 1;
  for (const e of events) {
    audit.push({ id: `AUD-${a++}`, eventId: e.id!, timestamp: e.createdAt!, actor: e.organizerEmail!, action: 'EVENT_CREATED', entity: e.title, description: 'Event draft created via wizard' });
    const pub = new Date(new Date(e.createdAt!).getTime() + 86400000).toISOString();
    audit.push({ id: `AUD-${a++}`, eventId: e.id!, timestamp: pub, actor: e.organizerEmail!, action: 'EVENT_PUBLISHED', entity: e.title, description: 'Event published and visible in catalog' });
    if (e.status === 'Cancelled')
      audit.push({ id: `AUD-${a++}`, eventId: e.id!, timestamp: '2026-11-02T12:00:00.000Z', actor: e.organizerEmail!, action: 'EVENT_CANCELLED', entity: e.title, description: 'Event cancelled: venue unavailable. All paid orders refunded.' });
  }
  for (const o of orders.filter((x) => x.status === 'Refunded').slice(0, 12))
    audit.push({ id: `AUD-${a++}`, eventId: o.eventId, timestamp: o.createdAt, actor: ORGANIZER.email, action: 'ORDER_REFUNDED', entity: o.id, description: `Full refund issued to ${o.attendeeName}` });
  audit.push({ id: `AUD-${a++}`, eventId: 'evt-101', timestamp: '2026-10-05T10:00:00.000Z', actor: ORGANIZER.email, action: 'PROMO_CREATED', entity: 'EARLY20', description: 'Promo code EARLY20 (20%) created' });
  audit.push({ id: `AUD-${a++}`, eventId: 'evt-101', timestamp: '2026-10-06T11:30:00.000Z', actor: ORGANIZER.email, action: 'STAFF_ASSIGNED', entity: 'scanner1@techcorp.kz', description: 'Check-in access granted' });

  return {
    events,
    orders,
    promos: [
      { code: 'EARLY20', eventId: 'evt-101', kind: 'percent', value: 20, maxRedemptions: 100, redemptions: 14, expiresAt: '2026-12-31T23:59', campaign: 'Early bird' },
      { code: 'HUBQR', eventId: 'evt-101', kind: 'fixed', value: 1000, maxRedemptions: 50, redemptions: 9, expiresAt: '2026-12-31T23:59', campaign: 'Astana Hub posters' },
      { code: 'OLDCODE', eventId: 'evt-101', kind: 'percent', value: 50, maxRedemptions: 10, redemptions: 2, expiresAt: '2026-10-01T00:00', campaign: 'Summer teaser' },
      { code: 'SOLDOUT', eventId: 'evt-101', kind: 'percent', value: 30, maxRedemptions: 5, redemptions: 5, expiresAt: '2026-12-31T23:59', campaign: 'Influencers' },
      { code: 'DOMBRA10', eventId: 'evt-102', kind: 'percent', value: 10, maxRedemptions: 200, redemptions: 4, expiresAt: '2026-12-05T18:00', campaign: 'Radio spot' },
      { code: 'RUN15', eventId: 'evt-104', kind: 'percent', value: 15, maxRedemptions: 100, redemptions: 3, expiresAt: '2027-01-10T23:59', campaign: 'Running club' },
    ],
    audit,
    staff: [
      { id: 'stf-1', eventId: 'evt-101', email: 'scanner1@techcorp.kz', name: 'Arman Iskakov', assignedAt: '2026-10-06T11:30:00.000Z' },
      { id: 'stf-2', eventId: 'evt-102', email: 'door@techcorp.kz', name: 'Saule Bekova', assignedAt: '2026-10-20T09:00:00.000Z' },
    ],
    users: [
      { id: 'u-1', name: 'TechCorp LLC', email: ORGANIZER.email, role: 'Organizer', status: 'Active', createdAt: '2026-06-01' },
      { id: 'u-2', name: 'Chain Events KZ', email: 'hello@chainevents.kz', role: 'Organizer', status: 'Active', createdAt: '2026-07-14' },
      { id: 'u-3', name: 'Alex Nurmanov', email: 'alex@example.com', role: 'Attendee', status: 'Active', createdAt: '2026-08-02' },
      { id: 'u-4', name: 'Dana Saparova', email: 'dana@example.com', role: 'Attendee', status: 'Active', createdAt: '2026-08-09' },
      { id: 'u-5', name: 'Arman Iskakov', email: 'scanner1@techcorp.kz', role: 'Event Admin', status: 'Active', createdAt: '2026-10-06' },
      { id: 'u-6', name: 'Saule Bekova', email: 'door@techcorp.kz', role: 'Event Admin', status: 'Active', createdAt: '2026-10-20' },
      { id: 'u-7', name: 'Spam Promoter', email: 'cheap-tix@spam.io', role: 'Organizer', status: 'Suspended', createdAt: '2026-09-30' },
      { id: 'u-8', name: 'Aigerim Ospanova', email: 'aigerim@mail.kz', role: 'Attendee', status: 'Active', createdAt: '2026-10-02' },
      { id: 'u-9', name: 'Platform Ops', email: 'ops@biletflow.kz', role: 'Platform Admin', status: 'Active', createdAt: '2026-01-01' },
    ],
    payments,
    activations: [
      {
        id: 'ACT-11', organizerName: 'TechCorp LLC', organizerEmail: ORGANIZER.email, binIin: '190340012345', bankName: 'Kaspi Bank', payoutMasked: 'KZ** **** **** 4417', feePaid: 5000, status: 'Pending', submittedAt: '2026-11-10T09:20:00.000Z',
        log: [
          { at: '2026-11-10T09:20:00.000Z', message: 'Checklist submitted (3/3)' },
          { at: '2026-11-10T09:21:00.000Z', message: 'Activation fee 5 000 ₸ captured (sandbox)' },
          { at: '2026-11-10T09:21:30.000Z', message: 'BIN lookup: registered legal entity — match' },
        ],
      },
      {
        id: 'ACT-12', organizerName: 'Chain Events KZ', organizerEmail: 'hello@chainevents.kz', binIin: '200540067890', bankName: 'Halyk Bank', payoutMasked: 'KZ** **** **** 0932', feePaid: 5000, status: 'Pending', submittedAt: '2026-11-12T15:02:00.000Z',
        log: [
          { at: '2026-11-12T15:02:00.000Z', message: 'Checklist submitted (3/3)' },
          { at: '2026-11-12T15:03:00.000Z', message: 'BIN lookup: name mismatch — manual review required' },
        ],
      },
    ],
    disputes,
    reports: [
      { id: 'REP-1', eventId: 'evt-106', eventTitle: 'Crypto Astana Conference 2026', reporterEmail: 'aigerim@mail.kz', reason: 'Misleading investment promises in description', status: 'Open', createdAt: '2026-11-01T10:00:00.000Z' },
      { id: 'REP-2', eventId: 'evt-104', eventTitle: 'EXPO Run 10K', reporterEmail: 'alex@example.com', reason: 'Duplicate listing?', status: 'Open', createdAt: '2026-11-11T18:40:00.000Z' },
    ],
    platformThreads: [
      {
        id: 'PST-1', organizerEmail: ORGANIZER.email, organizerName: ORGANIZER.name, category: 'Payout', subject: 'Payout for October not received', status: 'Escalated', createdAt: '2026-11-08T10:00:00.000Z',
        messages: [
          { id: 'm1', author: 'Organizer', authorName: 'TechCorp LLC', body: 'Our October payout is 3 days late. Can you check?', at: '2026-11-08T10:00:00.000Z' },
          { id: 'm2', author: 'Platform', authorName: 'BiletFlow Support', body: 'Escalated to finance — the bank returned the transfer. Please confirm your IBAN.', at: '2026-11-08T12:15:00.000Z' },
        ],
      },
    ],
    notifications: [
      { id: 'n1', kind: 'ticket', title: 'Your ticket is ready', body: 'Astana Digital Forum 2026 — Standard Pass ×1', createdAt: '2026-11-12T10:00:00.000Z', read: false, audience: 'Attendee', link: '/events/astana-digital-forum-2026' },
      { id: 'n2', kind: 'event_update', title: 'Event updated', body: 'Founders Breakfast Almaty moved to 09:00', createdAt: '2026-11-11T08:00:00.000Z', read: false, audience: 'Attendee', link: '/events/founders-breakfast-almaty' },
      { id: 'n3', kind: 'event_cancelled', title: 'Event cancelled', body: 'Crypto Astana Conference 2026 was cancelled. Refund on its way.', createdAt: '2026-11-02T12:00:00.000Z', read: true, audience: 'Attendee' },
      { id: 'n4', kind: 'refund', title: 'Refund processed', body: '25 000 ₸ returned to your Kaspi card', createdAt: '2026-11-03T09:00:00.000Z', read: true, audience: 'Attendee' },
      { id: 'n5', kind: 'payout', title: 'Payout scheduled', body: 'November payout 412 300 ₸ scheduled for 2026-11-20', createdAt: '2026-11-12T09:00:00.000Z', read: false, audience: 'Organizer' },
      { id: 'n6', kind: 'support', title: 'Support replied', body: 'BiletFlow Support replied to “Payout for October not received”', createdAt: '2026-11-08T12:15:00.000Z', read: false, audience: 'Organizer' },
      { id: 'n7', kind: 'support', title: 'New escalation', body: 'PST-1 escalated by support agent', createdAt: '2026-11-08T12:16:00.000Z', read: false, audience: 'Platform Admin', link: '/admin' },
      { id: 'n8', kind: 'event_update', title: 'Staff assignment', body: 'You were assigned as check-in staff for Astana Digital Forum 2026', createdAt: '2026-10-06T11:30:00.000Z', read: false, audience: 'Event Admin', link: '/scanner' },
    ],
    settings: {
      activationFeeKzt: 5000,
      serviceFeePercent: 5,
      reservationHoldMinutes: 10,
      maxTicketsPerOrder: 10,
      supportEmail: 'support@biletflow.kz',
      payoutDelayDays: 7,
    },
    seatHolds: [],
  };
}

function load(): MockDb {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    /* storage unavailable — fall back to fresh seed */
  }
  return seed();
}

export const db: MockDb = load();

type Listener = () => void;
const listeners = new Set<Listener>();

/** Persist + notify subscribers (used by hooks to refetch after mutations). */
export function commit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function resetMockDb() {
  const fresh = seed();
  (Object.keys(fresh) as (keyof MockDb)[]).forEach((k) => {
    (db as unknown as Record<string, unknown>)[k] = fresh[k];
  });
  commit();
}

let idCounter = Date.now() % 100000;
export const nextId = (prefix: string) => `${prefix}-${(idCounter++).toString(36).toUpperCase()}`;
export const nowIso = () => new Date().toISOString();
export const CURRENT_ORGANIZER = ORGANIZER;
