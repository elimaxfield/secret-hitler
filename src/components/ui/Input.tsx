'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-sh-text-secondary uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 min-h-[44px]
            bg-sh-bg-card border border-sh-text-secondary/30 rounded-lg
            text-sh-text-primary placeholder-sh-text-secondary/50
            focus:outline-none focus:border-sh-gold focus:ring-1 focus:ring-sh-gold
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-sh-danger focus:border-sh-danger focus:ring-sh-danger' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-sh-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
