import React, { useState } from 'react';
import { createPlatformThread } from '../../api/organizer';
import { useTranslation } from '../../i18n';
import type { PlatformSupportCategory, PlatformSupportThread } from '../../types';
import { Button, Field, Modal, Notice, Stamp } from '../ui';

const CATEGORIES: PlatformSupportCategory[] = ['Account', 'Paid Activation', 'Payout', 'Technical'];

/** Module 2.5 — Organizer → Platform Admin support thread */
export const PlatformSupportModal: React.FC<{ onClose: () => void; events?: { id?: string; title: string }[] }> = ({ onClose, events = [] }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState<PlatformSupportCategory>('Technical');
  const [eventId, setEventId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [created, setCreated] = useState<PlatformSupportThread | null>(null);
  const [touched, setTouched] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    setErr(undefined);
    try {
      setCreated(await createPlatformThread({ category, subject, message, eventId: eventId || undefined }));
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('psupport.title')} onClose={onClose}>
      {created ? (
        <div className="thread">
          <div className="thread__head">
            <div>
              <span className="eyebrow" style={{ margin: 0 }}>{created.id} · {t(`psupport.cat.${created.category}`)}</span>
              <strong>{created.subject}</strong>
            </div>
            <Stamp tone="hold">{t('psupport.status.Open')}</Stamp>
          </div>
          <div className="bubble bubble--me">
            <span className="bubble__who">{t('chat.you')}</span>
            {created.messages[0].body}
          </div>
          <Notice tone="success">{t('psupport.sent')}</Notice>
          <div className="wizard-actions">
            <Button onClick={onClose}>{t('common.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="modal-desc">{t('psupport.desc')}</p>
          <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
            <legend className="bf-label" style={{ marginBottom: 8 }}>{t('psupport.category')}</legend>
            <div className="chips" style={{ marginBottom: 0 }}>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {t(`psupport.cat.${c}`)}
                </button>
              ))}
            </div>
          </fieldset>
          {events.length > 0 && (
            <Field label={t('psupport.relatedEvent')}>
              <select className="bf-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">{t('psupport.none')}</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t('psupport.subject')} required error={touched && !subject.trim() ? t('checkout.required') : undefined}>
            <input className="bf-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          </Field>
          <Field label={t('psupport.message')} required error={touched && !message.trim() ? t('checkout.required') : undefined} helper={t('psupport.messageHelper')}>
            <textarea className="bf-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          {err && <Notice tone="error">{err}</Notice>}
          <div className="wizard-actions">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={busy}>{t('psupport.send')}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
