import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { CheckCircle2, Circle, Clock, Sparkles, Clapperboard, Camera, Code2, PenTool, TrendingUp, Palette } from 'lucide-react';

interface Milestone {
  title: string;
  desc: string;
  status: 'completed' | 'in_progress' | 'pending';
}

const DOMAIN_ROADMAPS: Record<string, { label: string; icon: any; milestones: { title: string; desc: string }[] }> = {
  film: {
    label: 'Film Direction & Production Track',
    icon: Clapperboard,
    milestones: [
      { title: 'Screenplay & Visual Grammar Treatment', desc: 'Craft your 3-act narrative treatment, scene blocking schematics, and directorial statement.' },
      { title: 'Storyboarding & Camera Framing Plan', desc: 'Develop master shot lists, storyboard pivotal dramatic beats, and determine visual motif.' },
      { title: 'Directing Short Film / Spec Sequence', desc: 'Direct a high-impact 3-5 minute narrative short or spec scene demonstrating actor blocking & tension.' },
      { title: 'Director’s Showreel & Pitch Package', desc: 'Cut a 90-second director’s reel showcasing cinematic pacing, audio-visual dynamics, and visual tone.' },
      { title: 'Studio Pitching & Directorial Applications', desc: 'Pitch spec projects and apply to major production studios (YRF, Dharma, Excel, RSVP, Roy Kapur).' },
    ],
  },
  cinematography: {
    label: 'Cinematography & Camera Operations Track',
    icon: Camera,
    milestones: [
      { title: 'Camera Sensors & Prime Lens Schematics', desc: 'Master Arri / RED / FX9 sensor physics, anamorphic vs spherical glass, and optical compression.' },
      { title: 'Lighting Schematics & Contrast Ratios', desc: 'Execute low-key noir, 3-point dramatic lighting, and soft-box diffusion setups with negative fill.' },
      { title: 'Color Science & RAW Grading Workflow', desc: 'Build camera LUTs, manage ACES color pipeline, and master DaVinci Resolve color grading.' },
      { title: 'Cinematography Showreel Assembly', desc: 'Compile a 60-second DP reel showing diverse lighting conditions, Steadicam/gimbal motion, and depth of field.' },
      { title: 'Studio & Commercial Production Applications', desc: 'Submit camera crew & DP reels to feature film units, commercial production houses, and OTT series.' },
    ],
  },
  software: {
    label: 'Software Engineering Track',
    icon: Code2,
    milestones: [
      { title: 'Core Programming & Foundations', desc: 'Master data structures, algorithms, and modular architectural design.' },
      { title: 'Production Full-Stack Application', desc: 'Build and deploy a scalable, database-backed web or mobile product with real authentication.' },
      { title: 'System Design & High Availability', desc: 'Learn microservices, caching layers (Redis), and REST/GraphQL API performance optimization.' },
      { title: 'AI Mock Screenings & Code Interviews', desc: 'Complete timed technical interviews and system architecture design whiteboard challenges.' },
      { title: 'Enterprise & Tech Campus Applications', desc: 'Apply to top tech product firms, enterprise platforms, and innovative startups.' },
    ],
  },
  marketing: {
    label: 'Product Marketing & Growth Track',
    icon: TrendingUp,
    milestones: [
      { title: 'Market Research & Audience Persona Mapping', desc: 'Define target customer personas, competitive landscape, and value proposition hooks.' },
      { title: 'Performance Marketing & Ad Spend ROI', desc: 'Run multi-channel campaign simulations, Google Ads/Meta attribution, and CAC/LTV calculations.' },
      { title: 'Content & Viral Distribution Strategy', desc: 'Architect viral loops, SEO content funnels, and organic brand amplification campaigns.' },
      { title: 'Growth Case Study Presentation', desc: 'Synthesize product launch metrics and conversion rate optimization experiments into a deck.' },
      { title: 'Agency & Enterprise Growth Role Applications', desc: 'Pitch growth roadmaps and apply to leading consumer brands, agencies, and tech scale-ups.' },
    ],
  },
  design: {
    label: 'UI/UX & Product Design Track',
    icon: Palette,
    milestones: [
      { title: 'Design Thinking & Information Architecture', desc: 'Conduct user research interviews, empathy mapping, and low-fidelity wireframing.' },
      { title: 'Design Systems & Component Architecture', desc: 'Build comprehensive tokenized Figma design systems with auto-layout and interactive states.' },
      { title: 'Usability Testing & Accessibility Standards', desc: 'Validate clickable prototypes with real users and verify WCAG 2.1 AA accessibility.' },
      { title: 'End-to-End Product Design Case Study', desc: 'Publish a polished case study documenting problem discovery, user journeys, and UX solutions.' },
      { title: 'Studio & Tech Product Design Applications', desc: 'Submit portfolio case studies to digital product studios, consumer tech companies, and UX agencies.' },
    ],
  },
};

