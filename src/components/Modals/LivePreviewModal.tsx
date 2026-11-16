import React from 'react';
import type { EventFormData } from '../../types';
import { useTranslation } from '../../i18n';
import { formatDateTime, formatKZT } from '../../utils/format';
import { Button, Modal, Stamp } from '../ui';
import { Cover } from '../discovery/EventCard';

interface LivePreviewModalProps {
  data: EventFormData;
  onClose: () => void;
  onBackToEdit: () => void;
  onPublish: () => void;
  /** Edit mode shows "Save changes" instead of "Publish Event" */
  publishLabel?: string;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({ data, onClose, onBackToEdit, onPublish, publishLabel }) => {
  const { t, lang } = useTranslation();
  return (
    <Modal title={t('preview.title')} onClose={onClose} wide hideTitle>
      <div className="preview-header-badge">{t('preview.badge')}</div>
      <div className="preview-content">
        <h1>{data.title || t('preview.untitled')}</h1>
        <p className="preview-meta">
          <span>{t(`category.${data.category}`)}</span> • <span>{formatDateTime(data.eventDate, lang) || t('preview.datePending')}</span> •{' '}
          <span>{data.venue}</span>
        </p>
        <Cover event={data} />
        <h3>{t('landing.about')}</h3>
        <p className="prose">{data.description || t('preview.noDescription')}</p>
        <h3>{t('preview.tickets')}</h3>
        <div>
          {data.tickets.map((tk) => (
            <div key={tk.id} className="preview-ticket-row">
              <strong>
                {tk.name} ({tk.type === 'Free' ? t('common.free') : t('common.paid')})
                {tk.hidden && (
                  <>
                    {' '}
                    <Stamp tone="muted" straight>
                      {t('tickets.hiddenStamp')}
                    </Stamp>
                  </>
                )}
              </strong>
              <span>{tk.type === 'Free' ? t('common.free') : formatKZT(tk.price)}</span>
            </div>
          ))}
        </div>
        <h3>{t('landing.refundPolicy')}</h3>
        <div className="refund-box">{data.refundPolicy || t('landing.noRefundPolicy')}</div>
      </div>
      <div className="wizard-actions">
        <Button variant="secondary" onClick={onBackToEdit}>
          {t('preview.backToEdit')}
        </Button>
        <Button variant="success" onClick={onPublish}>
          {publishLabel ?? t('preview.publish')}
        </Button>
      </div>
    </Modal>
  );
};
