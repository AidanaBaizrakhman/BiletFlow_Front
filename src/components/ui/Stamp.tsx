import React from 'react';

export type StampTone = 'paid' | 'free' | 'refund' | 'hold' | 'draft' | 'danger' | 'success' | 'muted';

export const Stamp: React.FC<{
  tone?: StampTone;
  straight?: boolean;
  /** rotation in degrees (−2 … −5 recommended); ignored when straight */
  tilt?: number;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'draft', straight, tilt = -3, className = '', children }) => (
  <span
    className={`bf-stamp bf-stamp--${tone} ${className}`.trim()}
    style={{ transform: straight ? 'none' : `rotate(${tilt}deg)` }}
  >
    {children}
  </span>
);
