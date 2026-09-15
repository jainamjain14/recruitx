import React, { LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`text-xs font-semibold text-neutral-700 tracking-wide uppercase ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};
