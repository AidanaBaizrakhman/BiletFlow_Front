import React, { useEffect, useId, useRef, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { navigate } from '../../router';
import type { NotificationKind, Role } from '../../types';
import { formatTimestamp } from '../../utils/format';
import { Button } from '../ui';

const KIND_GLYPH: Record<NotificationKind, string> = { ticket: '◫', event_update: '↻', event_cancelled: '×', refund: '↩', payout: '₸', support: '✉' };

/** Module 4.1 — bell with unread badge + dropdown (Escape / outside-click close, focus returns to bell) */
export const NotificationBell: React.FC<{ role: Role }> = ({ role }) => {
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const { data, setData } = useAsync(() => listNotifications(role), [role]);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        bell.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markOne = (id: string) => {
    setData((p) => p?.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationRead(id);
  };
  const markAll = () => {
    setData((p) => p?.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead(role);
  };

  return (
    <div className="notif" ref={wrap}>
      <button
        ref={bell}
        type="button"
        className="notif__bell"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? t('notif.ariaUnread', { n: unread }) : t('notif.aria')}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="notif__badge" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="notif__panel" id={panelId} role="region" aria-label={t('notif.title')}>
          <div className="notif__head">
            <h2>{t('notif.title')}</h2>
            <Button variant="link" onClick={markAll} disabled={!unread}>
              {t('notif.markAll')}
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="mono-sm" style={{ padding: 16 }}>{t('notif.empty')}</p>
          ) : (
            <ul className="notif__list">
              {items.map((n) => (
                <li key={n.id} className={`notif__item${n.read ? '' : ' is-unread'}`}>
                  <span className="notif__kind" aria-hidden="true">{KIND_GLYPH[n.kind]}</span>
                  <div>
                    <div className="notif__title">
                      <span className="sr-only">{n.read ? '' : `${t('notif.unread')}: `}</span>
                      {n.link ? (
                        <a
                          href={`#${n.link}`}
                          onClick={(e) => {
                            e.preventDefault();
                            markOne(n.id);
                            setOpen(false);
                            navigate(n.link!);
                          }}
                        >
                          {n.title}
                        </a>
                      ) : (
                        n.title
                      )}
                    </div>
                    <div className="notif__body">{n.body}</div>
                    <div className="notif__time">
                      {t(`notif.kind.${n.kind}`)} · {formatTimestamp(n.createdAt, lang)}
                    </div>
                  </div>
                  {!n.read && (
                    <button type="button" className="sm-btn" onClick={() => markOne(n.id)} aria-label={t('notif.markReadAria', { title: n.title })}>
                      ✓
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
