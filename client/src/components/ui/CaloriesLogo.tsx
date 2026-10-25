import React, { useState } from 'react';

export interface CaloriesLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'image' | 'vector';
  className?: string;
}

export const CaloriesLogo: React.FC<CaloriesLogoProps> = ({
  size = 'md',
  showTagline = true,
  variant = 'image',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const heights = {
    sm: 32,
    md: 42,
    lg: 54,
  }[size];

  // If image variant requested and no loading error occurred
  if (variant === 'image' && !imageError) {
    return (
      <div
        className={`calories-logo-container ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        <img
          src="/branding/calories-logo-horizontal.png"
          alt="Calories — Your nutrition, made clearer."
          height={heights}
          style={{
            height: `${heights}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback or explicit vector lockup
  const iconDimensions = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 48, height: 48 },
  }[size];

  const fontSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 22;
  const taglineSize = size === 'sm' ? 10 : size === 'lg' ? 12 : 11;

  return (
    <div
      className={`calories-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      <img
        src="/branding/calories-icon.png"
        alt="Calories logo icon"
        width={iconDimensions.width}
        height={iconDimensions.height}
        style={{
          width: `${iconDimensions.width}px`,
          height: `${iconDimensions.height}px`,
          objectFit: 'contain',
          borderRadius: '8px',
        }}
        onError={(e) => {
          // Fallback to SVG if png not loaded
          e.currentTarget.style.display = 'none';
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: `${fontSize}px`,
              color: 'var(--color-ink-navy)',
              letterSpacing: '-0.03em',
            }}
          >
            Calories
          </span>
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-forest-green)',
              display: 'inline-block',
              marginBottom: '4px',
            }}
            aria-hidden="true"
          />
        </div>
        {showTagline && (
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: `${taglineSize}px`,
              color: 'var(--color-forest-green)',
              letterSpacing: '0.01em',
              marginTop: '2px',
            }}
          >
            Your nutrition, made clearer.
          </span>
        )}
      </div>
    </div>
  );
};
