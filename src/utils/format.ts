import type { Lang } from '../i18n';

/** All event times are Kazakhstan time (single UTC+5 zone since 2024). Aqtobe is a stable +05 zone id in every ICU build. */
export const KZ_TZ = 'Asia/Aqtobe';
export const KZ_TZ_LABEL = 'UTC+5';

const LOCALE: Record<Lang, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-GB' };
export const intlLocale = (lang: Lang) => LOCALE[lang];

/** "5 600 ₸" — thin-space grouping, tenge sign after the amount (KZ convention) */
export function formatKZT(amount: number, opts: { sign?: boolean } = {}) {
  const abs = Math.round(Math.abs(amount));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = amount < 0 ? '−' : opts.sign && amount > 0 ? '+' : '';
  return `${sign}${grouped} ₸`;
}

/** Event dates from datetime-local inputs are naive wall-clock times in Kazakhstan. */
export function toDate(value: string | undefined): Date {
  if (!value) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) value = `${value}T00:00`;
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(value)) return new Date(value);
  return new Date(`${value.length === 16 ? `${value}:00` : value}+05:00`);
}

export function formatDateTime(value: string | undefined, lang: Lang, withTz = false) {
  const d = toDate(value);
  if (isNaN(d.getTime())) return '';
  const s = new Intl.DateTimeFormat(intlLocale(lang), {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: KZ_TZ,
  }).format(d);
  return withTz ? `${s} (${KZ_TZ_LABEL})` : s;
}

export function formatDate(value: string | undefined, lang: Lang) {
  const d = toDate(value);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: KZ_TZ }).format(d);
}

export function formatTimestamp(value: string, lang: Lang) {
  const d = toDate(value);
  return new Intl.DateTimeFormat(intlLocale(lang), {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: KZ_TZ,
  }).format(d);
}

/** Ticket-stub date block: { day: "21", month: "НОЯ", time: "10:00" } */
export function stubDate(value: string, lang: Lang) {
  const d = toDate(value);
  const loc = intlLocale(lang);
  return {
    day: new Intl.DateTimeFormat(loc, { day: '2-digit', timeZone: KZ_TZ }).format(d),
    month: new Intl.DateTimeFormat(loc, { month: 'short', timeZone: KZ_TZ }).format(d).replace('.', '').slice(0, 3).toUpperCase(),
    time: new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', timeZone: KZ_TZ }).format(d),
  };
}

export const pct = (n: number) => `${n.toFixed(1)}%`;
