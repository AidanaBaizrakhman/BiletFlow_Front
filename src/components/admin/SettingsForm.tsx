import React, { useEffect, useState } from 'react';
import { getPlatformSettings, updatePlatformSettings } from '../../api/admin';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { PlatformSettings } from '../../types';
import { formatKZT } from '../../utils/format';
import { Button, ConfirmModal, ErrorState, Field, Loading, Notice, useToast } from '../ui';

type Errors = Partial<Record<keyof PlatformSettings, string>>;

/** Module 3.3 — Platform settings */
export const SettingsForm: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, loading, error, refetch } = useAsync(() => getPlatformSettings(), []);
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading || !form || !data) return <Loading />;

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(data);

  const validate = () => {
    const e: Errors = {};
    if (!Number.isInteger(form.activationFeeKzt) || form.activationFeeKzt < 0) e.activationFeeKzt = t('settings.errFee');
    if (form.serviceFeePercent < 0 || form.serviceFeePercent > 30) e.serviceFeePercent = t('settings.errPercent');
    if (form.reservationHoldMinutes < 2 || form.reservationHoldMinutes > 30) e.reservationHoldMinutes = t('settings.errHold');
    if (form.maxTicketsPerOrder < 1 || form.maxTicketsPerOrder > 50) e.maxTicketsPerOrder = t('settings.errMax');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)) e.supportEmail = t('settings.errEmail');
    if (form.payoutDelayDays < 0 || form.payoutDelayDays > 60) e.payoutDelayDays = t('settings.errDelay');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setBusy(true);
    try {
      await updatePlatformSettings(form);
      toast(t('settings.saved'));
      setConfirm(false);
    } catch (x) {
      toast((x as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const num = (k: keyof PlatformSettings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);

  return (
    <form
      className="paper"
      style={{ maxWidth: 760 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) setConfirm(true);
      }}
    >
      <h3 style={{ marginBottom: 6 }}>{t('settings.title')}</h3>
      <p className="mono-sm muted" style={{ marginBottom: 18 }}>{t('settings.desc')}</p>
      <div className="form-row">
        <Field label={t('settings.fee')} error={errors.activationFeeKzt} helper={t('settings.feeHelper', { current: formatKZT(data.activationFeeKzt) })}>
          <input type="number" min={0} step={500} className="bf-input" value={form.activationFeeKzt} onChange={num('activationFeeKzt')} />
        </Field>
        <Field label={t('settings.serviceFee')} error={errors.serviceFeePercent}>
          <input type="number" min={0} max={30} step={0.5} className="bf-input" value={form.serviceFeePercent} onChange={num('serviceFeePercent')} />
        </Field>
      </div>
      <div className="form-row">
        <Field label={t('settings.hold')} error={errors.reservationHoldMinutes} helper={t('settings.holdHelper')}>
          <input type="number" min={2} max={30} className="bf-input" value={form.reservationHoldMinutes} onChange={num('reservationHoldMinutes')} />
        </Field>
        <Field label={t('settings.maxTickets')} error={errors.maxTicketsPerOrder}>
          <input type="number" min={1} max={50} className="bf-input" value={form.maxTicketsPerOrder} onChange={num('maxTicketsPerOrder')} />
        </Field>
      </div>
      <div className="form-row">
        <Field label={t('settings.supportEmail')} error={errors.supportEmail}>
          <input type="email" className="bf-input" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
        </Field>
        <Field label={t('settings.payoutDelay')} error={errors.payoutDelayDays}>
          <input type="number" min={0} max={60} className="bf-input" value={form.payoutDelayDays} onChange={num('payoutDelayDays')} />
        </Field>
      </div>
      {dirty && <Notice tone="warning">{t('settings.unsaved')}</Notice>}
      <div className="wizard-actions">
        <Button variant="secondary" disabled={!dirty} onClick={() => { setForm(data); setErrors({}); }}>
          {t('settings.reset')}
        </Button>
        <Button type="submit" disabled={!dirty}>{t('settings.save')}</Button>
      </div>
      {confirm && (
        <ConfirmModal
          title={t('settings.confirmTitle')}
          body={
            form.activationFeeKzt !== data.activationFeeKzt
              ? t('settings.confirmFee', { from: formatKZT(data.activationFeeKzt), to: formatKZT(form.activationFeeKzt) })
              : t('settings.confirmBody')
          }
          confirmLabel={t('settings.save')}
          tone="primary"
          busy={busy}
          onConfirm={save}
          onClose={() => setConfirm(false)}
        />
      )}
    </form>
  );
};
