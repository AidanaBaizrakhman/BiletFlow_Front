import React, { useMemo, useState } from 'react';
import { CATEGORIES, CITIES, VENUES, listPublicEvents } from '../api/events';
import { EventCard, startingPrice } from '../components/discovery/EventCard';
import { Button, EmptyState, ErrorState, Field, Loading } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useTranslation } from '../i18n';
import { navigate, useRoute } from '../router';

type PriceFilter = 'all' | 'free' | 'paid';

/** Module 1.1 — public catalog at / and /events */
export const EventCatalog: React.FC = () => {
  const { t } = useTranslation();
  const { query } = useRoute();
  const [q, setQ] = useState(query.get('q') ?? '');
  const [category, setCategory] = useState(query.get('category') ?? '');
  const [city, setCity] = useState(query.get('city') ?? '');
  const [venue, setVenue] = useState(query.get('venue') ?? '');
  const [from, setFrom] = useState(query.get('from') ?? '');
  const [to, setTo] = useState(query.get('to') ?? '');
  const price = (query.get('price') as PriceFilter) || 'all';

  const { data, loading, error, refetch } = useAsync(
    () => listPublicEvents({ q, category, city, venue, from, to }),
    [q, category, city, venue, from, to]
  );

  const events = useMemo(
    () =>
      (data ?? []).filter((e) => {
        if (price === 'all') return true;
        const p = startingPrice(e);
        const anyPaid = e.tickets.some((x) => x.type === 'Paid' && !x.hidden);
        return price === 'free' ? p.free && !anyPaid : anyPaid;
      }),
    [data, price]
  );

  const reset = () => {
    setQ('');
    setCategory('');
    setCity('');
    setVenue('');
    setFrom('');
    setTo('');
    navigate('/events');
  };
  const dateError = from && to && from > to ? t('catalog.dateRangeError') : undefined;
  const active = [q, category, city, venue, from, to].some(Boolean) || price !== 'all';

  return (
    <div>
      <section className="hero" aria-labelledby="catalog-title">
        <div>
          <span className="eyebrow">{t('catalog.eyebrow')}</span>
          <h1 id="catalog-title">{t('catalog.title')}</h1>
          <p>{t('catalog.subtitle')}</p>
        </div>
      </section>

      <form className="filters" role="search" aria-label={t('catalog.filtersLabel')} onSubmit={(e) => e.preventDefault()}>
        <Field label={t('catalog.search')}>
          <input type="search" className="bf-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('catalog.searchPlaceholder')} />
        </Field>
        <Field label={t('catalog.category')}>
          <select className="bf-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('catalog.city')}>
          <select className="bf-input" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {t(`city.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('catalog.venue')}>
          <select className="bf-input" value={venue} onChange={(e) => setVenue(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {VENUES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label={t('catalog.dateFrom')}>
          <input type="date" className="bf-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('catalog.dateTo')} error={dateError}>
          <input type="date" className="bf-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </form>

      <div className="spread" style={{ marginBottom: 14 }}>
        <div className="chips" role="group" aria-label={t('catalog.priceFilter')} style={{ marginBottom: 0 }}>
          {(['all', 'free', 'paid'] as PriceFilter[]).map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={price === p} onClick={() => navigate(p === 'all' ? '/events' : `/events?price=${p}`)}>
              {t(`catalog.price_${p}`)}
            </button>
          ))}
        </div>
        <div className="row">
          <span className="mono-sm" aria-live="polite">
            {loading ? t('common.loading') : t('catalog.count', { count: events.length })}
          </span>
          {active && (
            <Button variant="link" onClick={reset}>
              {t('catalog.reset')}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading && !data ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState title={t('catalog.emptyTitle')}>
          <p>{t('catalog.emptyBody')}</p>
        </EmptyState>
      ) : (
        <section aria-label={t('catalog.results')}>
          <div className="events-grid">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
