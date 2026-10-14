import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Sparkles, Check, ChevronRight, ChevronLeft, X, HelpCircle } from 'lucide-react';

interface HotspotStep {
  title: string;
  description: string;
  targetName: string;
  badge: string;
}

const TOUR_STEPS: HotspotStep[] = [
  {
    title: 'Dedicated Notification Center',
    description: 'Track application updates, interview schedules, and campus placement drives in real-time from the notification bell.',
    targetName: 'Header Bell & Slideout',
    badge: 'Real-Time Alerts',
  },
  {
    title: 'AI Mock Interview Simulator',
    description: 'Practice real technical and HR questions with instant voice/code feedback to get placement-ready.',
    targetName: 'Mock Interview AI',
    badge: 'Interview Prep',
  },
  {
    title: 'Skill Gap & Roadmap',
    description: 'Analyze your current resume against live industry job descriptions to bridge essential technical gaps.',
    targetName: 'Skill Gap Engine',
    badge: 'Career Growth',
  },
  {
    title: 'Smart Job & Drive Matching',
    description: 'Discover verified campus placement opportunities and track each application stage seamlessly.',
    targetName: 'Job Matches',
    badge: 'Placements',
  },
];

export const FeatureHotspots: React.FC = () => {
  const { isHotspotTourOpen, endHotspotTour } = useNotifications();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isHotspotTourOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      endHotspotTour();
      setCurrentStepIndex(0);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden p-6 space-y-5 animate-in zoom-in-95">
        {/* Top: Hotspot badge & step counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Hotspot • {currentStep.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-neutral-400">
              {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={endHotspotTour}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-500">
            Guiding you through: <span className="text-neutral-800">{currentStep.targetName}</span>
          </div>
          <h3 id="tour-title" className="text-base font-bold text-neutral-900">
            {currentStep.title}
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Step Dots indicator */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStepIndex ? 'w-6 bg-neutral-900' : 'w-1.5 bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <button
            onClick={endHotspotTour}
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-600"
          >
            Skip guide
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <span>{isLast ? 'Got it!' : 'Next'}</span>
              {isLast ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
