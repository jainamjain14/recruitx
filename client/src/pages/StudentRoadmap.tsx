import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import {
  CheckCircle2,
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
  ExternalLink,
  Award,
  Star,
  ShieldCheck,
  GraduationCap,
  AlertTriangle,
  X,
  BookOpen,
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

export interface CourseraCourseItem {
  id: string;
  title: string;
  provider: string;
  domain: string;
  pricingType: 'free' | 'paid' | 'both';
  pricingLabel: string;
  courseraUrl: string;
  duration: string;
  rating: number;
  enrolledCount: string;
  level: string;
  skillsCovered: string[];
  description: string;
  certificateType: string;
  isCompleted: boolean;
  completionDetails?: {
    completedAt: string;
    verificationMethod: string;
    certificateUrl?: string;
    certificateId?: string;
    skillsAcquired: string[];
  } | null;
  matchedMissingSkills: string[];
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
        actionUrl: '/student/roadmap',
        actionLabel: 'Review Missing Skills',
      },
      {
        title: 'Content & Viral Distribution Strategy',
        desc: 'Architect viral loops, SEO content funnels, and organic brand amplification campaigns.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Recruiters',
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
        actionUrl: '/student/roadmap',
        actionLabel: 'Analyze Tech Stack Gaps',
      },
      {
        title: 'Technical Screenings & Recruiter Outreach',
        desc: 'Refine technical communication and architectural reasoning for employer discussions.',
        actionUrl: '/student/messages',
        actionLabel: 'Message Recruiters',
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
        actionUrl: '/student/roadmap',
        actionLabel: 'Review Design Tools Gap',
      },
      {
        title: 'Portfolio Critique & Recruiter Discussions',
        desc: 'Engage with hiring teams to present interactive design prototypes and user journeys.',
        actionUrl: '/student/messages',
        actionLabel: 'Connect with Hiring Teams',
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
        actionUrl: '/student/roadmap',
        actionLabel: 'Check Production Skills',
      },
      {
        title: 'Creative Pitch & Studio Communication',
        desc: 'Demonstrate directorial vision, scene blocking leadership, and tension-building skills to studios.',
        actionUrl: '/student/messages',
        actionLabel: 'Pitch to Producers',
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
        actionUrl: '/student/roadmap',
        actionLabel: 'Check Lighting & Optics Gap',
      },
      {
        title: 'Color Science & Production Outreach',
        desc: 'Engage with production units on ACES pipelines, DaVinci Resolve color grading, and on-set DIT communication.',
        actionUrl: '/student/messages',
        actionLabel: 'Message Production Units',
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

  // Coursera Courses Integrated State
  const [courses, setCourses] = useState<CourseraCourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Coursera Verification Modal State
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseraCourseItem | null>(null);
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  const storageKey = `recruitx_roadmap_progress_${activeDomain}`;

  useEffect(() => {
    fetchStudentStatus();
    fetchCourseraCourses();
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

  const fetchCourseraCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await api.get('/courses/recommended?pricing=all');
      if (res.data?.data?.courses) {
        setCourses(res.data.data.courses);
      }
    } catch (err) {
      console.error('Failed to fetch Coursera courses for roadmap:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

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

  const openVerifyModal = (course: CourseraCourseItem) => {
    setSelectedCourseForModal(course);
    setCertInput(course.completionDetails?.certificateUrl || '');
    setVerifyError(null);
    setVerifySuccess(null);
  };

  const closeVerifyModal = () => {
    setSelectedCourseForModal(null);
    setCertInput('');
    setVerifyError(null);
    setVerifySuccess(null);
  };

  const handleVerifyCertificate = async () => {
    if (!selectedCourseForModal) return;
    if (!certInput.trim()) {
      setVerifyError('Please enter a Coursera certificate verification URL or Certificate ID.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await api.post('/courses/verify', {
        courseId: selectedCourseForModal.id,
        certificateUrlOrCode: certInput.trim(),
      });

      if (res.data?.success) {
        setVerifySuccess(res.data.message || 'Coursera certificate authenticated!');
        await fetchCourseraCourses();
        setTimeout(() => {
          closeVerifyModal();
        }, 1600);
      } else {
        setVerifyError(res.data?.message || 'Verification failed. Please check the URL.');
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkAudit = async (course: CourseraCourseItem) => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await api.post('/courses/mark-audit', { courseId: course.id });
      if (res.data?.success) {
        setVerifySuccess('Course marked completed! Skills synced to your profile.');
        await fetchCourseraCourses();
        setTimeout(() => {
          closeVerifyModal();
        }, 1400);
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || err.message || 'Failed to mark course completed.');
    } finally {
      setVerifying(false);
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

  /**
   * Intelligently assign Coursera courses to each milestone step
   */
  const getCoursesForStep = (stepIdx: number): CourseraCourseItem[] => {
    if (!courses || courses.length === 0) return [];
    // Distribute available courses evenly across the 5 steps or map by index
    const perStep = Math.max(1, Math.ceil(courses.length / 5));
    const start = (stepIdx * perStep) % courses.length;
    return courses.slice(start, start + 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Career & Placement Roadmap</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Coursera Integrated
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Step-by-step career milestones integrated directly with authorized university Coursera courses.
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
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Coursera Powered
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {completedCount === 5
                  ? 'All 5 milestones completed! Your placement profile is market-ready.'
                  : `Milestone ${completedCount + 1} of 5 in progress. Complete it or verify its Coursera courses to unlock the next milestone.`}
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

      {/* Sequential Milestone Steps with Embedded Coursera Courses */}
      <Card className="p-6">
        <div className="space-y-8">
          {milestones.map((step, idx) => {
            const stepCourses = getCoursesForStep(idx);

            return (
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
                      className={`w-0.5 my-1 transition-colors flex-1 ${
                        idx < completedCount ? 'bg-emerald-500' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>

                {/* Milestone Details */}
                <div className="pt-0.5 flex-1 space-y-3">
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

                  {/* ============================================================== */}
                  {/* EMBEDDED COURSERA COURSES FOR THIS MILESTONE STEP */}
                  {/* ============================================================== */}
                  {stepCourses.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
                        <span className="p-1 rounded bg-blue-600 text-white font-black text-[9px] tracking-wider leading-none">
                          coursera
                        </span>
                        <span>Recommended Coursera Courses for Step {idx + 1}:</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stepCourses.map((c) => (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between space-y-2 transition-all ${
                              c.isCompleted
                                ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                                : 'bg-neutral-50/70 border-neutral-200 hover:bg-white hover:border-neutral-300'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                                    {c.provider}
                                  </span>
                                  <h4 className="font-bold text-neutral-900 text-xs line-clamp-1">
                                    {c.title}
                                  </h4>
                                </div>

                                {c.isCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-700 uppercase tracking-wider shrink-0">
                                    {c.pricingType === 'free' ? 'Free Audit' : 'Cert Available'}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-neutral-500 line-clamp-2">{c.description}</p>

                              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {c.rating}
                                </span>
                                <span>• {c.duration}</span>
                                <span>• {c.level}</span>
                              </div>

                              {/* Skills Covered */}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {c.skillsCovered.slice(0, 3).map((sk) => (
                                  <span key={sk} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-700 font-medium">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between gap-2">
                              <a
                                href={c.courseraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <span>Open Course</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>

                              {c.isCompleted ? (
                                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Skills Added
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openVerifyModal(c)}
                                  className="text-[10px] font-bold px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-1"
                                >
                                  <Award className="w-2.5 h-2.5 text-amber-300" />
                                  Verify / Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Bar for Current Step */}
                  {step.status === 'in_progress' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
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
            );
          })}
        </div>
      </Card>

      {/* ============================================================== */}
      {/* COURSERA VERIFICATION MODAL IN ROADMAP */}
      {/* ============================================================== */}
      {selectedCourseForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-neutral-200">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-blue-600 text-white font-black text-[10px] tracking-wider">
                    coursera
                  </span>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Certificate Verification
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  {selectedCourseForModal.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  Authorized by <strong className="text-neutral-800">{selectedCourseForModal.provider}</strong>
                </p>
              </div>

              <button
                onClick={closeVerifyModal}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {verifyError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifySuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{verifySuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">
                Coursera Certificate URL or Certificate ID:
              </label>
              <Input
                type="text"
                placeholder="https://www.coursera.org/verify/XXXXXX or Certificate ID"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                disabled={verifying}
                className="text-xs"
              />
              <Button
                onClick={handleVerifyCertificate}
                disabled={verifying || !certInput.trim()}
                className="w-full text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white mt-1"
              >
                <Award className="w-3.5 h-3.5" />
                {verifying ? 'Authenticating with Coursera...' : 'Verify Certificate & Award Skills'}
              </Button>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-neutral-400">
                <span className="bg-white px-2">OR Free Audit Track</span>
              </div>
            </div>

            <div className="space-y-2 text-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[11px] text-neutral-600">
                Learned via Coursera&apos;s <strong>100% Free Audit Mode</strong>?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAudit(selectedCourseForModal)}
                disabled={verifying}
                className="text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirm Free Audit Completion</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
