import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Clapperboard,
  Camera,
  Code2,
  TrendingUp,
  Palette,
  Lock,
  ArrowRight,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MilestoneItem {
  title: string;
  desc: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface Milestone extends MilestoneItem {
  status: 'completed' | 'in_progress' | 'pending';
}

const DOMAIN_ROADMAPS: Record<string, { label: string; icon: any; milestones: MilestoneItem[] }> = {
  marketing: {
    label: 'Product Marketing & Growth Track',
    icon: TrendingUp,
    milestones: [
      {
        title: 'Market Research & Audience Persona Mapping',
        desc: 'Define target customer personas, competitive landscape, and value proposition hooks.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Profile & Bio',
      },
      {
        title: 'Performance Marketing & Ad Spend ROI',
        desc: 'Run multi-channel campaign simulations, Google Ads/Meta attribution, and CAC/LTV calculations.',
        actionUrl: '/student/skill-gap',
        actionLabel: 'Review Skill Gap',
      },
      {
        title: 'Content & Viral Distribution Strategy',
        desc: 'Architect viral loops, SEO content funnels, and organic brand amplification campaigns.',
        actionUrl: '/student/mock-interview',
        actionLabel: 'Take Growth Mock Interview',
      },
      {
        title: 'Growth Case Study Presentation',
        desc: 'Synthesize product launch metrics and conversion rate optimization experiments into a deck.',
        actionUrl: '/student/resume',
        actionLabel: 'Upload Case Study & Portfolio',
      },
      {
        title: 'Agency & Enterprise Growth Role Applications',
        desc: 'Pitch growth roadmaps and apply to leading consumer brands, agencies, and tech scale-ups.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Matching Jobs',
      },
    ],
  },
  software: {
    label: 'Software Engineering Track',
    icon: Code2,
    milestones: [
      {
        title: 'Core Programming & Data Structures Foundations',
        desc: 'Solidify algorithmic complexity, data structures, and modular architectural design.',
        actionUrl: '/student/resume',
        actionLabel: 'Verify Tech Skills',
      },
      {
        title: 'Production Full-Stack Application & System Design',
        desc: 'Build and deploy scalable, database-backed products with authentication and caching layers.',
        actionUrl: '/student/skill-gap',
        actionLabel: 'Analyze Tech Stack Gaps',
      },
      {
        title: 'AI Mock Screenings & Technical Whiteboarding',
        desc: 'Complete timed technical interviews and architectural reasoning simulations.',
        actionUrl: '/student/mock-interview',
        actionLabel: 'Start AI Mock Interview',
      },
      {
        title: 'Clean Architecture Portfolio & GitHub Assembly',
        desc: 'Package deployable projects with comprehensive READMEs and production CI/CD.',
        actionUrl: '/student/resume',
        actionLabel: 'Attach GitHub & Projects',
      },
      {
        title: 'Enterprise & Tech Scale-Up Applications',
        desc: 'Apply directly to verified tech openings matching your verified tech competencies.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Tech Jobs',
      },
    ],
  },
  design: {
    label: 'UI/UX & Product Design Track',
    icon: Palette,
    milestones: [
      {
        title: 'Design Thinking & Information Architecture',
        desc: 'Conduct user research interviews, empathy mapping, and low-fidelity wireframing.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Design Profile',
      },
      {
        title: 'Design Systems & Component Architecture',
        desc: 'Build comprehensive tokenized Figma design systems with auto-layout and interactive states.',
        actionUrl: '/student/skill-gap',
        actionLabel: 'Review Design Tools Gap',
      },
      {
        title: 'Usability Testing & Design Critique Interview',
        desc: 'Practice product design critique and behavioral questions via AI simulation.',
        actionUrl: '/student/mock-interview',
        actionLabel: 'Practice Design Interview',
      },
      {
        title: 'End-to-End Product Design Case Study',
        desc: 'Publish a polished case study documenting problem discovery, user journeys, and UX solutions.',
        actionUrl: '/student/resume',
        actionLabel: 'Link Figma / Portfolio',
      },
      {
        title: 'Studio & Tech Product Design Applications',
        desc: 'Submit portfolio case studies to digital product studios, consumer tech companies, and UX agencies.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Design Roles',
      },
    ],
  },
  film: {
    label: 'Film Direction & Production Track',
    icon: Clapperboard,
    milestones: [
      {
        title: 'Screenplay & Visual Grammar Treatment',
        desc: 'Craft your 3-act narrative treatment, scene blocking schematics, and directorial statement.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Film Profile',
      },
      {
        title: 'Storyboarding & Camera Framing Plan',
        desc: 'Develop master shot lists, storyboard pivotal dramatic beats, and determine visual motif.',
        actionUrl: '/student/skill-gap',
        actionLabel: 'Check Production Skills',
      },
      {
        title: 'Directing Simulation & Creative Pitch Interview',
        desc: 'Demonstrate directorial vision, scene blocking leadership, and tension-building skills.',
        actionUrl: '/student/mock-interview',
        actionLabel: 'Take Creative Mock Round',
      },
      {
        title: 'Director’s Showreel & Pitch Package',
        desc: 'Cut a 90-second director’s reel showcasing cinematic pacing, audio-visual dynamics, and visual tone.',
        actionUrl: '/student/resume',
        actionLabel: 'Add Showreel Link',
      },
      {
        title: 'Studio Pitching & Directorial Applications',
        desc: 'Pitch spec projects and apply to major production studios and OTT production houses.',
        actionUrl: '/student/jobs',
        actionLabel: 'Browse Creative Jobs',
      },
    ],
  },
  cinematography: {
    label: 'Cinematography & Camera Operations Track',
    icon: Camera,
    milestones: [
      {
        title: 'Camera Sensors & Prime Lens Schematics',
        desc: 'Master Arri / RED / FX9 sensor physics, anamorphic vs spherical glass, and optical compression.',
        actionUrl: '/student/resume',
        actionLabel: 'Update Camera Experience',
      },
      {
        title: 'Lighting Schematics & Contrast Ratios',
        desc: 'Execute low-key noir, 3-point dramatic lighting, and soft-box diffusion setups with negative fill.',
        actionUrl: '/student/skill-gap',
        actionLabel: 'Check Lighting & Optics Gap',
      },
      {
        title: 'Color Science & Technical Mock Screening',
        desc: 'Test knowledge on ACES pipelines, DaVinci Resolve color grading, and on-set DIT communication.',
        actionUrl: '/student/mock-interview',
        actionLabel: 'Take Technical Camera Interview',
      },
      {
        title: 'Cinematography Showreel Assembly',
        desc: 'Compile a 60-second DP reel showing diverse lighting conditions, gimbal motion, and depth of field.',
        actionUrl: '/student/resume',
        actionLabel: 'Link DP Reel',
      },
      {
        title: 'Studio & Commercial Production Applications',
        desc: 'Submit camera crew & DP reels to feature film units, commercial houses, and streaming productions.',
        actionUrl: '/student/jobs',
        actionLabel: 'Explore Camera Openings',
      },
    ],
  },
};

export const StudentRoadmap: React.FC = () => {
  const navigate = useNavigate();
  const [activeDomain, setActiveDomain] = useState<string>('software');
  const [customMilestones, setCustomMilestones] = useState<MilestoneItem[] | null>(null);
  const [customTrackTitle, setCustomTrackTitle] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const storageKey = `recruitx_roadmap_progress_${activeDomain}`;

  useEffect(() => {
    fetchStudentStatus();
  }, []);

  // Sync completion count with localStorage whenever domain changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
        setCompletedCount(parsed);
      }
    }
  }, [activeDomain, storageKey]);

  const fetchStudentStatus = async () => {
    setLoading(true);
    try {
      const [resRes, appRes, roadmapRes] = await Promise.allSettled([
        api.get('/resume'),
        api.get('/applications'),
        api.get('/resume/roadmap'),
      ]);

      let domainKey = 'software';
      let hasProfile = false;
      let hasApplied = false;

      if (resRes.status === 'fulfilled' && resRes.value.data?.data?.resume) {
        const resume = resRes.value.data.data.resume;
        const interest = `${resume.fieldOfInterest || ''} ${resume.headline || ''}`.toLowerCase();
        if (interest.includes('camera') || interest.includes('cinematograph')) {
          domainKey = 'cinematography';
        } else if (interest.includes('market') || interest.includes('growth')) {
          domainKey = 'marketing';
        } else if (interest.includes('design') || interest.includes('ui') || interest.includes('ux')) {
          domainKey = 'design';
        } else if (interest.includes('film') || interest.includes('director') || interest.includes('movie')) {
          domainKey = 'film';
        } else {
          domainKey = 'software';
        }

        if (resume.headline && (resume.skills?.length || 0) >= 2) {
          hasProfile = true;
        }
      }

      if (appRes.status === 'fulfilled' && (appRes.value.data?.data?.applications?.length || 0) > 0) {
        hasApplied = true;
      }

      setActiveDomain(domainKey);

      // Check if backend returned an AI generated roadmap
      if (roadmapRes.status === 'fulfilled' && roadmapRes.value.data?.data?.roadmap) {
        const rData = roadmapRes.value.data.data.roadmap;
        if (Array.isArray(rData.milestones) && rData.milestones.length === 5) {
          setCustomMilestones(rData.milestones);
          setCustomTrackTitle(rData.trackTitle || null);
          setIsAiGenerated(true);
        }
      }

      // Initialize sequential baseline progress:
      // If profile is complete, student has at least completed step 1 (index 0)
      const savedCount = localStorage.getItem(`recruitx_roadmap_progress_${domainKey}`);
      if (savedCount !== null) {
        setCompletedCount(Math.min(5, Math.max(0, parseInt(savedCount, 10) || 0)));
      } else {
        const initialCount = hasApplied ? 4 : hasProfile ? 1 : 0;
        setCompletedCount(initialCount);
        localStorage.setItem(`recruitx_roadmap_progress_${domainKey}`, String(initialCount));
      }
    } catch (err) {
      console.error('Failed to load roadmap status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateWithAI = async () => {
    setGeneratingAI(true);
    try {
      const res = await api.get('/resume/roadmap');
      if (res.data?.data?.roadmap) {
        const rData = res.data.data.roadmap;
        if (Array.isArray(rData.milestones) && rData.milestones.length === 5) {
          setCustomMilestones(rData.milestones);
          setCustomTrackTitle(rData.trackTitle || null);
          setIsAiGenerated(true);
        }
      }
    } catch (err) {
      console.error('Failed to generate AI roadmap:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const activeMilestones: MilestoneItem[] =
    customMilestones && isAiGenerated
      ? customMilestones
      : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).milestones;

  const currentTrackLabel =
    customTrackTitle && isAiGenerated
      ? customTrackTitle
      : (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).label;

  const DomainIcon = (DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.software).icon;

  /**
   * Strictly Sequential Milestone Status Assignment:
   * Milestones 0 to (completedCount - 1) => 'completed'
   * Milestone completedCount            => 'in_progress'
   * Milestones (completedCount + 1)+    => 'pending' (locked)
   */
  const milestones: Milestone[] = activeMilestones.map((m, idx) => {
    let status: 'completed' | 'in_progress' | 'pending';
    if (idx < completedCount) {
      status = 'completed';
    } else if (idx === completedCount) {
      status = 'in_progress';
    } else {
      status = 'pending';
    }
    return { ...m, status };
  });

  const markCurrentComplete = () => {
    if (completedCount < 5) {
      const next = completedCount + 1;
      setCompletedCount(next);
      localStorage.setItem(storageKey, String(next));
    }
  };

  const rollbackStep = () => {
    if (completedCount > 0) {
      const prev = completedCount - 1;
      setCompletedCount(prev);
      localStorage.setItem(storageKey, String(prev));
    }
  };

  const resetAll = () => {
    setCompletedCount(0);
    localStorage.setItem(storageKey, '0');
  };

  const progressPercent = Math.round((completedCount / 5) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Career & Placement Roadmap</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              {isAiGenerated ? 'Gemini AI Tailored' : 'Sequential Track'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Step-by-step career milestones. Each step unlocks in strict sequential order.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateWithAI}
            disabled={generatingAI}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generatingAI ? 'animate-spin' : ''}`} />
            {generatingAI ? 'Generating...' : 'Regenerate with Gemini AI'}
          </Button>

          {/* Domain Switcher */}
          <div className="hidden lg:flex flex-wrap gap-1">
            {Object.entries(DOMAIN_ROADMAPS).map(([key, item]) => {
              const Icon = item.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveDomain(key);
                    setIsAiGenerated(false);
                    setCustomMilestones(null);
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                    activeDomain === key && !isAiGenerated
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Track Banner & Progress Bar */}
      <Card className="p-4 bg-neutral-50 border-neutral-300 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-neutral-900 text-white">
              <DomainIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900">{currentTrackLabel}</h2>
                {isAiGenerated && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                    Live AI Generated
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {completedCount === 5
                  ? 'All 5 milestones completed! Your placement profile is market-ready.'
                  : `Milestone ${completedCount + 1} of 5 in progress. Complete it to unlock the next milestone.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {completedCount > 0 && (
              <button
                onClick={rollbackStep}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                title="Undo last completed step"
              >
                <RotateCcw className="w-3 h-3" />
                Undo Step
              </button>
            )}
            <button
              onClick={resetAll}
              className="text-[11px] text-neutral-400 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold text-neutral-700">
            <span>Overall Career Readiness</span>
            <span>{progressPercent}% Completed ({completedCount}/5 Milestones)</span>
          </div>
          <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Sequential Milestone Steps */}
      <Card className="p-6">
        <div className="space-y-6">
          {milestones.map((step, idx) => (
            <div key={step.title} className="flex gap-4">
              {/* Timeline Connector & Status Icon */}
              <div className="flex flex-col items-center">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : step.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                ) : (
                  <Lock className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                )}
                {idx !== milestones.length - 1 && (
                  <div
                    className={`w-0.5 h-16 my-1 transition-colors ${
                      idx < completedCount ? 'bg-emerald-500' : 'bg-neutral-200'
                    }`}
                  />
                )}
              </div>

              {/* Milestone Details */}
              <div className="pt-0.5 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-400">Step {idx + 1}</span>
                    <h3
                      className={`text-sm font-semibold ${
                        step.status === 'completed'
                          ? 'text-neutral-900 line-through opacity-80'
                          : step.status === 'in_progress'
                          ? 'text-neutral-900 font-bold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      step.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : step.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                    }`}
                  >
                    {step.status === 'completed'
                      ? 'Completed'
                      : step.status === 'in_progress'
                      ? 'In Progress'
                      : 'Locked'}
                  </span>
                </div>

                <p
                  className={`text-xs ${
                    step.status === 'pending' ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  {step.desc}
                </p>

                {/* Interactive Action Bar for Current Step */}
                {step.status === 'in_progress' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    {step.actionUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(step.actionUrl!)}
                        className="text-xs gap-1.5 h-7"
                      >
                        <span>{step.actionLabel || 'Go to Task'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={markCurrentComplete}
                      className="text-xs gap-1.5 h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Step {idx + 1} Complete</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
