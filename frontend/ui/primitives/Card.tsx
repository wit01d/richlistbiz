import React from 'react';

export type CardVariant = 'default' | 'glass' | 'gradient' | 'bordered';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-black/40 backdrop-blur-md border border-white/5',
  glass: 'bg-black/40 backdrop-blur-xl border border-white/10',
  gradient: 'bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30',
  bordered: 'bg-black/40 backdrop-blur-md border-2',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  onClick,
  hoverable = false,
}) => {
  const baseStyles = 'rounded-2xl p-4';
  const hoverStyles = hoverable || onClick
    ? 'hover:border-neon-purple/30 transition-colors cursor-pointer group'
    : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
