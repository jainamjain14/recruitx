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
} from 'lucide-react';

const statusColor: Record<string, string> = {
  'applied': 'text-neutral-700 bg-neutral-100',
  'shortlisted': 'text-blue-700 bg-blue-50',
  'interview_scheduled': 'text-purple-700 bg-purple-50',
  'offered': 'text-emerald-800 bg-emerald-50 font-bold',
  'rejected': 'text-red-700 bg-red-50',
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
    if (resumeData?.summary || user?.bio) pts += 10;
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
  const targetDomain = resumeData?.fieldOfInterest || user?.profession || 'Software Engineering';

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{applications.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Jobs Applied</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{interviews.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Interviews Scheduled</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{offersCount}</p>
          <p className="text-xs text-neutral-500 mt-1">Offers Received</p>
        </Card>
        <Card
          className="p-4 cursor-pointer hover:border-neutral-400 transition-colors"
          onClick={() => setBreakdownModalOpen(true)}
          title="Click to view exact mathematical score breakdown"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-extrabold text-neutral-900">{overallReadinessScore}%</p>
            <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
              Deterministic
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
            <span>Job Readiness Score</span>
            <span className="text-[10px] text-neutral-900 underline font-medium">Breakdown →</span>
          </p>
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
                <p className="text-xs text-neutral-500">No applications submitted yet.</p>
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

                  return (
                    <div key={app._id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">{title}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{company} · Applied {date}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor[app.status] || 'text-neutral-600 bg-neutral-50'}`}>
                        {app.status.replace('_', ' ')}
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

          {/* ATS Job Readiness Score Card */}
          <Card className="p-5 space-y-4 border-neutral-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-neutral-800" />
                <h2 className="text-sm font-bold text-neutral-900">ATS Job Readiness Score</h2>
              </div>
              <span className="text-xs font-extrabold text-neutral-900">{overallReadinessScore}%</span>
            </div>

            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                style={{ width: `${overallReadinessScore}%` }}
              />
            </div>

            {/* 2 Deterministic Pillars Breakdown Preview */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-neutral-700" /> Profile & ATS Completeness
                </span>
                <span className="font-bold text-neutral-900">{p1}/50 pts</span>
              </div>

              <div className="flex items-center justify-between text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-neutral-700" /> Target Role Skill Alignment
                </span>
                <span className="font-bold text-neutral-900">{p2}/50 pts</span>
              </div>
            </div>

            <Button
              onClick={() => setBreakdownModalOpen(true)}
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
              <span>View Deterministic Breakdown</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* ============================================================== */}
      {/* JOB READINESS SCORE MATHEMATICAL BREAKDOWN MODAL */}
      {/* ============================================================== */}
      {breakdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-neutral-200">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-neutral-800" />
                  <h3 className="text-base font-bold text-neutral-900">
                    Job Readiness Score Formulation
                  </h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Deterministic score calculated objectively from profile completeness and target skill match.
                </p>
              </div>
              <button
                onClick={() => setBreakdownModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Banner */}
            <div className="p-4 rounded-xl bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Total Deterministic Employability Score
                </span>
                <h4 className="text-2xl font-black text-white mt-0.5">
                  {overallReadinessScore} / 100 Points
                </h4>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                {overallReadinessScore >= 80 ? 'Market Ready' : 'In Preparation'}
              </span>
            </div>

            {/* 2 Deterministic Pillars Details */}
            <div className="space-y-3.5 text-xs">
              {/* Pillar 1 */}
              <div className="p-3.5 rounded-lg border border-neutral-200 space-y-1.5 bg-neutral-50/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-900">1. Profile & Resume ATS Completeness</span>
                  <span className="font-extrabold text-neutral-900">{p1} / 50 pts</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Evaluates account details, profession/title, summary bio, parsed skills ({resumeData?.skills?.length || 0} skills found), location, and portfolio links.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBreakdownModalOpen(false);
                      navigate('/student/settings');
                    }}
                    className="text-[11px] h-7 px-2.5"
                  >
                    Edit Profile Details →
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBreakdownModalOpen(false);
                      navigate('/student/resume');
                    }}
                    className="text-[11px] h-7 px-2.5"
                  >
                    Update Resume →
                  </Button>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-3.5 rounded-lg border border-neutral-200 space-y-1.5 bg-neutral-50/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-900">2. Target Role Skill Alignment</span>
                  <span className="font-extrabold text-neutral-900">{p2} / 50 pts</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Measures your skills coverage against live industry requirements for {targetDomain} ({skillGapScore}% match).
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBreakdownModalOpen(false);
                    navigate('/student/roadmap');
                  }}
                  className="text-[11px] h-7 px-2.5 mt-1"
                >
                  View Skill Gap & Roadmap →
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100">
              <Button size="sm" onClick={() => setBreakdownModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
