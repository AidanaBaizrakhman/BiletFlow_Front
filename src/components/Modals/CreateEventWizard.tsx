import React, { useState } from 'react';
import type { EventFormData, SeatingMode, TicketTypeConfig, TicketVisibility } from '../../types';
import { CATEGORIES, CITIES, VENUES } from '../../api/events';
import { LAYOUTS } from '../../api/seating';
import { useTranslation } from '../../i18n';
import { formatKZT } from '../../utils/format';
import { Button, Field, Modal, Notice } from '../ui';

interface CreateEventWizardProps {
  onClose: () => void;
  onPreview: (data: EventFormData) => void;
  /** Module 2.1 — when provided the wizard works in Edit mode, pre-filled with this event */
  initialData?: EventFormData;
  /** defaults to 'edit' when initialData is given */
  mode?: 'create' | 'edit';
}

const DEFAULT_REFUND =
  'Full refund up to 7 days before the event. No refunds within 48 hours of the start time. If the event is cancelled, all paid orders are refunded automatically.';

export const CreateEventWizard: React.FC<CreateEventWizardProps> = ({ onClose, onPreview, initialData, mode }) => {
  const { t } = useTranslation();
  const isEdit = mode ? mode === 'edit' : !!initialData;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EventFormData>(
    initialData ?? {
      title: '',
      category: 'Technology & IT',
      description: '',
      eventDate: '',
      regWindow: '',
      mediaUrl: '',
      venue: 'Astana Hub (Mangilik El C5.1)',
      venueAddress: '',
      maxCapacity: 100,
      tickets: [{ id: '1', name: 'Standard Pass', type: 'Free', price: 0, quantity: 100, limitPerOrder: 5 }],
      visibility: 'Public',
      refundPolicy: DEFAULT_REFUND,
      city: 'Astana',
      seatingMode: 'GeneralAdmission',
    }
  );

  const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTicket = (index: number, patch: Partial<TicketTypeConfig>) => {
    updateField(
      'tickets',
      formData.tickets.map((tk, i) => (i === index ? { ...tk, ...patch } : tk))
    );
  };

  const addTicketType = () => {
    const newTicket: TicketTypeConfig = {
      id: Date.now().toString(),
      name: 'VIP Pass',
      type: 'Paid',
      price: 5000,
      quantity: 50,
      limitPerOrder: 2,
    };
    updateField('tickets', [...formData.tickets, newTicket]);
  };

  /* Module 5.1 — seating mode toggle; choosing a layout derives tiers & capacity from it */
  const setSeatingMode = (mode: SeatingMode, layoutId?: string) => {
    if (mode === 'GeneralAdmission') {
      setFormData((p) => ({ ...p, seatingMode: mode, seatingLayoutId: undefined }));
      return;
    }
    const layout = LAYOUTS.find((l) => l.id === (layoutId ?? formData.seatingLayoutId)) ?? LAYOUTS[0];
    const seats = layout.sections.flatMap((s) => s.rows.flatMap((r) => r.seats)).filter((s) => !s.unavailable);
    const tickets: TicketTypeConfig[] = layout.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      type: 'Paid',
      price: tier.price,
      quantity: seats.filter((s) => s.tierId === tier.id).length,
      limitPerOrder: 6,
    }));
    setFormData((p) => ({ ...p, seatingMode: mode, seatingLayoutId: layout.id, tickets, maxCapacity: seats.length }));
  };

  const assigned = formData.seatingMode === 'AssignedSeating';
  const titleMissing = step === 1 && !formData.title.trim();
  const steps = [t('wizard.s1'), t('wizard.s2'), t('wizard.s3'), t('wizard.s4')];

  return (
    <Modal title={isEdit ? t('wizard.editTitle') : t('wizard.createTitle')} onClose={onClose} wide>
      <ol className="wizard-stepper" aria-label={t('wizard.progress')} style={{ listStyle: 'none', padding: 0 }}>
        {steps.map((s, i) => (
          <li key={s} className={`step-indicator ${step === i + 1 ? 'active' : ''}`} aria-current={step === i + 1 ? 'step' : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <form onSubmit={(e) => e.preventDefault()}>
        {step === 1 && (
          <div className="wizard-step active-step">
            <h3>{t('wizard.s1Title')}</h3>
            <Field label={t('wizard.eventTitle')} required>
              <input
                type="text"
                id="eventTitle"
                className="text-input"
                placeholder="e.g. Astana Digital Forum 2026"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
              />
            </Field>
            <Field label={t('wizard.category')} required>
              <select id="eventCategory" className="text-input" value={formData.category} onChange={(e) => updateField('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('wizard.description')} required>
              <textarea
                id="eventDescription"
                className="text-input"
                rows={3}
                placeholder="Describe your event..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </Field>
            <div className="form-row">
              <Field label={t('wizard.eventDate')} required helper={t('wizard.tzHelper')}>
                <input type="datetime-local" id="eventDate" className="text-input" value={formData.eventDate} onChange={(e) => updateField('eventDate', e.target.value)} required />
              </Field>
              <Field label={t('wizard.regCloses')} required>
                <input type="datetime-local" id="regWindow" className="text-input" value={formData.regWindow} onChange={(e) => updateField('regWindow', e.target.value)} required />
              </Field>
            </div>
            <Field label={t('wizard.coverUrl')} helper={t('wizard.coverHelper')}>
              <input type="url" className="text-input" value={formData.mediaUrl} onChange={(e) => updateField('mediaUrl', e.target.value)} placeholder="https://…/cover.jpg" />
            </Field>
            {/* Module 2.1 — Refund Policy editor */}
            <Field label={t('wizard.refundPolicy')} helper={t('wizard.refundHelper')}>
              <textarea id="refundPolicy" className="text-input" rows={4} value={formData.refundPolicy ?? ''} onChange={(e) => updateField('refundPolicy', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step active-step">
            <h3>{t('wizard.s2Title')}</h3>
            <div className="form-row">
              <Field label={t('wizard.venue')} required>
                <select id="eventVenue" className="text-input" value={formData.venue} onChange={(e) => updateField('venue', e.target.value)}>
                  {VENUES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('catalog.city')}>
                <select className="text-input" value={formData.city ?? 'Astana'} onChange={(e) => updateField('city', e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`city.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('wizard.address')}>
              <input type="text" id="venueAddress" className="text-input" placeholder="e.g. Mangilik El Ave. 55/11" value={formData.venueAddress} onChange={(e) => updateField('venueAddress', e.target.value)} />
            </Field>

            <fieldset className="radio-group" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
              <legend className="bf-label" style={{ marginBottom: 8 }}>
                {t('seat.mode')}
              </legend>
              <div className="visibility-options">
                {(['GeneralAdmission', 'AssignedSeating'] as SeatingMode[]).map((m) => (
                  <label key={m} className="radio-card">
                    <input type="radio" name="seatingMode" checked={(formData.seatingMode ?? 'GeneralAdmission') === m} onChange={() => setSeatingMode(m)} />
                    <div>
                      <strong>{m === 'GeneralAdmission' ? t('seat.ga') : t('seat.assigned')}</strong>
                      <small>{m === 'GeneralAdmission' ? t('seat.gaDesc') : t('seat.assignedDesc')}</small>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {assigned && (
              <Field label={t('seat.layout')} helper={t('seat.layoutHelper')}>
                <select className="text-input" value={formData.seatingLayoutId} onChange={(e) => setSeatingMode('AssignedSeating', e.target.value)}>
                  {LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label={t('wizard.capacity')} required helper={assigned ? t('seat.capacityFromLayout') : undefined}>
              <input
                type="number"
                id="maxCapacity"
                className="text-input"
                value={formData.maxCapacity}
                onChange={(e) => updateField('maxCapacity', Number(e.target.value))}
                min={1}
                readOnly={assigned}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step active-step">
            <h3>{t('wizard.s3Title')}</h3>
            {assigned && <Notice tone="info">{t('seat.tiersFromLayout')}</Notice>}
            {formData.tickets.map((ticket, index) => (
              <fieldset key={ticket.id} className="ticket-config-card" style={{ marginTop: 12 }}>
                <legend className="sr-only">{ticket.name}</legend>
                <div className="form-row">
                  <Field label={t('wizard.ticketName')}>
                    <input type="text" className="text-input" value={ticket.name} onChange={(e) => updateTicket(index, { name: e.target.value })} />
                  </Field>
                  <Field label={t('wizard.ticketType')}>
                    <select
                      className="text-input"
                      value={ticket.type}
                      onChange={(e) => updateTicket(index, { type: e.target.value as 'Free' | 'Paid' })}
                      disabled={assigned}
                    >
                      <option value="Free">{t('common.free')}</option>
                      <option value="Paid">{t('common.paid')}</option>
                    </select>
                  </Field>
                </div>
                <div className="form-row">
                  <Field label={t('wizard.price')} helper={ticket.type === 'Paid' ? formatKZT(ticket.price) : undefined}>
                    <input type="number" min={0} className="text-input" value={ticket.price} disabled={ticket.type === 'Free'} onChange={(e) => updateTicket(index, { price: Number(e.target.value) })} />
                  </Field>
                  <Field label={t('wizard.quantity')}>
                    <input type="number" min={1} className="text-input" value={ticket.quantity} readOnly={assigned} onChange={(e) => updateTicket(index, { quantity: Number(e.target.value) })} />
                  </Field>
                  <Field label={t('wizard.limit')}>
                    <input type="number" min={1} className="text-input" value={ticket.limitPerOrder} onChange={(e) => updateTicket(index, { limitPerOrder: Number(e.target.value) })} />
                  </Field>
                </div>
                <label className="bf-toggle">
                  <input type="checkbox" checked={!!ticket.hidden} onChange={(e) => updateTicket(index, { hidden: e.target.checked })} />
                  <span className="bf-toggle__track" aria-hidden="true" />
                  {t('tickets.hidden')}
                </label>
              </fieldset>
            ))}
            {!assigned && (
              <button type="button" className="sm-btn" onClick={addTicketType}>
                + {t('wizard.addTicket')}
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step active-step">
            <h3>{t('wizard.s4Title')}</h3>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sr-only">{t('wizard.s4Title')}</legend>
              <div className="visibility-options">
                {(['Public', 'Unlisted', 'Private'] as TicketVisibility[]).map((vis) => (
                  <label key={vis} className="radio-card">
                    <input type="radio" name="visibility" value={vis} checked={formData.visibility === vis} onChange={() => updateField('visibility', vis)} />
                    <div>
                      <strong>{t(`visibility.${vis}`)}</strong>
                      <small>{t(`visibility.${vis}Desc`)}</small>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        <div className="wizard-actions">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              {t('common.back')}
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={titleMissing} aria-describedby={titleMissing ? 'wiz-hint' : undefined}>
              {t('wizard.next')} →
            </Button>
          ) : (
            <Button variant="success" onClick={() => onPreview(formData)}>
              {t('wizard.preview')}
            </Button>
          )}
        </div>
        {titleMissing && (
          <p id="wiz-hint" className="bf-helper" style={{ textAlign: 'right' }}>
            {t('wizard.titleRequired')}
          </p>
        )}
      </form>
    </Modal>
  );
};
