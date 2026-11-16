import React, { useRef } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  count?: number;
}

/** Segmented control with WAI-ARIA tabs semantics (arrow keys / Home / End). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix = 'tab',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n >= 0) {
      e.preventDefault();
      onChange(items[n].id);
      refs.current[n]?.focus();
    }
  };
  return (
    <div className="bf-tabs" role="tablist" aria-label={label}>
      {items.map((it, i) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-${it.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${it.id}`}
            tabIndex={active ? 0 : -1}
            className={`bf-tabs__tab${active ? ' is-active' : ''}`}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.label}
            {typeof it.count === 'number' && <span className="bf-tabs__count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const TabPanel: React.FC<{ id: string; idPrefix?: string; children: React.ReactNode }> = ({ id, idPrefix = 'tab', children }) => (
  <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-${id}`} tabIndex={0} className="bf-tabpanel">
    {children}
  </div>
);
