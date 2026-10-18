import React from 'react';
import logoImg from '../assets/logo2-removebg-preview.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const heights = { sm: 'h-8', md: 'h-10', lg: 'h-12' };

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
