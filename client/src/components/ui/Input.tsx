import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const errorClass = error ? 'calories-input--error' : '';

    if (!leftIcon && !rightIcon) {
      return (
        <input
          ref={ref}
          id={id}
          className={`calories-input ${errorClass} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
      );
    }

    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={`calories-input ${errorClass} ${className}`}
          style={{
            paddingLeft: leftIcon ? '36px' : undefined,
            paddingRight: rightIcon ? '36px' : undefined,
          }}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
