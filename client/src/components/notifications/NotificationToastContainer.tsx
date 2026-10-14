import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { ToastItem, NotificationType } from '../../types/notification';
import {
  Bell,
  Briefcase,
  Video,
  Sparkles,
  Megaphone,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const getTypeDetails = (type?: NotificationType) => {
  switch (type) {
    case 'interview_invite':
      return {
        icon: <Video className="w-4 h-4 text-purple-600" />,
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        barColor: 'bg-purple-500',
      };
    case 'application_update':
      return {
        icon: <Briefcase className="w-4 h-4 text-blue-600" />,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        barColor: 'bg-blue-500',
      };
    case 'placement_drive':
      return {
        icon: <Megaphone className="w-4 h-4 text-amber-600" />,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-500',
      };
    case 'job_alert':
      return {
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500',
      };
    case 'maintenance':
      return {
        icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        barColor: 'bg-rose-500',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4 text-neutral-600" />,
        badgeColor: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        barColor: 'bg-neutral-900',
      };
  }
};

export const NotificationToastContainer: React.FC = () => {
  const { toasts, removeToast, handleClickAction } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="System Notifications" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast: ToastItem) => {
        const details = getTypeDetails(toast.type);

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md rounded-xl border border-neutral-200/90 shadow-xl p-4 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5"
          >
            {/* Top row: Icon, Category tag, Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0">
                  {details.icon}
                </div>
                {toast.type && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${details.badgeColor}`}>
                    {toast.type.replace('_', ' ')}
                  </span>
                )}
                {toast.priority === 'urgent' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    Urgent
                  </span>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification content */}
            <div className="mt-2.5">
              <h4 className="text-xs font-bold text-neutral-900 leading-snug">{toast.title}</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed line-clamp-3">{toast.message}</p>
            </div>

            {/* Action CTA Button */}
            {toast.actionText && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-end">
                <button
                  onClick={() => {
                    handleClickAction(toast.actionUrl, toast.announcementId);
                    removeToast(toast.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
                >
                  <span>{toast.actionText}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Auto-dismiss animated bottom progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 ${details.barColor} animate-toast-progress`}
              style={{ animationDuration: `${toast.durationMs || 5000}ms` }}
            />
          </div>
        );
      })}
    </aside>
  );
};
