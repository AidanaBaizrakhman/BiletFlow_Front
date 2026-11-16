import React, { useState, useEffect } from 'react';
import type { EventFormData, PromoValidationResult, TicketOrder } from '../../types';
import { computeDiscount } from '../../api/orders';
import { useTranslation } from '../../i18n';
import { formatKZT } from '../../utils/format';
import { Button, Field, Modal, Receipt, Stamp } from '../ui';

interface CheckoutModalProps {
  event: EventFormData;
  onClose: () => void;
  onPaymentSuccess: (ticket: TicketOrder) => void;
  // ---- Optional additions (existing callers keep working unchanged) ----
  /** Pre-selected tier from the Ticket Selector */
  initialTicketId?: string;
  quantity?: number;
  /** Promo already validated (manual entry or Campaign QR auto-apply) */
  promo?: PromoValidationResult | null;
  /** Assigned seating: seats held for this checkout */
  seats?: string[];
  /** Epoch ms when the reservation/seat hold expires — drives the countdown */
  expiresAt?: number;
  /** Called when the countdown reaches 0 (before onClose) so holds can be released */
  onExpire?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  event,
  onClose,
  onPaymentSuccess,
  initialTicketId,
  quantity = 1,
  promo,
  seats,
  expiresAt,
  onExpire,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    initialTicketId || event.tickets[0]?.id || ''
  );
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) : 599
  ); // 09:59 countdown timer (or synced to seat-hold expiry)
  const [paymentError, setPaymentError] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          else onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const selectedTicket =
    event.tickets.find((t) => t.id === selectedTicketId) || event.tickets[0];

  const unitPrice = selectedTicket?.price || 0;
  const subtotal = unitPrice * quantity;
  const discount = unitPrice > 0 ? computeDiscount(subtotal, quantity, promo) : 0;
  const total = subtotal - discount;

  const handleSimulatePayment = (success: boolean) => {
    if (!name || !email || !phone) {
      setPaymentError(t('checkout.missingFields'));
      return;
    }

    if (success) {
      setPaymentError('');
      const newTicket: TicketOrder = {
        id: 'TICK-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        eventId: event.id || 'evt-1',
        eventName: event.title,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        ticketName: selectedTicket?.name || 'Standard Pass',
        price: total,
        date: event.eventDate || new Date().toLocaleDateString(),
        venue: event.venue,
        quantity,
        discount,
        promoCode: promo?.valid ? promo.code : undefined,
        seats,
      };
      onPaymentSuccess(newTicket);
    } else {
      setPaymentError(t('checkout.paymentFailed'));
    }
  };

  const urgent = timeLeft <= 60;
  const missing = (v: string) => (paymentError && !v ? t('checkout.required') : undefined);

  return (
    <Modal title={`${t('checkout.title')} — ${event.title}`} onClose={onClose} wide>
      <p className={`timer-badge${urgent ? ' is-urgent' : ''}`} role="timer" aria-live={urgent ? 'assertive' : 'off'}>
        {seats?.length ? t('checkout.seatsHeld') : t('checkout.ticketsHeld')} <strong>{formatTime(timeLeft)}</strong>
      </p>

      {paymentError && <div className="error-banner" role="alert">{paymentError}</div>}

      <form onSubmit={(e) => e.preventDefault()} className="checkout-grid" noValidate>
        <div>
          <h4>{t('checkout.selectTicket')}</h4>
          <Field label={t('checkout.ticketType')}>
            <select
              className="text-input"
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              disabled={!!seats?.length}
            >
              {event.tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.type === 'Free' ? 'FREE' : formatKZT(t.price)}
                </option>
              ))}
            </select>
          </Field>

          <h4>{t('checkout.contact')}</h4>
          <Field label={t('checkout.fullName')} required error={missing(name)}>
            <input
              type="text"
              className="text-input"
              required
              autoComplete="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="form-row">
            <Field label={t('checkout.email')} required error={missing(email)}>
              <input
                type="email"
                className="text-input"
                required
                autoComplete="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t('checkout.phone')} required error={missing(phone)}>
              <input
                type="tel"
                className="text-input"
                required
                autoComplete="tel"
                placeholder="+7 (7xx) xxx-xx-xx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>

          <div className="sandbox-payment-widget">
            <div className="spread">
              <h4 style={{ margin: 0 }}>{t('checkout.sandbox')}</h4>
              <Stamp tone="hold" straight>
                SANDBOX
              </Stamp>
            </div>
            <p className="modal-desc">{t('checkout.sandboxDesc')}</p>
            <div className="button-group">
              <Button variant="success" onClick={() => handleSimulatePayment(true)}>
                {t('checkout.simulateSuccess')}
              </Button>
              <Button variant="danger" onClick={() => handleSimulatePayment(false)}>
                {t('checkout.simulateFail')}
              </Button>
            </div>
          </div>
        </div>

        <Receipt
          title={t('receipt.title')}
          rows={[
            { label: `${selectedTicket?.name ?? ''} × ${quantity}`, value: unitPrice ? formatKZT(subtotal) : t('common.free') },
            ...(seats?.length ? [{ label: t('receipt.seats'), value: seats.join(', '), tone: 'muted' as const }] : []),
            ...(discount > 0 ? [{ label: t('receipt.discount', { code: promo?.code ?? '' }), value: `−${formatKZT(discount)}`, tone: 'discount' as const }] : []),
          ]}
          totalLabel={t('receipt.total')}
          total={unitPrice ? formatKZT(total) : t('common.free')}
        />
      </form>
    </Modal>
  );
};
