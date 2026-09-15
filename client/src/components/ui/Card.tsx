import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn('bg-white border border-neutral-200/90 rounded-lg shadow-card p-6 md:p-8', className)}
      {...props}
    >
      {children}
    </div>
  );
};
