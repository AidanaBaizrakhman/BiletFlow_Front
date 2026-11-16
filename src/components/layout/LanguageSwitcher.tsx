import React from 'react';
import { LANGS, useTranslation } from '../../i18n';

/** Module 4.2 — KK / RU / EN segmented switcher */
export const LanguageSwitcher: React.FC = () => {
  const { t, lang, i18n } = useTranslation();
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} aria-label={l.native} onClick={() => i18n.changeLanguage(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
};
