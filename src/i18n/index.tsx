/**
 * Lightweight i18n layer with an i18next-compatible surface (`t(key, vars)`, `i18n.language`,
 * `changeLanguage`). Locale strings live in ./locales/{kk,ru,en}.json. To move to i18next later,
 * load the same JSON files as resources and replace `useTranslation` with react-i18next's.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.json';
import ru from './locales/ru.json';
import kk from './locales/kk.json';

export type Lang = 'kk' | 'ru' | 'en';
export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'kk', label: 'KK', native: 'Қазақша' },
  { code: 'ru', label: 'RU', native: 'Русский' },
  { code: 'en', label: 'EN', native: 'English' },
];

type Dict = { [k: string]: string | Dict };
const RESOURCES: Record<Lang, Dict> = { en: en as Dict, ru: ru as Dict, kk: kk as Dict };
const STORAGE_KEY = 'biletflow-lang';

function lookup(dict: Dict, key: string): string | undefined {
  // Allow keys whose last segment contains dots/spaces (e.g. enum values) by trying the full tail.
  const parts = key.split('.');
  let node: string | Dict | undefined = dict;
  for (let i = 0; i < parts.length; i++) {
    if (typeof node !== 'object' || node === null) return undefined;
    const tail = parts.slice(i).join('.');
    if (typeof node[tail] === 'string') return node[tail] as string;
    node = node[parts[i]];
  }
  return typeof node === 'string' ? node : undefined;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const Ctx = createContext<I18nCtx | null>(null);

function initialLang(): Lang {
  try {
    const s = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (s && s in RESOURCES) return s;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || 'ru').slice(0, 2);
  return nav === 'kk' || nav === 'en' ? nav : 'ru';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      const raw = lookup(RESOURCES[lang], key) ?? lookup(RESOURCES.en, key) ?? key.split('.').pop() ?? key;
      return vars ? raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(vars[k] ?? '')) : raw;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTranslation() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTranslation must be used inside <I18nProvider>');
  return { t: c.t, lang: c.lang, i18n: { language: c.lang, changeLanguage: c.setLang } };
}
