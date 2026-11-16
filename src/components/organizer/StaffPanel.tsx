import React, { useEffect, useId, useState } from 'react';
import { assignStaff, listStaff, revokeStaff, searchUsers } from '../../api/organizer';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import type { EventFormData, PlatformUser, StaffAssignment } from '../../types';
import { formatTimestamp } from '../../utils/format';
import { Button, ConfirmModal, EmptyState, ErrorState, Field, Loading, useToast } from '../ui';

/** Module 2.4 — Check-in staff (Event Admin) assignment */
export const StaffPanel: React.FC<{ event: EventFormData }> = ({ event }) => {
  const { t, lang } = useTranslation();
  const toast = useToast();
  const listId = useId();
  const { data, loading, error, refetch } = useAsync(() => listStaff(event.id!), [event.id]);
  const [email, setEmail] = useState('');
  const [suggestions, setSuggestions] = useState<PlatformUser[]>([]);
  const [assignErr, setAssignErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [revoke, setRevoke] = useState<StaffAssignment | null>(null);

  useEffect(() => {
    if (email.length < 2) {
      setSuggestions([]);
      return;
    }
    const h = setTimeout(() => searchUsers(email).then(setSuggestions).catch(() => setSuggestions([])), 200);
    return () => clearTimeout(h);
  }, [email]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAssignErr(undefined);
    try {
      const a = await assignStaff(event.id!, email);
      toast(t('staff.assignedToast', { email: a.email }));
      setEmail('');
    } catch (err) {
      setAssignErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async () => {
    if (!revoke) return;
    setBusy(true);
    try {
      await revokeStaff(event.id!, revoke.id);
      toast(t('staff.revokedToast', { email: revoke.email }));
      setRevoke(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-2">
      <section className="paper" aria-labelledby="staff-assign">
        <h3 id="staff-assign">{t('staff.assignTitle')}</h3>
        <p className="mono-sm muted" style={{ margin: '6px 0 14px' }}>{t('staff.assignDesc')}</p>
        <form onSubmit={assign}>
          <Field label={t('staff.emailOrName')} error={assignErr} helper={t('staff.helper')}>
            <input type="email" className="bf-input" value={email} list={listId} onChange={(e) => setEmail(e.target.value)} placeholder="scanner@company.kz" autoComplete="off" required />
          </Field>
          <datalist id={listId}>
            {suggestions.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name} · {t(`role.${u.role}`)}
              </option>
            ))}
          </datalist>
          <Button type="submit" loading={busy} disabled={!email.trim()}>
            {t('staff.assign')}
          </Button>
        </form>
      </section>

      <section aria-labelledby="staff-list">
        <h3 id="staff-list">{t('staff.listTitle')}</h3>
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <EmptyState title={t('staff.empty')} />
        ) : (
          <ul className="admin-list">
            {data.map((s) => (
              <li key={s.id} className="spread">
                <div>
                  <strong>{s.name}</strong>
                  <div className="mono-sm muted">
                    {s.email} · {t('staff.since', { date: formatTimestamp(s.assignedAt, lang) })}
                  </div>
                </div>
                <button type="button" className="sm-btn danger" onClick={() => setRevoke(s)}>
                  {t('staff.revoke')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revoke && (
        <ConfirmModal
          title={t('staff.revokeTitle')}
          body={t('staff.revokeBody', { email: revoke.email, event: event.title })}
          confirmLabel={t('staff.revoke')}
          busy={busy}
          onConfirm={doRevoke}
          onClose={() => setRevoke(null)}
        />
      )}
    </div>
  );
};
