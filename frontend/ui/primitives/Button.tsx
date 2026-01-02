import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon-pink' | 'neon-purple' | 'neon-blue';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-[0_0_20px_rgba(191,0,255,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.6)]',
  secondary: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30',
  ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5',
  'neon-pink': 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50 hover:bg-neon-pink/30',
  'neon-purple': 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/30',
  'neon-blue': 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30',
};

const activeVariantStyles: Record<ButtonVariant, string> = {
  primary: 'shadow-[0_0_40px_rgba(255,0,255,0.6)]',
  secondary: 'bg-white/20 text-white border-white/30',
  danger: 'bg-red-500/40',
  ghost: 'bg-white/10 text-white',
  'neon-pink': 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,45,117,0.4)]',
  'neon-purple': 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]',
  'neon-blue': 'bg-neon-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  isActive = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100';

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${isActive ? activeVariantStyles[variant] : ''}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;
