import type { LayoutSeat, SeatState, VenueLayout } from '../types';
import { ApiError, call } from './client';
import { commit, db } from './mockDb';

/* -------- Predefined venue layouts (Module 5) -------- */

function buildHall96(): VenueLayout {
  const mk = (section: 'P' | 'B', tierId: string) =>
    Array.from({ length: 4 }, (_, r) => {
      const row = String(r + 1);
      return {
        id: `${section}-${row}`,
        seats: Array.from({ length: 12 }, (_, s): LayoutSeat => {
          const number = s + 1;
          return {
            id: `${section}-${row}-${number}`,
            section,
            row,
            number,
            tierId,
            accessible: section === 'P' && row === '4' && (number <= 2 || number >= 11),
            unavailable: section === 'P' && row === '1' && (number === 6 || number === 7), // camera platform
          };
        }),
      };
    });
  return {
    id: 'layout-hall-96',
    name: 'Concert hall · 96 seats (Parterre + Balcony)',
    tiers: [
      { id: 't-102-a', name: 'Parterre', price: 12000 },
      { id: 't-102-b', name: 'Balcony', price: 7000 },
    ],
    sections: [
      { id: 'P', name: 'Parterre', rows: mk('P', 't-102-a') },
      { id: 'B', name: 'Balcony', rows: mk('B', 't-102-b') },
    ],
  };
}

function buildStudio40(): VenueLayout {
  return {
    id: 'layout-studio-40',
    name: 'Studio · 40 seats (single tier)',
    tiers: [{ id: 'tier-std', name: 'Standard', price: 5000 }],
    sections: [
      {
        id: 'S',
        name: 'Stalls',
        rows: Array.from({ length: 4 }, (_, r) => ({
          id: `S-${r + 1}`,
          seats: Array.from({ length: 10 }, (_, s) => ({
            id: `S-${r + 1}-${s + 1}`, section: 'S', row: String(r + 1), number: s + 1, tierId: 'tier-std', accessible: r === 3 && s < 2,
          })),
        })),
      },
    ],
  };
}

export const LAYOUTS: VenueLayout[] = [buildHall96(), buildStudio40()];

export const findSeat = (layout: VenueLayout, seatId: string) =>
  layout.sections.flatMap((s) => s.rows.flatMap((r) => r.seats)).find((s) => s.id === seatId);

/** GET /api/v1/venue-layouts */
export function listLayouts() {
  return call('GET', '/api/v1/venue-layouts', () => LAYOUTS.map(({ id, name, tiers }) => ({ id, name, tiers })));
}

export function getLayoutSync(id?: string) {
  return LAYOUTS.find((l) => l.id === id);
}

/** Demo: other shoppers holding a few seats so the "held" state is visible */
function ensureDemoHolds(eventId: string) {
  const now = Date.now();
  if (eventId !== 'evt-102') return;
  if (db.seatHolds.some((h) => h.holderId === 'demo-other' && h.expiresAt > now)) return;
  ['P-2-5', 'P-2-6', 'B-1-9'].forEach((seatId) =>
    db.seatHolds.push({ seatId, eventId, holderId: 'demo-other', expiresAt: now + 30 * 60 * 1000 })
  );
}

/** GET /api/v1/events/:id/seats — state of every seat for this shopper */
export function getSeatStates(eventId: string, holderId: string) {
  return call<Record<string, SeatState>>('GET', `/api/v1/events/${eventId}/seats`, () => {
    const e = db.events.find((x) => x.id === eventId);
    const layout = getLayoutSync(e?.seatingLayoutId);
    if (!e || !layout) throw new ApiError(404, 'No seating layout');
    ensureDemoHolds(eventId);
    const now = Date.now();
    db.seatHolds = db.seatHolds.filter((h) => h.expiresAt > now); // auto-release expired holds
    const sold = new Set(
      db.orders.filter((o) => o.eventId === eventId && ['Paid', 'Reserved', 'Registered'].includes(o.status)).flatMap((o) => o.seats ?? [])
    );
    const out: Record<string, SeatState> = {};
    layout.sections.forEach((sec) =>
      sec.rows.forEach((row) =>
        row.seats.forEach((seat) => {
          const hold = db.seatHolds.find((h) => h.eventId === eventId && h.seatId === seat.id);
          out[seat.id] = seat.unavailable
            ? 'unavailable'
            : sold.has(seat.id)
              ? 'sold'
              : hold
                ? hold.holderId === holderId
                  ? 'selected'
                  : 'held'
                : seat.accessible
                  ? 'accessible'
                  : 'available';
        })
      )
    );
    return out;
  });
}

/** POST /api/v1/events/:id/seat-holds — hold seats until the reservation timer expires */
export function holdSeats(eventId: string, seatIds: string[], holderId: string, minutes: number) {
  return call('POST', `/api/v1/events/${eventId}/seat-holds`, () => {
    const now = Date.now();
    db.seatHolds = db.seatHolds.filter((h) => h.expiresAt > now && h.holderId !== holderId);
    const sold = new Set(db.orders.filter((o) => o.eventId === eventId && ['Paid', 'Reserved', 'Registered'].includes(o.status)).flatMap((o) => o.seats ?? []));
    const conflict = seatIds.find((s) => sold.has(s) || db.seatHolds.some((h) => h.eventId === eventId && h.seatId === s));
    if (conflict) throw new ApiError(409, `Seat ${conflict} was just taken`, 'SEAT_TAKEN');
    const expiresAt = now + minutes * 60 * 1000;
    seatIds.forEach((seatId) => db.seatHolds.push({ seatId, eventId, holderId, expiresAt }));
    commit();
    return { expiresAt };
  }, { seatIds, holderId });
}

/** DELETE /api/v1/seat-holds/:holderId — release on cancel/expiry */
export function releaseHolds(holderId: string) {
  return call('DELETE', `/api/v1/seat-holds/${holderId}`, () => {
    db.seatHolds = db.seatHolds.filter((h) => h.holderId !== holderId);
    commit();
    return { ok: true };
  });
}

/** Seats currently held (not expired) per layout tier — used by the inventory breakdown */
export function activeHoldsByTier(eventId: string): Record<string, number> {
  const e = db.events.find((x) => x.id === eventId);
  const layout = getLayoutSync(e?.seatingLayoutId);
  const out: Record<string, number> = {};
  if (!layout) return out;
  const now = Date.now();
  db.seatHolds
    .filter((h) => h.eventId === eventId && h.expiresAt > now)
    .forEach((h) => {
      const tier = findSeat(layout, h.seatId)?.tierId;
      if (tier) out[tier] = (out[tier] ?? 0) + 1;
    });
  return out;
}
