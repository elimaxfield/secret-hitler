import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  header,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  };

  return (
    <div
      className={`
        bg-sh-bg-card rounded-lg shadow-lg
        border border-sh-text-secondary/10
        ${className}
      `}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-sh-text-secondary/10">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
}
