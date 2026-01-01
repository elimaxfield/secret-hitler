import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'liberal' | 'fascist' | 'gold' | 'success' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-sh-bg-card text-sh-text-secondary',
    liberal: 'bg-sh-liberal text-sh-text-primary',
    fascist: 'bg-sh-fascist text-sh-text-primary',
    gold: 'bg-sh-gold text-sh-bg-primary',
    success: 'bg-sh-success text-sh-text-primary',
    danger: 'bg-sh-danger text-sh-text-primary',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center font-semibold uppercase tracking-wide rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
