import React, { useState } from 'react';
import { getPlatformSettings } from '../../api/admin';
import { useAsync } from '../../hooks/useAsync';
import { useTranslation } from '../../i18n';
import { formatKZT } from '../../utils/format';
import { Button, Modal } from '../ui';

interface PaidActivationModalProps {
  onClose: () => void;
}

export const PaidActivationModal: React.FC<PaidActivationModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  // Fee now comes from Platform Settings (Module 3.3); falls back to the original 5 000 KZT.
  const { data: settings } = useAsync(() => getPlatformSettings(), []);
  const fee = settings?.activationFeeKzt ?? 5000;

  const isValid = c1 && c2 && c3;

  return (
    <Modal title={t('activation.title')} onClose={onClose}>
      <p className="modal-desc">{t('activation.desc')}</p>

      <fieldset className="checklist-group" style={{ border: 0, padding: 0 }}>
        <legend className="sr-only">{t('activation.checklist')}</legend>
        <label className="check-item">
          <input type="checkbox" checked={c1} onChange={(e) => setC1(e.target.checked)} />
          <span>{t('activation.c1')}</span>
        </label>
        <label className="check-item">
          <input type="checkbox" checked={c2} onChange={(e) => setC2(e.target.checked)} />
          <span>{t('activation.c2')}</span>
        </label>
        <label className="check-item">
          <input type="checkbox" checked={c3} onChange={(e) => setC3(e.target.checked)} />
          <span>{t('activation.c3')}</span>
        </label>
      </fieldset>

      <div className="activation-fee-box">
        <span>{t('activation.fee')}</span>
        <strong>{formatKZT(fee)}</strong>
      </div>

      <Button
        full
        disabled={!isValid}
        onClick={() => {
          alert('Fee paid! Paid sales enabled.');
          onClose();
        }}
      >
        {t('activation.pay', { fee: formatKZT(fee) })}
      </Button>
    </Modal>
  );
};
