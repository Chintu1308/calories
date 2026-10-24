import React from 'react';

export interface CaloriesLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const CaloriesLogo: React.FC<CaloriesLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { width: 28, height: 28, text: 'text-base', tagline: 'text-xs' },
    md: { width: 36, height: 36, text: 'text-xl', tagline: 'text-xs' },
    lg: { width: 48, height: 48, text: 'text-2xl', tagline: 'text-sm' },
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
      {/* Brand Icon SVG */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Calories brand icon"
        style={{ flexShrink: 0 }}
      >
        <rect width="64" height="64" rx="16" fill="#152238" />
        <circle cx="32" cy="32" r="22" fill="#285B46" />
        <path
          d="M32 16C32 16 45 23 45 35C45 43 39 48 32 48C25 48 19 43 19 35C19 23 32 16 32 16Z"
          fill="#BFD8C2"
        />
        <path
          d="M32 16C32 16 43 25 40 37C36 32 32 28 26 26C21 24 19 35 19 35C19 23 32 16 32 16Z"
          fill="#285B46"
        />
        <circle cx="32" cy="33" r="4.5" fill="#FAF9F6" />
        <circle cx="32" cy="33" r="2" fill="#152238" />
      </svg>

      {/* Brand Typography */}
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
              fontWeight: 500,
              fontSize: `${taglineSize}px`,
              color: 'var(--color-muted-slate)',
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