export const StudentRoadmap: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string>('film');
  const [profileComplete, setProfileComplete] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentStatus();
  }, []);

  const fetchStudentStatus = async () => {
    try {
      const [resRes, appRes] = await Promise.allSettled([
        api.get('/resume'),
        api.get('/applications'),
      ]);

      let domainKey = 'film';
      if (resRes.status === 'fulfilled' && resRes.value.data?.data?.resume) {
        const resume = resRes.value.data.data.resume;
        const interest = `${resume.fieldOfInterest || ''} ${resume.headline || ''}`.toLowerCase();
        if (interest.includes('camera') || interest.includes('cinematograph')) {
          domainKey = 'cinematography';
        } else if (interest.includes('software') || interest.includes('developer') || interest.includes('engineer')) {
          domainKey = 'software';
        } else if (interest.includes('market') || interest.includes('growth')) {
          domainKey = 'marketing';
        } else if (interest.includes('design') || interest.includes('ui') || interest.includes('ux')) {
          domainKey = 'design';
        } else {
          domainKey = 'film';
        }
        if (resume.headline && resume.skills?.length > 0) {
          setProfileComplete(true);
        }
      }

      if (appRes.status === 'fulfilled' && appRes.value.data?.data?.applications?.length > 0) {
        setHasApplied(true);
      }

      setActiveDomain(domainKey);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const domainData = DOMAIN_ROADMAPS[activeDomain] || DOMAIN_ROADMAPS.film;
  const DomainIcon = domainData.icon;

  // Compute status for the 5 milestones based on actual student progress
  const milestones: Milestone[] = domainData.milestones.map((m, idx) => {
    if (idx === 0) {
      return { ...m, status: profileComplete ? 'completed' : 'in_progress' };
    } else if (idx === 1) {
      return { ...m, status: profileComplete ? 'completed' : 'in_progress' };
    } else if (idx === 2) {
      return { ...m, status: profileComplete ? 'in_progress' : 'pending' };
    } else if (idx === 3) {
      return { ...m, status: profileComplete && hasApplied ? 'completed' : 'in_progress' };
    } else {
      return { ...m, status: hasApplied ? 'completed' : 'pending' };
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">Career & Placement Roadmap</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-white">
              Adaptive
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Dynamic milestones tailored to your discipline and real-time progress.
          </p>
        </div>

        {/* Domain Switcher */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(DOMAIN_ROADMAPS).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveDomain(key)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  activeDomain === key
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Track Banner */}
      <Card className="p-4 bg-neutral-50 border-neutral-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-900 text-white">
            <DomainIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">{domainData.label}</h2>
            <p className="text-xs text-neutral-500">
              5 verified milestones to build a competitive portfolio and land industry placement.
            </p>
          </div>
        </div>
      </Card>

      {/* Milestone Steps */}
      <Card className="p-6">
        <div className="space-y-6">
          {milestones.map((step, idx) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : step.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-300 shrink-0" />
                )}
                {idx !== milestones.length - 1 && <div className="w-0.5 h-14 bg-neutral-200 my-1" />}
              </div>
              <div className="pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">{step.title}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      step.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : step.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}
                  >
                    {step.status === 'completed'
                      ? 'Completed'
                      : step.status === 'in_progress'
                      ? 'In Progress'
                      : 'Upcoming'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
