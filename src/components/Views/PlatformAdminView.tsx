import React from 'react';
import { useTranslation } from '../../i18n';
import { navigate } from '../../router';
import { ActivationQueue } from '../admin/ActivationQueue';
import { Directory } from '../admin/Directory';
import { Escalations } from '../admin/Escalations';
import { SettingsForm } from '../admin/SettingsForm';
import { TabPanel, Tabs } from '../ui';

export type AdminTab = 'directory' | 'activations' | 'escalations' | 'settings';

/** Module 3 — Platform Admin portal at /admin */
export const PlatformAdminView: React.FC<{ tab?: string }> = ({ tab: tabParam }) => {
  const { t } = useTranslation();
  const tab = (['directory', 'activations', 'escalations', 'settings'].includes(tabParam ?? '') ? tabParam : 'directory') as AdminTab;
  return (
    <div className="role-view active-view">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">/admin</span>
          <h1 style={{ fontSize: 34 }}>{t('admin.title')}</h1>
        </div>
      </div>
      <Tabs
        label={t('admin.sections')}
        idPrefix="adm"
        value={tab}
        onChange={(id) => navigate(id === 'directory' ? '/admin' : `/admin/${id}`)}
        items={[
          { id: 'directory', label: t('admin.directory') },
          { id: 'activations', label: t('admin.activations') },
          { id: 'escalations', label: t('admin.escalations') },
          { id: 'settings', label: t('admin.settings') },
        ]}
      />
      <TabPanel id={tab} idPrefix="adm">
        {tab === 'directory' && <Directory />}
        {tab === 'activations' && <ActivationQueue />}
        {tab === 'escalations' && <Escalations />}
        {tab === 'settings' && <SettingsForm />}
      </TabPanel>
    </div>
  );
};
