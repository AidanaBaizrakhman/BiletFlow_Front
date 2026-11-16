import React, { useState } from 'react';
import { confirmCheckIn, scanTicket, type ScanOutcome } from '../../api/orders';
import { useTranslation } from '../../i18n';
import { Button, Field, ScanResult, useToast } from '../ui';

/** Demo payloads the "Simulate Scan" button cycles through so every verdict screen is testable. */
const DEMO_SCANS = ['ORD-1000', 'ORD-1171', 'HUBQR', 'TICK-UNKNOWN'];

export const EventAdminView: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ScanOutcome | null>(null);
  const [query, setQuery] = useState('');
  const [demoIdx, setDemoIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const runScan = async (raw: string) => {
    setBusy(true);
    try {
      const r = await scanTicket(raw);
      setResult(r);
      setShowResult(true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (result?.kind !== 'valid') return;
    await confirmCheckIn(result.order.id);
    alert('Check-in confirmed!');
    toast(t('scanner.checkedInToast', { name: result.order.attendeeName }));
    setResult({ kind: 'used', order: { ...result.order, checkedIn: true } });
  };

  return (
    <div className="role-view active-view">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">{t('role.Event Admin')}</span>
          <h1 style={{ fontSize: 34 }}>{t('scanner.title')}</h1>
        </div>
      </div>
      <div className="grid-2">
        <section className="paper" aria-labelledby="cam-h" style={{ textAlign: 'center' }}>
          <h2 id="cam-h" style={{ fontSize: 18 }}>{t('scanner.camera')}</h2>
          <div
            aria-hidden="true"
            style={{ margin: '18px auto', width: 200, height: 200, border: '2px dashed var(--bf-ink)', borderRadius: 8, display: 'grid', placeItems: 'center', font: '12px var(--bf-mono)' }}
          >
            [ QR ]
          </div>
          <p className="mono-sm muted" style={{ marginBottom: 14 }}>{t('scanner.point')}</p>
          <Button
            loading={busy}
            onClick={() => {
              runScan(DEMO_SCANS[demoIdx % DEMO_SCANS.length]);
              setDemoIdx((i) => i + 1);
            }}
          >
            {t('scanner.simulate')}
          </Button>
        </section>

        <section aria-labelledby="lookup-h">
          <h2 id="lookup-h" style={{ fontSize: 18, marginBottom: 12 }}>{t('scanner.lookup')}</h2>
          <form
            className="promo-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) runScan(query);
            }}
          >
            <Field label={t('scanner.lookupLabel')}>
              <input type="text" placeholder={t('scanner.lookupPh')} className="text-input" value={query} onChange={(e) => setQuery(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy}>{t('scanner.search')}</Button>
          </form>

          <div style={{ marginTop: 18 }}>
            {showResult && result?.kind === 'valid' && (
              <ScanResult kind="valid" verdict={t('scanner.valid')}>
                <p><strong>{result.order.attendeeName}</strong></p>
                <p>{result.order.id} · {result.order.ticketTypeName} × {result.order.quantity}</p>
                {result.order.seats?.length ? <p>{result.order.seats.join(', ')}</p> : null}
                <Button variant="primary" onClick={confirm}>{t('scanner.confirm')}</Button>
              </ScanResult>
            )}
            {showResult && result?.kind === 'used' && (
              <ScanResult kind="used" verdict={t('scanner.used')}>
                <p><strong>{result.order.attendeeName}</strong> · {result.order.id}</p>
                <p>{t('scanner.usedAt', { at: result.order.checkedInAt ? new Date(result.order.checkedInAt).toLocaleString() : '—' })}</p>
              </ScanResult>
            )}
            {showResult && result?.kind === 'promo' && (
              <ScanResult kind="promo" verdict={t('scanner.promo')}>
                <p>{t('scanner.promoBody', { code: result.code })}</p>
              </ScanResult>
            )}
            {showResult && result?.kind === 'not_found' && (
              <ScanResult kind="not_found" verdict={t('scanner.notFound')}>
                <p>“{result.query}”</p>
              </ScanResult>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
