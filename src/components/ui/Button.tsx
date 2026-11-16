import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'danger' | 'success' | 'link' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  className = '',
  type = 'button',
  disabled,
  children,
  ...rest
}) => (
  <button
    type={type}
    className={`bf-btn bf-btn--${variant} bf-btn--${size}${full ? ' bf-btn--full' : ''} ${className}`.trim()}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? <span className="bf-btn__spinner" aria-hidden="true" /> : null}
    {children}
  </button>
);
