import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { TicketOrder } from '../../types';
import { createGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';
import { useTranslation } from '../../i18n';
import { formatDateTime, formatKZT } from '../../utils/format';
import { Button, Modal, Stamp, TicketCard } from '../ui';

interface OrderConfirmationModalProps {
  ticket: TicketOrder;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  ticket,
  onClose,
}) => {
  const { t, lang } = useTranslation();
  const [qrDataDataUrl, setQrDataUrl] = useState<string>('');

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const qrPayload = JSON.stringify({
      ticketId: ticket.id,
      eventName: ticket.eventName,
      attendee: ticket.attendeeName,
      email: ticket.attendeeEmail,
    });

    QRCode.toDataURL(qrPayload, { width: 180, margin: 2, color: { dark: '#182449', light: '#ffffff' } })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Code generation error:', err));
  }, [ticket]);

  const googleCalUrl = createGoogleCalendarUrl(
    ticket.eventName,
    `Ticket ID: ${ticket.id}\nAttendee: ${ticket.attendeeName}`,
    ticket.venue,
    ticket.date
  );

  const isFree = !ticket.price;
  const prettyDate = formatDateTime(ticket.date, lang) || ticket.date;

  return (
    <Modal title={t('confirm.title')} onClose={onClose} wide className="printable-area">
      <div className="confirmation-header">
        <p className="modal-desc">{t('confirm.subtitle')}</p>
      </div>

      <div className="ticket-card-display">
        <TicketCard
          stubLabel={t('confirm.stub')}
          main={
            <div className="ticket-info">
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <h3>{ticket.eventName}</h3>
                <Stamp tone={isFree ? 'free' : 'paid'} tilt={-4}>
                  {isFree ? t('stamp.free') : t('stamp.paid')}
                </Stamp>
              </div>
              <p><strong>{t('confirm.pass')}</strong> {ticket.ticketName}{ticket.quantity && ticket.quantity > 1 ? ` × ${ticket.quantity}` : ''}</p>
              <p><strong>{t('confirm.ticketId')}</strong> <span className="mono">{ticket.id}</span></p>
              <p><strong>{t('confirm.attendee')}</strong> {ticket.attendeeName}</p>
              <p><strong>{t('confirm.email')}</strong> {ticket.attendeeEmail}</p>
              <p><strong>{t('confirm.phone')}</strong> {ticket.attendeePhone}</p>
              <p><strong>{t('confirm.date')}</strong> {prettyDate}</p>
              <p><strong>{t('confirm.venue')}</strong> {ticket.venue}</p>
              {ticket.seats?.length ? <p><strong>{t('receipt.seats')}</strong> <span className="mono">{ticket.seats.join(', ')}</span></p> : null}
              {!isFree && (
                <p>
                  <strong>{t('receipt.total')}</strong> <span className="mono">{formatKZT(ticket.price)}</span>
                  {ticket.discount ? <span className="mono" style={{ color: 'var(--bf-danger)' }}> (−{formatKZT(ticket.discount)} {ticket.promoCode})</span> : null}
                </p>
              )}
            </div>
          }
          stub={
            <div className="ticket-qr-container">
              {qrDataDataUrl ? (
                <img src={qrDataDataUrl} alt={t('confirm.qrAlt', { id: ticket.id })} width={160} height={160} />
              ) : (
                <div className="qr-placeholder" role="status">{t('confirm.generatingQr')}</div>
              )}
              <span className="qr-caption">{t('confirm.scan')}</span>
            </div>
          }
        />
      </div>

      {/* Task F7.4: Add to Calendar Buttons */}
      <div className="calendar-actions no-print">
        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer" className="sm-btn">
          + {t('calendar.google')}
        </a>
        <button
          type="button"
          className="sm-btn"
          onClick={() =>
            downloadIcsFile(
              ticket.eventName,
              `Ticket ID: ${ticket.id}\nAttendee: ${ticket.attendeeName}`,
              ticket.venue,
              ticket.date
            )
          }
        >
          {t('calendar.ics')}
        </button>
      </div>

      <div className="wizard-actions no-print">
        <Button variant="secondary" onClick={onClose}>
          {t('confirm.back')}
        </Button>
        <Button onClick={handlePrint}>{t('confirm.download')}</Button>
      </div>
    </Modal>
  );
};
