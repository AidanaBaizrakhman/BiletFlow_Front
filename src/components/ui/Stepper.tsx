import React from 'react';

export const Stepper: React.FC<{
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
}> = ({ value, min = 0, max, onChange, label, disabled }) => {
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;
  return (
    <div className="bf-stepper" role="group" aria-label={label}>
      <button type="button" className="bf-stepper__btn bf-stepper__btn--dec" onClick={() => onChange(value - 1)} disabled={!canDec} aria-label={`${label}: −1`}>
        −
      </button>
      <output className="bf-stepper__value" aria-live="polite">
        {value}
      </output>
      <button type="button" className="bf-stepper__btn bf-stepper__btn--inc" onClick={() => onChange(value + 1)} disabled={!canInc} aria-label={`${label}: +1`}>
        +
      </button>
    </div>
  );
};
