import React from 'react';

export interface CaloriesTaglineProps {
  className?: string;
  height?: number;
}

export const CaloriesTagline: React.FC<CaloriesTaglineProps> = ({
  className = '',
  height = 32,
}) => (
  <img
    src="/branding/calories-tagline.png"
    alt="Your nutrition, made clearer."
    className={className}
    style={{
      height: `${height}px`,
      alignSelf: 'center',
      borderRadius: 'rounded',
      width: 'auto',
      objectFit: 'contain',
    }}
  />
);
