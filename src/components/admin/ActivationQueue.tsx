import React, { useState } from 'react';
import { adminDecideActivation, adminListActivations } from '../../api/admin';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { ActivationRequest } from '../../types';
import { downloadCsv } from '../../utils/csv';
import { formatKZT, formatTimestamp } from '../../utils/format';
import { Button, ConfirmModal, EmptyState, ErrorState, Field, Loading, Stamp, useToast } from '../ui';

/** Module 3.2 — Paid Sales Activation review queue (identity / payout verification + logs) */
export const ActivationQueue: React.FC = () => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const { data, loading, error, refetch } = useAsync(() => adminListActivations(), []);
  const [open, setOpen] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ a: ActivationRequest; status: 'Approved' | 'Rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      await adminDecideActivation(decision.a.id, decision.status, note);
      toast(t(decision.status === 'Approved' ? 'admin.actApproved' : 'admin.actRejected', { org: decision.a.organizerName }));
      setDecision(null);
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading && !data) return <Loading />;
  if (!data?.length) return <EmptyState title={t('admin.noActivations')} />;

  return (
    <div className="stack">
      <div className="spread">
        <p className="mono-sm muted">{t('admin.activationDesc')}</p>
        <Button variant="secondary" size="sm" onClick={() => downloadCsv('activations.csv', data.map(({ log, ...a }) => ({ ...a, log: log.map((l) => `${l.at} ${l.message}`) })))}>
          ⤓ {t('admin.exportCsv')}
        </Button>
      </div>
      {data.map((a) => (
        <article key={a.id} className="paper">
          <div className="spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="eyebrow">{a.id} · {formatTimestamp(a.submittedAt, lang)}</span>
              <h3>{a.organizerName}</h3>
              <p className="mono-sm muted">{a.organizerEmail}</p>
            </div>
            <Stamp tone={a.status === 'Pending' ? 'hold' : a.status === 'Approved' ? 'success' : 'danger'}>{t(`admin.actStatus.${a.status}`)}</Stamp>
          </div>
          <dl className="landing__facts" style={{ margin: '14px 0' }}>
            <div className="fact"><dt>{t('admin.binIin')}</dt><dd className="mono">{a.binIin}</dd></div>
            <div className="fact"><dt>{t('admin.bank')}</dt><dd>{a.bankName}<small>{a.payoutMasked}</small></dd></div>
            <div className="fact"><dt>{t('admin.feePaid')}</dt><dd>{formatKZT(a.feePaid)}</dd></div>
          </dl>
          <button type="button" className="link-btn" aria-expanded={open === a.id} aria-controls={`log-${a.id}`} onClick={() => setOpen(open === a.id ? null : a.id)}>
            {open === a.id ? t('admin.hideLog') : t('admin.showLog', { n: a.log.length })}
          </button>
          {open === a.id && (
            <ol id={`log-${a.id}`} className="timeline" style={{ marginTop: 12 }}>
              {a.log.map((l, i) => (
                <li key={i}>
                  <time className="mono-sm" dateTime={l.at}>{formatTimestamp(l.at, lang)}</time>
                  <p className="mono-sm">{l.message}</p>
                </li>
              ))}
            </ol>
          )}
          {a.status === 'Pending' && (
            <div className="wizard-actions">
              <Button variant="danger" size="sm" onClick={() => setDecision({ a, status: 'Rejected' })}>{t('admin.reject')}</Button>
              <Button variant="success" size="sm" onClick={() => setDecision({ a, status: 'Approved' })}>{t('admin.approve')}</Button>
            </div>
          )}
        </article>
      ))}
      {decision && (
        <ConfirmModal
          title={decision.status === 'Approved' ? t('admin.approveTitle') : t('admin.rejectTitle')}
          body={t(decision.status === 'Approved' ? 'admin.approveBody' : 'admin.rejectBody', { org: decision.a.organizerName })}
          confirmLabel={decision.status === 'Approved' ? t('admin.approve') : t('admin.reject')}
          tone={decision.status === 'Approved' ? 'success' : 'danger'}
          busy={busy}
          confirmDisabled={decision.status === 'Rejected' && note.trim().length < 5}
          onConfirm={act}
          onClose={() => setDecision(null)}
        >
          <Field label={t('admin.note')} required={decision.status === 'Rejected'} helper={t('admin.noteHelper')}>
            <textarea className="bf-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </ConfirmModal>
      )}
    </div>
  );
};
