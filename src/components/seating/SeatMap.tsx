import React from 'react';
import { useTranslation } from '../../i18n';
import type { LayoutSeat, SeatState, VenueLayout } from '../../types';
import { formatKZT } from '../../utils/format';

/** Each state has a distinct glyph so colour is never the only signal (WCAG 1.4.1). */
const GLYPH: Partial<Record<SeatState, string>> = { selected: '✓', sold: '×', held: '…', unavailable: '—', accessible: 'Д' };

const SeatButton: React.FC<{
  seat: LayoutSeat;
  state: SeatState;
  sectionName: string;
  price: number;
  onToggle?: (seat: LayoutSeat) => void;
}> = ({ seat, state, sectionName, price, onToggle }) => {
  const { t } = useTranslation();
  const interactive = state === 'available' || state === 'accessible' || state === 'selected';
  const label = t('seat.aria', { section: sectionName, row: seat.row, seat: seat.number, price: formatKZT(price), state: t(`seat.state_${state}`) });
  const glyph = state === 'accessible' ? t('seat.accessibleGlyph') : GLYPH[state];
  return (
    <button
      type="button"
      className={`seat seat--${state}`}
      aria-label={label}
      aria-pressed={interactive ? state === 'selected' : undefined}
      disabled={!interactive || !onToggle}
      onClick={() => onToggle?.(seat)}
      title={label}
    >
      {glyph ?? seat.number}
    </button>
  );
};

export const SeatLegend: React.FC = () => {
  const { t } = useTranslation();
  const states: SeatState[] = ['available', 'selected', 'held', 'sold', 'accessible', 'unavailable'];
  return (
    <div className="seatmap__legend" aria-label={t('seat.legend')}>
      {states.map((s) => (
        <span key={s}>
          <span className={`seat seat--${s}`} aria-hidden="true">
            {s === 'accessible' ? t('seat.accessibleGlyph') : GLYPH[s] ?? '7'}
          </span>
          {t(`seat.state_${s}`)}
        </span>
      ))}
    </div>
  );
};

/** Module 5.2 — interactive seat map (seats are native buttons: keyboard + screen reader friendly). */
export const SeatMap: React.FC<{
  layout: VenueLayout;
  states: Record<string, SeatState>;
  onToggle?: (seat: LayoutSeat) => void;
  priceFor: (tierId: string) => number;
}> = ({ layout, states, onToggle, priceFor }) => {
  const { t } = useTranslation();
  return (
    <figure className="seatmap" aria-label={t('seat.mapLabel')} style={{ margin: 0 }}>
      <div className="seatmap__stage">{t('seat.stage')}</div>
      {layout.sections.map((sec) => {
        const tier = layout.tiers.find((x) => x.id === sec.rows[0]?.seats[0]?.tierId);
        return (
          <div key={sec.id} className="seatmap__section" role="group" aria-label={sec.name}>
            <h4>
              <span>{sec.name}</span>
              <span>{tier ? formatKZT(priceFor(tier.id)) : ''}</span>
            </h4>
            <div className="seatmap__scroll">
              {sec.rows.map((row) => (
                <div key={row.id} className="seatmap__row" role="group" aria-label={t('seat.row', { row: row.id.split('-').pop() ?? '' })}>
                  <span className="seatmap__rowlabel" aria-hidden="true">
                    {row.id.split('-').pop()}
                  </span>
                  {row.seats.map((seat, i) => (
                    <React.Fragment key={seat.id}>
                      {i === Math.floor(row.seats.length / 2) && <span className="seatmap__gap" aria-hidden="true" />}
                      <SeatButton seat={seat} state={states[seat.id] ?? 'unavailable'} sectionName={sec.name} price={priceFor(seat.tierId)} onToggle={onToggle} />
                    </React.Fragment>
                  ))}
                  <span className="seatmap__rowlabel" aria-hidden="true">
                    {row.id.split('-').pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <SeatLegend />
    </figure>
  );
};
