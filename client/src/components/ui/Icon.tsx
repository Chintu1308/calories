import React from 'react';

export type IconName =
  | 'ai-scan'
  | 'calendar'
  | 'calories'
  | 'camera'
  | 'carbs'
  | 'check'
  | 'dashboard'
  | 'fat'
  | 'goals'
  | 'heart'
  | 'leaf'
  | 'meals'
  | 'navigation-leaf'
  | 'plus'
  | 'profile'
  | 'protein'
  | 'reports'
  | 'search'
  | 'settings'
  | 'supplements'
  | 'vitamins'
  | 'water'
  | 'weight';

export interface IconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  name: IconName;
  size?: number | string;
  className?: string;
  alt?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className = '',
  alt = '',
  style,
  ...props
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={`/icons/${name}.svg`}
      alt={alt}
      aria-hidden={!alt}
      width={dimension}
      height={dimension}
      className={`calories-icon calories-icon--${name} ${className}`}
      style={{
        width: dimension,
        height: dimension,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      loading="lazy"
      {...props}
    />
  );
};
