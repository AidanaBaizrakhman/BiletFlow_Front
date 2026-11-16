import React from 'react';
import { useTranslation } from '../../i18n';
import { Link } from '../../router';
import type { EventFormData } from '../../types';
import { formatKZT, stubDate } from '../../utils/format';
import { DateBlock, Stamp } from '../ui';

export function startingPrice(e: EventFormData): { free: boolean; from: number } {
  const visible = e.tickets.filter((t) => !t.hidden);
  const paid = visible.filter((t) => t.type === 'Paid' && t.price > 0).map((t) => t.price);
  if (paid.length === 0) return { free: true, from: 0 };
  const hasFree = visible.some((t) => t.type === 'Free' || t.price === 0);
  return { free: hasFree, from: hasFree ? 0 : Math.min(...paid) };
}

export const Cover: React.FC<{ event: EventFormData; className?: string; showCategory?: boolean }> = ({ event, className = '', showCategory }) => {
  const { t } = useTranslation();
  return event.mediaUrl ? (
    <img src={event.mediaUrl} alt="" className={`cover ${className}`} />
  ) : (
    <div className={`cover ${className}`} aria-hidden="true">
      {showCategory ? <span className="cover__cat">{t(`category.${event.category}`)}</span> : <span>{event.title}</span>}
    </div>
  );
};

export const EventCard: React.FC<{ event: EventFormData }> = ({ event }) => {
  const { t, lang } = useTranslation();
  const d = stubDate(event.eventDate, lang);
  const price = startingPrice(event);
  const href = `/events/${event.slug ?? event.id}`;
  return (
    <article className="event-card">
      <Cover event={event} showCategory />
      <div className="event-card__body">
        <DateBlock day={d.day} month={d.month} time={d.time} />
        <div>
          <h3 className="event-card__title">
            <Link to={href}>{event.title}</Link>
          </h3>
          <p className="event-card__meta">
            {event.venue}
            <br />
            {event.city}
          </p>
        </div>
      </div>
      <div className="event-card__perf" aria-hidden="true" />
      <div className="event-card__foot">
        <div className="event-card__price">
          {price.free && price.from === 0 && !event.tickets.some((x) => x.type === 'Paid' && !x.hidden) ? (
            <Stamp tone="free">{t('common.free')}</Stamp>
          ) : (
            <>
              <small>{t('catalog.from')}</small>
              {price.from === 0 ? t('common.free') : formatKZT(price.from)}
            </>
          )}
        </div>
        <span className="sm-btn" aria-hidden="true">
          {t('catalog.details')} →
        </span>
      </div>
    </article>
  );
};
