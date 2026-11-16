import React from 'react';

/** Horizontal stub: left date/tier block | dashed perforation | right content */
export const TicketStub: React.FC<{
  left: React.ReactNode;
  children: React.ReactNode;
  soldOut?: boolean;
  className?: string;
  as?: 'div' | 'article' | 'li';
}> = ({ left, children, soldOut, className = '', as: Tag = 'div' }) => (
  <Tag className={`bf-stub${soldOut ? ' is-soldout' : ''} ${className}`.trim()}>
    <div className="bf-stub__left">{left}</div>
    <div className="bf-stub__perf" aria-hidden="true" />
    <div className="bf-stub__right">{children}</div>
  </Tag>
);

export const DateBlock: React.FC<{ day: string; month: string; time?: string }> = ({ day, month, time }) => (
  <div className="bf-dateblock">
    <span className="bf-dateblock__day">{day}</span>
    <span className="bf-dateblock__month">{month}</span>
    {time && <span className="bf-dateblock__time">{time}</span>}
  </div>
);

/** Full ticket with side notches, perforation and a QR stub (КОРЕШОК) */
export const TicketCard: React.FC<{ main: React.ReactNode; stub: React.ReactNode; stubLabel: string }> = ({ main, stub, stubLabel }) => (
  <div className="bf-ticket">
    <div className="bf-ticket__main">{main}</div>
    <div className="bf-ticket__perf" aria-hidden="true">
      <span className="bf-ticket__notch bf-ticket__notch--l" />
      <span className="bf-ticket__notch bf-ticket__notch--r" />
    </div>
    <div className="bf-ticket__stub">
      <span className="bf-ticket__stublabel">{stubLabel}</span>
      {stub}
    </div>
  </div>
);
