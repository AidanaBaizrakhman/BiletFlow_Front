export type Role = 'Attendee' | 'Organizer' | 'Event Admin' | 'Platform Admin';

export type TicketVisibility = 'Public' | 'Unlisted' | 'Private';

export type EventStatus = 'Draft' | 'Published' | 'Unpublished' | 'Cancelled' | 'Completed' | 'Suspended';

export type SeatingMode = 'GeneralAdmission' | 'AssignedSeating';

export interface TicketTypeConfig {
  id: string;
  name: string;
  type: 'Free' | 'Paid';
  price: number;
  quantity: number;
  limitPerOrder: number;
  /** Module 2.2 — hidden tiers stay configured but are not offered at public checkout */
  hidden?: boolean;
  saleStart?: string;
  saleEnd?: string;
}

export interface EventFormData {
  id?: string;
  title: string;
  category: string;
  description: string;
  eventDate: string;
  regWindow: string;
  mediaUrl: string;
  venue: string;
  venueAddress: string;
  maxCapacity: number;
  tickets: TicketTypeConfig[];
  visibility: TicketVisibility;
  attendeesCount?: number;
  // ---- Added for Modules 1, 2 & 5 (all optional so existing objects stay valid) ----
  slug?: string;
  status?: EventStatus;
  city?: string;
  timezone?: string;
  refundPolicy?: string;
  organizerId?: string;
  organizerName?: string;
  organizerEmail?: string;
  seatingMode?: SeatingMode;
  seatingLayoutId?: string;
  createdAt?: string;
  reported?: boolean;
}

export interface TicketOrder {
  id: string;
  eventId: string;
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketName: string;
  price: number;
  date: string;
  venue: string;
  // ---- Added (optional) ----
  quantity?: number;
  discount?: number;
  promoCode?: string;
  seats?: string[];
}

export interface SupportTicket {
  id: string;
  ticketOrderId?: string;
  attendeeName: string;
  attendeeEmail: string;
  subject: string;
  issueType: 'Email Re-send' | 'Refund Request' | 'General Support';
  status: 'Open' | 'Resolved';
  createdAt: string;
}

/* ===================== New domain types ===================== */

export type OrderStatus = 'Paid' | 'Registered' | 'Reserved' | 'Refunded' | 'Cancelled';

export interface Order {
  id: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  promoCode?: string;
  status: OrderStatus;
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
  seats?: string[];
}

export interface PromoCode {
  code: string;
  eventId: string;
  kind: 'percent' | 'fixed';
  value: number;
  maxRedemptions: number;
  redemptions: number;
  expiresAt: string;
  campaign?: string;
}

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'EXHAUSTED' | 'WRONG_EVENT';
  kind?: PromoCode['kind'];
  value?: number;
  campaign?: string;
}

export interface InventoryRow {
  ticketTypeId: string;
  name: string;
  hidden: boolean;
  capacity: number;
  available: number;
  reserved: number;
  sold: number;
  refunded: number;
  checkedIn: number;
}

export type AuditAction =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_UNPUBLISHED'
  | 'EVENT_CANCELLED'
  | 'TICKET_HIDDEN'
  | 'TICKET_UNHIDDEN'
  | 'ORDER_REFUNDED'
  | 'REGISTRATION_CANCELLED'
  | 'STAFF_ASSIGNED'
  | 'STAFF_REVOKED'
  | 'CHECK_IN'
  | 'PROMO_CREATED';

export interface AuditEntry {
  id: string;
  eventId: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  entity: string;
  description: string;
}

export interface StaffAssignment {
  id: string;
  eventId: string;
  email: string;
  name: string;
  assignedAt: string;
}

export type UserStatus = 'Active' | 'Suspended';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  eventId: string;
  amount: number;
  method: 'Kaspi' | 'Card' | 'Halyk';
  status: 'Succeeded' | 'Failed' | 'Refunded' | 'Disputed';
  failureReason?: string;
  createdAt: string;
}

export interface ActivationRequest {
  id: string;
  organizerName: string;
  organizerEmail: string;
  binIin: string;
  bankName: string;
  payoutMasked: string;
  feePaid: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  log: { at: string; message: string }[];
}

export interface Dispute {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: 'Open' | 'Won' | 'Lost';
  openedAt: string;
}

export interface EventReport {
  id: string;
  eventId: string;
  eventTitle: string;
  reporterEmail: string;
  reason: string;
  status: 'Open' | 'Dismissed' | 'Actioned';
  createdAt: string;
}

export type PlatformSupportCategory = 'Account' | 'Paid Activation' | 'Payout' | 'Technical';

export interface SupportMessage {
  id: string;
  author: 'Organizer' | 'Platform';
  authorName: string;
  body: string;
  at: string;
}

export interface PlatformSupportThread {
  id: string;
  organizerEmail: string;
  organizerName: string;
  category: PlatformSupportCategory;
  subject: string;
  status: 'Open' | 'Escalated' | 'Resolved';
  messages: SupportMessage[];
  createdAt: string;
}

export interface PlatformSettings {
  activationFeeKzt: number;
  serviceFeePercent: number;
  reservationHoldMinutes: number;
  maxTicketsPerOrder: number;
  supportEmail: string;
  payoutDelayDays: number;
}

export type NotificationKind = 'ticket' | 'event_update' | 'event_cancelled' | 'refund' | 'payout' | 'support';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  audience: Role;
  link?: string;
}

/* ===================== Seating (Module 5) ===================== */

export type SeatState = 'available' | 'selected' | 'held' | 'sold' | 'unavailable' | 'accessible';

export interface PriceTier {
  id: string;
  name: string;
  price: number;
}

export interface LayoutSeat {
  id: string; // e.g. "A-3-12"
  section: string;
  row: string;
  number: number;
  tierId: string;
  accessible?: boolean;
  unavailable?: boolean;
}

export interface VenueLayout {
  id: string;
  name: string;
  sections: { id: string; name: string; rows: { id: string; seats: LayoutSeat[] }[] }[];
  tiers: PriceTier[];
}

export interface SeatHold {
  seatId: string;
  eventId: string;
  holderId: string;
  expiresAt: number;
}

export interface AnalyticsFilter {
  eventId: string | 'all';
  ticketTypeId: string | 'all';
  from?: string;
  to?: string;
}

export interface AnalyticsSummary {
  totalCapacity: number;
  sold: number;
  remaining: number;
  pctSold: number;
  checkedIn: number;
  absent: number;
  checkInPct: number;
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
  salesByDay: { day: string; tickets: number; revenue: number }[];
  byTicketType: { name: string; tickets: number; revenue: number }[];
  campaigns: { code: string; campaign?: string; redemptions: number; tickets: number; net: number }[];
}
