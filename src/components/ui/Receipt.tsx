import React from 'react';

export interface ReceiptRow {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: 'default' | 'discount' | 'muted';
}

export const Receipt: React.FC<{
  title: React.ReactNode;
  rows: ReceiptRow[];
  totalLabel: React.ReactNode;
  total: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, rows, totalLabel, total, footer }) => (
  <section className="bf-receipt" aria-label={typeof title === 'string' ? title : undefined}>
    <h4 className="bf-receipt__head">{title}</h4>
    <hr className="bf-receipt__rule" />
    <dl className="bf-receipt__rows">
      {rows.map((r, i) => (
        <div key={i} className={`bf-receipt__row bf-receipt__row--${r.tone ?? 'default'}`}>
          <dt>{r.label}</dt>
          <span className="bf-receipt__leader" aria-hidden="true" />
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
    <hr className="bf-receipt__rule" />
    <div className="bf-receipt__total">
      <span>{totalLabel}</span>
      <strong>{total}</strong>
    </div>
    {footer && <div className="bf-receipt__footer">{footer}</div>}
  </section>
);
