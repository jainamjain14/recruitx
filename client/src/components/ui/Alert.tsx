import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  className = '',
}) => {
  const styles = {
    error: {
      container: 'bg-red-50/80 border-red-200/90 text-red-900',
      icon: <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-amber-50/80 border-amber-200/90 text-amber-900',
      icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    },
    info: {
      container: 'bg-blue-50/80 border-blue-200/90 text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    },
  };

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-md border text-xs leading-relaxed transition-all duration-150 ${styles[type].container} ${className}`}
      role="alert"
    >
      {styles[type].icon}
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <p className="font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 transition-colors p-0.5 rounded"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
