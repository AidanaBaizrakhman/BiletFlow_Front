import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { formatKZT } from '../../utils/format';

interface Point {
  label: string;
  value: number;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Sales over time — single-series column chart in ink, with an accessible data table fallback. */
export const ColumnChart: React.FC<{ data: Point[]; format?: (n: number) => string; title: string }> = ({ data, format = String, title }) => {
  const { t } = useTranslation();
  const W = 720;
  const H = 240;
  const pad = { l: 56, r: 8, t: 12, b: 34 };
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bw = data.length ? iw / data.length : iw;
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${t('analytics.chartSummary', { n: data.length, total: format(total) })}`}>
        <g className="grid">
          {ticks.map((v) => {
            const y = pad.t + ih - (v / max) * ih;
            return <line key={v} x1={pad.l} x2={W - pad.r} y1={y} y2={y} />;
          })}
        </g>
        {ticks.map((v) => {
          const y = pad.t + ih - (v / max) * ih;
          return (
            <text key={`t${v}`} x={pad.l - 8} y={y + 3} textAnchor="end">
              {format(v)}
            </text>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * ih;
          const x = pad.l + i * bw + Math.min(2, bw * 0.15);
          return (
            <g key={d.label}>
              <rect x={x} y={pad.t + ih - h} width={Math.max(1, bw - Math.min(4, bw * 0.3))} height={h} fill="var(--bf-ink)" rx={1}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - pad.b + 16} textAnchor="middle">
                  {d.label.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--bf-ink)" strokeWidth={1.5} />
      </svg>
      <details>
        <summary className="mono-sm" style={{ cursor: 'pointer', marginTop: 6 }}>{t('analytics.showTable')}</summary>
        <div className="table-responsive" style={{ maxHeight: 220, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('analytics.period')}</th>
                <th scope="col" className="num">{title}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}>
                  <td className="mono">{d.label}</td>
                  <td className="num">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

/** Breakdown by ticket type — horizontal bars, values labelled directly. */
export const HBarList: React.FC<{ data: { name: string; tickets: number; revenue: number }[] }> = ({ data }) => {
  const { t } = useTranslation();
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.revenue || d.tickets)), [data]);
  if (!data.length) return <p className="mono-sm muted">{t('analytics.noData')}</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {data.map((d) => {
        const v = d.revenue || d.tickets;
        return (
          <li key={d.name} className="hbar">
            <span>{d.name}</span>
            <span className="hbar__track" aria-hidden="true">
              <span className="hbar__fill" style={{ width: `${(v / max) * 100}%`, display: 'block' }} />
            </span>
            <span className="hbar__val">
              {d.tickets} {t('analytics.pcs')} · {formatKZT(d.revenue)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
