import React from 'react';

export type ProgressVariant = 'forest' | 'sage' | 'amber' | 'destructive';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  unit?: string;
  variant?: ProgressVariant;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  unit = '',
  variant = 'forest',
  showPercentage = false,
  className = '',
}) => {
  const safeMax = max > 0 ? max : 1;
  const rawPercentage = Math.round((value / safeMax) * 100);
  const clampedPercentage = Math.min(Math.max(rawPercentage, 0), 100);

  return (
    <div className={`calories-progress-container ${className}`}>
      {(label || showPercentage) && (
        <div className="calories-progress-labels">
          {label && <span className="calories-progress-title">{label}</span>}
          <span className="calories-progress-stats">
            {value.toLocaleString()} / {max.toLocaleString()} {unit}
            {showPercentage && ` (${rawPercentage}%)`}
          </span>
        </div>
      )}
      <div
        className="calories-progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`calories-progress-fill calories-progress-fill--${variant}`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
};
