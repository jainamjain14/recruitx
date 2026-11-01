import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import {
  ChevronRight,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Target,
  GraduationCap,
  X,
  UserCheck,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const getAppAuthoritativeStatus = (app: any): { label: string; badgeClass: string; icon: string; datePrefix: string } => {
  const status = app.authoritativeStatus || app.primaryStatus || app.status;

  switch (status) {
    case 'external_application_required':
      return {
        label: 'Action Required ⚠️',
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        icon: '⚠️',
        datePrefix: 'Recorded',
      };
    case 'awaiting_employer_verification':
      return {
        label: 'Submitted ⏳',
        badgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
        icon: '⏳',
        datePrefix: 'Dispatched',
      };
    case 'email_sent':
      return {
        label: 'Email Sent ✉️',
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold',
        icon: '✉️',
        datePrefix: 'Sent',
      };
    case 'email_delivered':
      return {
        label: 'Email Delivered 📬',
        badgeClass: 'text-teal-700 bg-teal-50 border-teal-200 font-bold',
        icon: '📬',
        datePrefix: 'Delivered',
      };
    case 'employer_receipt_confirmed':
      return {
        label: 'Receipt Confirmed ✓',
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-bold',
        icon: '✓',
        datePrefix: 'Confirmed',
      };
    case 'employer_status_updated':
      const stage = (app.hiringStage || app.status || 'review').replace(/_/g, ' ');
      return {
        label: `Pipeline: ${stage} ⚡`,
        badgeClass: 'text-purple-700 bg-purple-50 border-purple-200 font-medium',
        icon: '⚡',
        datePrefix: 'Updated',
      };
    case 'saved_in_recruitx':
      return {
        label: 'Saved in RecruitX',
        badgeClass: 'text-slate-600 bg-slate-50 border-slate-200',
        icon: '💾',
        datePrefix: 'Saved',
      };
    case 'submission_failed':
      return {
        label: 'Submission Failed',
        badgeClass: 'text-red-700 bg-red-50 border-red-200',
        icon: '✕',
        datePrefix: 'Failed',
      };
    case 'unable_to_verify':
      return {
        label: 'Unable to Verify',
        badgeClass: 'text-zinc-600 bg-zinc-50 border-zinc-200',
        icon: '?',
        datePrefix: 'Checked',
      };
    default:
      return {
        label: (status || 'Tracked').replace(/_/g, ' '),
        badgeClass: 'text-neutral-600 bg-neutral-50 border-neutral-200',
        icon: '•',
        datePrefix: 'Recorded',
      };
  }
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [skillGapScore, setSkillGapScore] = useState<number>(75);
  const [loading, setLoading] = useState(true);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appRes, intRes, resRes, jobRes, gapRes] = await Promise.allSettled([
        api.get('/applications'),
        api.get('/interviews'),
        api.get('/resume'),
        api.get('/jobs/company-matches'),
        api.get('/resume/skill-gap'),
      ]);

      if (appRes.status === 'fulfilled' && appRes.value.data?.data?.applications) {
        setApplications(appRes.value.data.data.applications);
      }

      if (intRes.status === 'fulfilled' && intRes.value.data?.data?.interviews) {
        setInterviews(intRes.value.data.data.interviews);
      }

      if (resRes.status === 'fulfilled' && resRes.value.data?.data?.resume) {
        setResumeData(resRes.value.data.data.resume);
      }

      if (jobRes.status === 'fulfilled' && jobRes.value.data?.data?.companies) {
        setRecommendedJobs(jobRes.value.data.data.companies.slice(0, 3));
      }

      if (gapRes.status === 'fulfilled' && gapRes.value.data?.data?.analysis) {
        setSkillGapScore(gapRes.value.data.data.analysis.matchScore || 75);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deterministic Job Readiness Score (0-100%)
   * Synthesizes 2 objective pillars:
   * 1. Profile & Resume Completeness (Max 50 pts)
   * 2. Target Skill Alignment (Max 50 pts)
   * 100% deterministic - no arbitrary fluctuations.
   */
  const calculateProfilePillar = () => {
    let pts = 0;
    // Basic account & headline
    if (user?.name) pts += 5;
    if (resumeData?.headline || user?.title) pts += 10;
    // Technical Skills
    if (resumeData?.skills && resumeData.skills.length >= 3) pts += 15;
    else if (resumeData?.skills && resumeData.skills.length > 0) pts += 8;
    // Summary / Bio
    if (resumeData?.summary) pts += 10;
    // Location
    if (resumeData?.location || user?.location) pts += 5;
    // Online profile presence (LinkedIn / GitHub / Portfolio)
    if (user?.linkedin || user?.github || user?.portfolio) pts += 5;
    return Math.min(50, pts);
  };

  const calculateSkillAlignmentPillar = () => {
    return Math.min(50, Math.round((skillGapScore / 100) * 50));
  };

  const p1 = calculateProfilePillar();
  const p2 = calculateSkillAlignmentPillar();
  const overallReadinessScore = Math.min(100, p1 + p2);

  const offersCount = applications.filter((a) => a.status === 'offered').length;
  const targetDomain = resumeData?.fieldOfInterest || user?.profession || 'Not Specified (Upload Resume)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Discipline: <span className="font-semibold text-neutral-800">{targetDomain}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/student/roadmap')} variant="outline" size="sm" className="gap-1.5 text-xs">
            <GraduationCap className="w-3.5 h-3.5" /> Career Roadmap & Skills
          </Button>
          <Button onClick={() => navigate('/student/jobs')} size="sm" className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <Briefcase className="w-3.5 h-3.5" /> Explore Open Roles
          </Button>
        </div>
      </div>

      {/* Real Live Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-neutral-900">{applications.length}</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {applications.filter((a) => (a.authoritativeStatus || a.primaryStatus) === 'employer_receipt_confirmed').length} Confirmed
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Tracked Applications</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{interviews.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Interviews Scheduled</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{offersCount}</p>
          <p className="text-xs text-neutral-500 mt-1">Offers Received</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications & Recommended Jobs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent Applications */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Recent Applications</h2>
              <button
                onClick={() => navigate('/student/applications')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                View all ({applications.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-neutral-500">No applications tracked yet.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/student/jobs')}>
                  Browse Live Openings
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {applications.slice(0, 4).map((app) => {
                  const company = app.companyName || app.job?.company || 'Company';
                  const title = app.jobTitle || app.job?.title || 'Role';
                  const date = new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const statusInfo = getAppAuthoritativeStatus(app);

                  return (
                    <div key={app._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-neutral-900 truncate">{title}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                          {company} · {statusInfo.datePrefix} {date}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap tracking-wide shrink-0 ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recommended Jobs for Profile */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Recommended for Your Profile</h2>
                <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
              </div>
              <button
                onClick={() => navigate('/student/jobs')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                Browse all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-neutral-500">Loading recommended opportunities...</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {recommendedJobs.map((job, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{decodeHtmlEntities(job.title)}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {decodeHtmlEntities(job.company)} · {job.location}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate('/student/jobs')}
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-7 px-3 shrink-0 ml-3 flex items-center gap-1"
                    >
                      View & Apply <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Upcoming Interviews & Job Readiness Score Card */}
        <div className="space-y-4">
          {/* Upcoming Interviews */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Upcoming Interviews</h2>
            </div>
            {interviews.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-xs text-neutral-400">No interviews scheduled yet.</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Once a recruiter schedules an interview via messages, your meeting details will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {interviews.map((item) => (
                  <div key={item._id} className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-neutral-900">{item.company || 'Recruiter Interview'}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{item.title}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {new Date(item.scheduledAt).toLocaleDateString()} at {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 text-[11px] font-medium text-neutral-900 underline hover:text-neutral-700"
                      >
                        Join Video Meeting →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
