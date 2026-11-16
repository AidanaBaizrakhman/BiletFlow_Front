import React from 'react';

export type ScanKind = 'valid' | 'used' | 'promo' | 'not_found';

const GLYPH: Record<ScanKind, string> = { valid: '✓', used: '✕', promo: '%', not_found: '?' };

export const ScanResult: React.FC<{ kind: ScanKind; verdict: string; children?: React.ReactNode }> = ({ kind, verdict, children }) => (
  <section className={`bf-scan bf-scan--${kind}`} role="status" aria-live="assertive">
    <span className="bf-scan__glyph" aria-hidden="true">
      {GLYPH[kind]}
    </span>
    <p className="bf-scan__verdict">{verdict}</p>
    {children && <div className="bf-scan__details">{children}</div>}
  </section>
);
