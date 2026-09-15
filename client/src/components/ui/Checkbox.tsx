import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={checkboxId} className="flex items-center gap-2.5 cursor-pointer select-none group">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={`w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-900/20 focus:ring-offset-0 cursor-pointer accent-neutral-900 ${className}`}
            {...props}
          />
          {label && <span className="text-xs text-neutral-700 font-normal group-hover:text-neutral-900">{label}</span>}
        </label>
        {error && <span className="text-xs text-red-600 font-medium ml-6">{error}</span>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
