import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import {
  Sparkles,
  Award,
  Video,
  AlertCircle,
  X,
  ChevronRight,
  Calendar,
} from 'lucide-react';

export const NotificationModal: React.FC = () => {
  const { activeModal, dismissModal, handleClickAction } = useNotifications();

  if (!activeModal) return null;

  const isInterview = activeModal.type === 'interview_invite';
  const isDriveOrOffer = activeModal.type === 'placement_drive';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Optional Top Decorative Image or Accent Header */}
        {activeModal.imageUrl ? (
          <div className="relative h-44 w-full bg-neutral-900 overflow-hidden">
            <img
              src={activeModal.imageUrl}
              alt="Notification banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div
            className={`px-6 pt-6 pb-4 border-b ${
              isInterview
                ? 'bg-purple-50/60 border-purple-100'
                : isDriveOrOffer
                ? 'bg-amber-50/60 border-amber-100'
                : 'bg-neutral-50/60 border-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl shadow-xs ${
                    isInterview
                      ? 'bg-purple-600 text-white'
                      : isDriveOrOffer
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-900 text-white'
                  }`}
                >
                  {isInterview ? (
                    <Video className="w-5 h-5" />
                  ) : isDriveOrOffer ? (
                    <Award className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                    {activeModal.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-200/70 text-neutral-700">
                      {activeModal.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => dismissModal(activeModal._id)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-neutral-900 tracking-tight">
              {activeModal.title}
            </h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed whitespace-pre-line">
              {activeModal.message}
            </p>
          </div>

          {/* Additional details card if it's an interview or drive */}
          {activeModal.metadata?.meetingLink && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-700">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span>Google Meet Link Attached</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Online Session
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
            <button
              onClick={() => dismissModal(activeModal._id)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Remind Me Later
            </button>

            {activeModal.actionText && (
              <button
                onClick={() => {
                  handleClickAction(activeModal.actionUrl, activeModal._id);
                  dismissModal(activeModal._id);
                }}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-md transition-all ${
                  isInterview
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                    : isDriveOrOffer
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20'
                }`}
              >
                <span>{activeModal.actionText}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
