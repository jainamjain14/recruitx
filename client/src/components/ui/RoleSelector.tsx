import React from 'react';
import { UserRole } from '../../types/auth';
import { GraduationCap, Building2, ShieldCheck } from 'lucide-react';

interface RoleOption {
  value: UserRole;
  label: string;
  icon: React.ReactNode;
}

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  allowAdmin?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  allowAdmin = true,
}) => {
  const options: RoleOption[] = [
    {
      value: 'student',
      label: 'Student',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      value: 'recruiter',
      label: 'Recruiter',
      icon: <Building2 className="w-4 h-4" />,
    },
    ...(allowAdmin
      ? [
          {
            value: 'admin' as UserRole,
            label: 'Admin',
            icon: <ShieldCheck className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
        I am a
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-neutral-100/70 p-1.5 rounded-lg border border-neutral-200/80">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-neutral-900/20 ${
                isSelected
                  ? 'bg-white text-neutral-900 shadow-sm font-semibold border border-neutral-200/80'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
