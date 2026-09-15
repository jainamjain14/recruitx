import React from 'react';

interface PasswordStrengthMeterProps {
  password?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
}) => {
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[a-z]/.test(pass)) score += 20;
    if (/\d/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;
    return score;
  };

  const strength = calculateStrength(password);

  const getLabelAndColor = (score: number) => {
    if (score === 0) return { label: '', color: 'bg-neutral-200' };
    if (score < 45) return { label: 'Weak password', color: 'bg-red-500' };
    if (score < 75) return { label: 'Medium strength', color: 'bg-amber-500' };
    return { label: 'Strong password', color: 'bg-emerald-600' };
  };

  const { label, color } = getLabelAndColor(strength);

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-neutral-500">
          Password strength
        </span>
        <span className="text-[11px] font-semibold text-neutral-700">
          {label}
        </span>
      </div>
      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden border border-neutral-200/60">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width: `${strength}%` }}
        />
      </div>
    </div>
  );
};
