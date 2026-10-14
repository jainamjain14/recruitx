import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Megaphone, AlertTriangle, Sparkles, X, ChevronRight, Clock } from 'lucide-react';

export const AnnouncementBanner: React.FC = () => {
  const { activeBanner, dismissBanner, handleClickAction } = useNotifications();

  if (!activeBanner) return null;

  // Format expiration if present
  let expiryText = '';
  if (activeBanner.expiresAt) {
    const diff = new Date(activeBanner.expiresAt).getTime() - new Date().getTime();
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      expiryText = days > 0 ? `Ends in ${days}d ${hours}h` : `Ends in ${hours} hours`;
    }
  }

  const isUrgent = activeBanner.priority === 'urgent' || activeBanner.type === 'maintenance';

  return (
    <div
      role="banner"
      aria-label="Platform Announcement"
      className={`relative z-20 px-4 py-2.5 transition-all text-xs border-b ${
        isUrgent
          ? 'bg-rose-950 text-rose-100 border-rose-900 shadow-sm'
          : 'bg-neutral-900 text-white border-neutral-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Icon, Tag & Message */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isUrgent ? 'bg-rose-900 text-rose-200' : 'bg-white/10 text-neutral-200'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : activeBanner.type === 'placement_drive' ? (
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                isUrgent ? 'bg-rose-800 text-rose-100' : 'bg-white/20 text-white'
              }`}
            >
              {activeBanner.type.replace('_', ' ')}
            </span>

            <span className="font-semibold text-white truncate max-w-xs md:max-w-md">
              {activeBanner.title}:
            </span>

            <span className="text-neutral-300 truncate max-w-xs md:max-w-lg">
              {activeBanner.message}
            </span>

            {expiryText && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                <Clock className="w-2.5 h-2.5" /> {expiryText}
              </span>
            )}
          </div>
        </div>

        {/* Right: CTA & Dismiss */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          {activeBanner.actionText && (
            <button
              onClick={() => handleClickAction(activeBanner.actionUrl, activeBanner._id)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100 transition-colors shadow-sm"
            >
              <span>{activeBanner.actionText}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => dismissBanner(activeBanner._id)}
            className="text-neutral-400 hover:text-white p-1 rounded transition-colors"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
