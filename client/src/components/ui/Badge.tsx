import React from 'react';

export type BadgeVariant = 'default' | 'forest' | 'sage' | 'amber' | 'destructive' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  className = '',
  ...props
}) => {
  return (
    <span className={`calories-badge calories-badge--${variant} ${className}`} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
