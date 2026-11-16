import { useEffect, useState } from 'react';
import { applyPromo } from '../api/orders';
import { useRoute } from '../router';
import type { PromoValidationResult } from '../types';

export type CampaignPromoState =
  | { status: 'idle' }
  | { status: 'checking'; code: string }
  | { status: 'applied'; result: PromoValidationResult; source: 'promo' | 'campaign' }
  | { status: 'error'; result: PromoValidationResult; source: 'promo' | 'campaign' };

/**
 * Module 1.3 — Campaign QR auto-apply.
 * Reads `?promo=CODE` or `?campaign=CODE` once per event landing, validates it via
 * POST /api/v1/orders/apply-promo and exposes the outcome for the banner + ticket selector.
 */
export function useCampaignPromo(eventId: string | undefined) {
  const { query } = useRoute();
  const promoParam = query.get('promo');
  const campaignParam = query.get('campaign');
  const code = (promoParam ?? campaignParam ?? '').trim();
  const source: 'promo' | 'campaign' = promoParam ? 'promo' : 'campaign';
  const [state, setState] = useState<CampaignPromoState>({ status: 'idle' });

  useEffect(() => {
    if (!eventId || !code) return;
    let alive = true;
    setState({ status: 'checking', code });
    applyPromo(eventId, code)
      .then((result) => alive && setState(result.valid ? { status: 'applied', result, source } : { status: 'error', result, source }))
      .catch(() => alive && setState({ status: 'error', result: { valid: false, code, reason: 'NOT_FOUND' }, source }));
    return () => {
      alive = false;
    };
    // intentionally keyed on event + code only: re-applies if a different QR is opened
  }, [eventId, code, source]);

  return { state, dismiss: () => setState({ status: 'idle' }) };
}
