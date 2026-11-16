import React from 'react';
import type { Role } from '../types';
import { useTranslation } from '../i18n';
import { Link } from '../router';
import { LanguageSwitcher } from './layout/LanguageSwitcher';
import { NotificationBell } from './layout/NotificationBell';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange, onOpenAuth }) => {
  const { t } = useTranslation();
  return (
    <header className="top-header">
      <div className="header-left">
        <Link to="/" className="brand" aria-label="BiletFlow — home">
          <span className="brand__mark" aria-hidden="true">BF</span>
          BiletFlow
        </Link>
        <div className="header-box location-box">
          <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{t('city.Astana')}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="role-selector-wrapper">
          <label htmlFor="roleSelect">{t('header.role')}</label>
          <select
            id="roleSelect"
            className="role-select"
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as Role)}
          >
            <option value="Attendee">{t('role.Attendee')}</option>
            <option value="Organizer">{t('role.Organizer')}</option>
            <option value="Event Admin">{t('role.Event Admin')}</option>
            <option value="Platform Admin">{t('role.Platform Admin')}</option>
          </select>
        </div>
        <LanguageSwitcher />
        <NotificationBell role={currentRole} />
        <div className="header-auth-group">
          <button type="button" className="header-box profile-button" onClick={onOpenAuth}>
            {t('header.login')}
          </button>
        </div>
      </div>
    </header>
  );
};
