import React from 'react';
import logoImg from '../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const heights = { sm: 'h-10', md: 'h-14', lg: 'h-16' };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoImg}
        alt="RecruitX"
        className={`${heights[size]} w-auto object-contain`}
      />
    </div>
  );
};
