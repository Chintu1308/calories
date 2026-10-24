import React from 'react';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = '',
}) => {
  return (
    <div className={`calories-form-group ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="calories-form-label">
          <span>{label}</span>
          {required && (
            <span className="calories-required-indicator" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span id={htmlFor ? `${htmlFor}-error` : undefined} className="calories-form-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="calories-form-hint">{hint}</span>
      ) : null}
    </div>
  );
};
