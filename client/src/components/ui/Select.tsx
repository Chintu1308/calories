import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, error, children, className = '', id, ...props }, ref) => {
    const errorClass = error ? 'calories-select--error' : '';

    return (
      <select
        ref={ref}
        id={id}
        className={`calories-select ${errorClass} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

Select.displayName = 'Select';
