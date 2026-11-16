/**
 * Minimal hash router (no extra dependency). Routes look like `#/events/slug?promo=CODE`,
 * which also works when the app is served from static hosting without rewrite rules.
 * Swap for react-router later by keeping the same `useRoute`/`navigate`/`Link` surface.
 */
import React, { useEffect, useState } from 'react';

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { path, segments: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = `#${to}`;
  if (opts.replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

/** Remove query params (e.g. ?promo= after it's been applied) without adding a history entry. */
export function stripQuery(keys: string[]) {
  const r = parse();
  keys.forEach((k) => r.query.delete(k));
  const q = r.query.toString();
  history.replaceState(null, '', `#${r.path}${q ? `?${q}` : ''}`);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }> = ({ to, children, ...rest }) => (
  <a href={`#${to}`} {...rest}>
    {children}
  </a>
);
