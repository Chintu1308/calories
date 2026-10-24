import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`calories-skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        backgroundColor: 'var(--color-sand-soft)',
        animation: 'calories-pulse 1.6s ease-in-out infinite',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};
