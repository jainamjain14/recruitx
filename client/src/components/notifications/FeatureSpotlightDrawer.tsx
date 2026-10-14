import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Sparkles, X, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

export const FeatureSpotlightDrawer: React.FC = () => {
  const { activeSlideout, dismissSlideout, handleClickAction } = useNotifications();

  if (!activeSlideout) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs transition-opacity"
        onClick={() => dismissSlideout(activeSlideout._id)}
      />

      {/* Slideout Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
        className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-neutral-900 to-neutral-800 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-300">
                Feature Spotlight
              </span>
              <h3 id="spotlight-title" className="text-sm font-bold text-white">
                What's New in RecruitX
              </h3>
            </div>
          </div>

          <button
            onClick={() => dismissSlideout(activeSlideout._id)}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss spotlight"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {activeSlideout.type.replace('_', ' ')}
            </span>
            <h4 className="text-base font-bold text-neutral-900">
              {activeSlideout.title}
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {activeSlideout.message}
            </p>
          </div>

          {/* Value highlights */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
            <h5 className="text-xs font-semibold text-neutral-900">Why try this feature:</h5>
            <ul className="text-xs text-neutral-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>AI-assisted evaluation tailored for campus recruitment drives</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Instant feedback to boost your interview readiness</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Track your performance benchmarks over time</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3">
          <button
            onClick={() => dismissSlideout(activeSlideout._id)}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
          >
            Explore later
          </button>

          {activeSlideout.actionText && (
            <button
              onClick={() => {
                handleClickAction(activeSlideout.actionUrl, activeSlideout._id);
                dismissSlideout(activeSlideout._id);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-sm transition-all"
            >
              <span>{activeSlideout.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
