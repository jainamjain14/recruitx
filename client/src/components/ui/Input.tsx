import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-neutral-700 tracking-wide uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-neutral-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`w-full bg-white text-neutral-900 text-sm rounded-md border transition-all duration-150 shadow-subtle placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-neutral-200'
            } h-10 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-neutral-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-red-600 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-neutral-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
