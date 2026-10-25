import React from 'react';
import { Icon } from './Icon.js';

export interface CaloriesTaglineProps {
  className?: string;
  height?: number;
}

export const CaloriesTagline: React.FC<CaloriesTaglineProps> = ({
  className = '',
  height = 28,
}) => (
  <div
    className={`calories-tagline-badge ${className}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      userSelect: 'none',
    }}
  >
    <Icon name="leaf" size={height ? Math.max(16, Math.round(height * 0.7)) : 18} />
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--color-forest-green, #285B46)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      Your nutrition, made clearer.
    </span>
  </div>
);
