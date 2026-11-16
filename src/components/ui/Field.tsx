import React, { cloneElement, isValidElement, useId } from 'react';

interface FieldProps {
  label: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** a single input/select/textarea element — id & aria wiring is injected */
  children: React.ReactElement<Record<string, unknown>>;
}

/** Label (uppercase mono) above control, helper/error below. Injects id, aria-invalid, aria-describedby. */
export const Field: React.FC<FieldProps> = ({ label, helper, error, required, className = '', children }) => {
  const uid = useId();
  const childId = (isValidElement(children) && (children.props.id as string)) || `f${uid}`;
  const descId = helper || error ? `${childId}-desc` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: childId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': descId,
        'aria-required': required || undefined,
        className: `${(children.props.className as string) ?? 'bf-input'}${error ? ' is-invalid' : ''}`,
      })
    : children;
  return (
    <div className={`bf-field ${className}`.trim()}>
      <label className="bf-label" htmlFor={childId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {(error || helper) && (
        <p id={descId} className={`bf-helper${error ? ' bf-helper--error' : ''}`} role={error ? 'alert' : undefined}>
          {error || helper}
        </p>
      )}
    </div>
  );
};
