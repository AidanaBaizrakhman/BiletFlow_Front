import React from 'react';
import type { Role } from '../types';
import { useTranslation } from '../i18n';
import { Link, useRoute } from '../router';

export const Navigation: React.FC<{ role?: Role }> = ({ role = 'Attendee' }) => {
  const { t } = useTranslation();
  const { path, query } = useRoute();
  const price = query.get('price');
  const current = (p: string, pr?: string) => (path === p && (pr === undefined ? !price : price === pr) ? 'page' : undefined);

  return (
    <nav className="menu-nav" aria-label={t('nav.main')}>
      <ul>
        <li><Link to="/events?price=free" id="navFreeEvents" aria-current={current('/events', 'free')}>{t('nav.free')}</Link></li>
        <li><Link to="/events?price=paid" id="navPaidEvents" aria-current={current('/events', 'paid')}>{t('nav.paid')}</Link></li>
        <li><Link to="/events" id="navAllEvents" aria-current={current('/events')}>{t('nav.allEvents')}</Link></li>
        {role === 'Organizer' && (
          <>
            <li><Link to="/organizer" aria-current={path === '/organizer' ? 'page' : undefined}>{t('nav.dashboard')}</Link></li>
            <li><Link to="/organizer/analytics" aria-current={path === '/organizer/analytics' ? 'page' : undefined}>{t('org.tabAnalytics')}</Link></li>
          </>
        )}
        {role === 'Event Admin' && <li><Link to="/scanner" aria-current={path === '/scanner' ? 'page' : undefined}>{t('nav.scanner')}</Link></li>}
        {role === 'Platform Admin' && <li><Link to="/admin" aria-current={path.startsWith('/admin') ? 'page' : undefined}>/admin</Link></li>}
        <li><a href="#contacts" onClick={(e) => { e.preventDefault(); document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('contacts')?.focus(); }}>{t('nav.contacts')}</a></li>
      </ul>
    </nav>
  );
};
