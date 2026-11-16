import React, { useState } from 'react';
import { applyPromo, computeDiscount } from '../../api/orders';
import { useTranslation } from '../../i18n';
import type { EventFormData, PromoValidationResult } from '../../types';
import { formatKZT } from '../../utils/format';
import { Button, Field, Notice, Receipt, Stamp, Stepper, TicketStub } from '../ui';

export interface Selection {
  ticketId: string;
  quantity: number;
}

export function promoErrorKey(reason?: PromoValidationResult['reason']) {
  return `promo.error_${reason ?? 'NOT_FOUND'}`;
}

/**
 * Ticket selector widget: tier rows with steppers (respecting limitPerOrder + remaining stock,
 * Sold Out state), promo code entry, and a receipt summary. One ticket type per order.
 */
export const TicketSelector: React.FC<{
  event: EventFormData;
  availability: Record<string, number>;
  selection: Selection | null;
  onSelectionChange: (s: Selection | null) => void;
  promo: PromoValidationResult | null;
  onPromoChange: (p: PromoValidationResult | null) => void;
  disabledReason?: string;
  onCheckout: () => void;
  checkoutBusy?: boolean;
  /** assigned-seating mode: quantity comes from seat selection */
  seatMode?: { seats: string[]; ticketId: string | null };
}> = ({ event, availability, selection, onSelectionChange, promo, onPromoChange, disabledReason, onCheckout, checkoutBusy, seatMode }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [promoError, setPromoError] = useState<string>();

  const tickets = event.tickets.filter((x) => !x.hidden);
  const activeTicketId = seatMode ? seatMode.ticketId : selection?.ticketId;
  const quantity = seatMode ? seatMode.seats.length : selection?.quantity ?? 0;
  const tier = tickets.find((x) => x.id === activeTicketId);
  const subtotal = tier ? tier.price * quantity : 0;
  const discount = tier && tier.price > 0 ? computeDiscount(subtotal, quantity, promo) : 0;
  const total = subtotal - discount;
  const anyPaid = tickets.some((x) => x.type === 'Paid' && x.price > 0);

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !event.id) return;
    setChecking(true);
    setPromoError(undefined);
    try {
      const r = await applyPromo(event.id, code);
      if (r.valid) {
        onPromoChange(r);
        setCode('');
      } else setPromoError(t(promoErrorKey(r.reason), { code: r.code }));
    } catch {
      setPromoError(t('common.error'));
    } finally {
      setChecking(false);
    }
  };

  const setQty = (ticketId: string, q: number) => onSelectionChange(q <= 0 ? null : { ticketId, quantity: q });

  return (
    <section className="selector" aria-labelledby="selector-title">
      <h2 id="selector-title">{t('selector.title')}</h2>
      {disabledReason && <Notice tone="warning">{disabledReason}</Notice>}

      {!seatMode && (
        <ul className="selector" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={t('selector.tiers')}>
          {tickets.map((tk) => {
            const left = availability[tk.id] ?? tk.quantity;
            const soldOut = left <= 0;
            const max = Math.min(tk.limitPerOrder || 10, left);
            const qty = selection?.ticketId === tk.id ? selection.quantity : 0;
            return (
              <li key={tk.id} className="selector__row">
                <TicketStub
                  soldOut={soldOut}
                  left={
                    <div className="tier-left">
                      <span className="bf-stub__price">{tk.type === 'Free' || tk.price === 0 ? t('common.free') : formatKZT(tk.price)}</span>
                      <small>{t('selector.maxPerOrder', { n: tk.limitPerOrder })}</small>
                    </div>
                  }
                >
                  <div>
                    <div className="bf-stub__name">{tk.name}</div>
                    <div className="mono-sm muted">
                      {soldOut ? t('selector.soldOut') : left <= 10 ? t('selector.fewLeft', { n: left }) : t('selector.available')}
                    </div>
                  </div>
                  {soldOut ? (
                    <Stamp tone="danger">{t('selector.soldOutStamp')}</Stamp>
                  ) : (
                    <Stepper
                      label={tk.name}
                      value={qty}
                      max={max}
                      disabled={!!disabledReason}
                      onChange={(v) => setQty(tk.id, v)}
                    />
                  )}
                </TicketStub>
              </li>
            );
          })}
        </ul>
      )}

      {selection && !seatMode && tickets.length > 1 && <p className="mono-sm muted">{t('selector.oneTypeNote')}</p>}

      {anyPaid && (
        <div>
          {promo?.valid ? (
            <Notice
              tone="promo"
              title={t('promo.appliedTitle', { code: promo.code })}
              action={
                <Button variant="link" onClick={() => onPromoChange(null)}>
                  {t('promo.remove')}
                </Button>
              }
            >
              {promo.kind === 'percent' ? t('promo.percentOff', { value: promo.value ?? 0 }) : t('promo.fixedOff', { value: formatKZT(promo.value ?? 0) })}
            </Notice>
          ) : (
            <form className="promo-form" onSubmit={submitPromo}>
              <Field label={t('promo.label')} error={promoError}>
                <input className="bf-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EARLY20" autoComplete="off" style={{ fontFamily: 'var(--bf-mono)' }} />
              </Field>
              <Button variant="secondary" type="submit" loading={checking} disabled={!code.trim()}>
                {t('promo.apply')}
              </Button>
            </form>
          )}
        </div>
      )}

      <Receipt
        title={t('receipt.title')}
        rows={[
          ...(tier && quantity > 0
            ? [{ label: `${tier.name} × ${quantity}`, value: tier.price ? formatKZT(subtotal) : t('common.free') }]
            : [{ label: t('receipt.nothing'), value: '—', tone: 'muted' as const }]),
          ...(seatMode && seatMode.seats.length ? [{ label: t('receipt.seats'), value: seatMode.seats.join(', '), tone: 'muted' as const }] : []),
          ...(discount > 0 ? [{ label: t('receipt.discount', { code: promo?.code ?? '' }), value: `−${formatKZT(discount)}`, tone: 'discount' as const }] : []),
        ]}
        totalLabel={t('receipt.total')}
        total={tier && tier.price === 0 ? t('common.free') : formatKZT(total)}
        footer={
          <Button full size="lg" disabled={!tier || quantity === 0 || !!disabledReason} loading={checkoutBusy} onClick={onCheckout}>
            {tier && tier.price === 0 ? t('selector.register') : tier ? t('selector.pay', { amount: formatKZT(total) }) : t('selector.choose')}
          </Button>
        }
      />
    </section>
  );
};
