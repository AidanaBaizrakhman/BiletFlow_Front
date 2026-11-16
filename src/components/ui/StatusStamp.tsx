import React from 'react';
import { useTranslation } from '../../i18n';
import type { EventStatus, OrderStatus } from '../../types';
import { Stamp, type StampTone } from './Stamp';

const EVENT_TONE: Record<EventStatus, StampTone> = {
  Draft: 'draft',
  Published: 'success',
  Unpublished: 'muted',
  Cancelled: 'danger',
  Completed: 'draft',
  Suspended: 'hold',
};

export const StatusStamp: React.FC<{ status: EventStatus; straight?: boolean }> = ({ status, straight }) => {
  const { t } = useTranslation();
  return (
    <Stamp tone={EVENT_TONE[status]} straight={straight} tilt={-2}>
      {t(`eventStatus.${status}`)}
    </Stamp>
  );
};

const ORDER_TONE: Record<OrderStatus, StampTone> = {
  Paid: 'paid',
  Registered: 'free',
  Reserved: 'hold',
  Refunded: 'refund',
  Cancelled: 'refund',
};

export const OrderStamp: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <Stamp tone={ORDER_TONE[status]} tilt={-2}>
      {t(`orderStatus.${status}`)}
    </Stamp>
  );
};
