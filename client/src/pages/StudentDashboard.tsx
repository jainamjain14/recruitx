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
  GraduationCap,
  Mail,
  Zap,
  Building2,
  Calendar,
  Video,
  ExternalLink,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Email connection status
  const [emailStatus, setEmailStatus] = useState<{
    isAuthorized: boolean;
    email: string | null;
    provider: string | null;
  }>({
    isAuthorized: false,
    email: null,
    provider: null,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appRes, intRes, resRes, jobRes, emailRes] = await Promise.allSettled([
        api.get('/applications'),
        api.get('/interviews'),
        api.get('/resume'),
        api.get('/jobs/company-matches'),
        api.get('/candidate-email/status'),
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
        setRecommendedJobs(jobRes.value.data.data.companies.slice(0, 4));
      }

      if (emailRes.status === 'fulfilled' && emailRes.value.data?.data) {
        const d = emailRes.value.data.data;
        setEmailStatus({
          isAuthorized: Boolean(d.isEmailSendingAuthorized),
          email: d.authorizedSendingEmail || null,
          provider: d.authorizedSendingProvider || null,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const targetDomain = resumeData?.fieldOfInterest || user?.profession || 'All Disciplines';
  const applicationsCount = applications.length;
  const emailsSentCount = applications.filter(
    (a) => Boolean(a.senderEmail || a.emailMessageId || a.emailSentAt || a.status === 'email_sent' || a.status === 'email_delivered')
  ).length;
  const employerConfirmedCount = applications.filter(
    (a) => (a.authoritativeStatus || a.primaryStatus) === 'employer_receipt_confirmed' || a.employerReceipt
  ).length;
  const interviewsCount = interviews.length;
  const offersCount = applications.filter((a) => a.status === 'offered').length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Discipline: <span className="font-semibold text-neutral-800">{targetDomain}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => navigate('/student/jobs')}
            size="sm"
            className="bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1.5 text-xs shadow-xs font-bold"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" /> Apply Automatically
          </Button>
          <Button
            onClick={() => navigate('/student/applications')}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs"
          >
            <Briefcase className="w-3.5 h-3.5" /> Track Applications ({applicationsCount})
          </Button>
        </div>
      </div>

      {/* Connected Sending Account Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        emailStatus.isAuthorized
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${emailStatus.isAuthorized ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold">
                {emailStatus.isAuthorized
                  ? `Connected Account: ${emailStatus.email}`
                  : 'Connect Your Gmail or Outlook Account'}
              </h3>
              {emailStatus.isAuthorized && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  {emailStatus.provider?.toUpperCase()} ACTIVE ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              {emailStatus.isAuthorized
                ? 'When you apply automatically, applications and your resume are dispatched directly from your email address and appear in your Sent folder.'
                : 'Connect your Gmail or Outlook account once so RecruitX can send job applications directly from your email address with 1-click.'}
            </p>
          </div>
        </div>

        {!emailStatus.isAuthorized && (
          <Button
            size="sm"
            onClick={() => navigate('/student/settings')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0"
          >
            Connect Account →
          </Button>
        )}
      </div>

      {/* 6 Clean KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10.5px] font-semibold text-neutral-500 block">Companies Hiring</span>
          <span className="text-xl font-bold text-neutral-900 mt-1 block">50+</span>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10.5px] font-semibold text-neutral-500 block">Applications Sent</span>
          <span className="text-xl font-bold text-neutral-900 mt-1 block">{applicationsCount}</span>
        </Card>

        <Card className="p-3.5 bg-indigo-50/50 border-indigo-200">
          <span className="text-[10.5px] font-bold text-indigo-900 block">Emails Sent</span>
          <span className="text-xl font-bold text-indigo-800 mt-1 block">{emailsSentCount}</span>
        </Card>

        <Card className="p-3.5 bg-sky-50/50 border-sky-200">
          <span className="text-[10.5px] font-bold text-sky-900 block">Employer Confirmed</span>
          <span className="text-xl font-bold text-sky-800 mt-1 block">{employerConfirmedCount}</span>
        </Card>

        <Card className="p-3.5 bg-purple-50/50 border-purple-200">
          <span className="text-[10.5px] font-bold text-purple-900 block">Interviews</span>
          <span className="text-xl font-bold text-purple-800 mt-1 block">{interviewsCount}</span>
        </Card>

        <Card className="p-3.5 bg-emerald-50/80 border-emerald-300">
          <span className="text-[10.5px] font-bold text-emerald-900 block">Offers</span>
          <span className="text-xl font-bold text-emerald-800 mt-1 block">{offersCount}</span>
        </Card>
      </div>

      {/* Main Grid: Recommended Roles & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Jobs for Profile */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Recommended Jobs Matching Your Resume</h2>
                <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
              </div>
              <button
                onClick={() => navigate('/student/jobs')}
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-semibold"
              >
                Browse All Openings <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Briefcase className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500">Discovering verified openings for your profession...</p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/student/jobs')} className="text-xs mt-2">
                  Explore Vacancies
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recommendedJobs.map((job, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-neutral-50/60 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">{decodeHtmlEntities(job.title)}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {job.matchPercentage || 85}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {decodeHtmlEntities(job.company)} · {job.location || 'India'}
                      </p>
                    </div>

                    <Button
                      onClick={() => navigate('/student/jobs')}
                      size="sm"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>Apply Automatically</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Applications Preview */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Recent Applications</h2>
              <button
                onClick={() => navigate('/student/applications')}
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-semibold"
              >
                View Full Tracker ({applicationsCount}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-neutral-500">No applications dispatched yet.</p>
                <Button size="sm" onClick={() => navigate('/student/jobs')} className="text-xs">
                  Apply to Your First Job
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {applications.slice(0, 4).map((app) => {
                  const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Company');
                  const title = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Position');
                  const date = new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const isEmail = app.status === 'email_sent' || app.status === 'email_delivered' || app.senderEmail;

                  return (
                    <div key={app._id} className="flex items-center justify-between p-4 hover:bg-neutral-50/60 transition-colors">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 truncate">{title}</span>
                          <span className="text-[10px] text-neutral-400">· {company}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Applied {date} · {isEmail ? '✉️ Sent via Email' : '🌐 Career Portal'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isEmail && app.viewSentEmailUrl ? (
                          <a
                            href={app.viewSentEmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-700 hover:underline flex items-center gap-1 font-semibold px-2 py-1 rounded bg-indigo-50 border border-indigo-200"
                          >
                            <span>View Email</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate('/student/applications')}
                          className="text-xs"
                        >
                          Tracker
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Upcoming Interviews */}
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Upcoming Interviews</h2>
              <Calendar className="w-4 h-4 text-neutral-500" />
            </div>

            {interviews.length === 0 ? (
              <div className="p-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-neutral-700">No Interviews Scheduled</p>
                <p className="text-[11px] text-neutral-400">
                  RecruitX monitors your connected email for interview invitations and schedules them here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {interviews.map((item) => (
                  <div key={item._id} className="p-4 space-y-1">
                    <p className="text-xs font-bold text-neutral-900">{item.company || 'Interview'}</p>
                    <p className="text-[11px] text-neutral-600">{item.title}</p>
                    <p className="text-[10.5px] text-neutral-400">
                      {new Date(item.scheduledAt).toLocaleDateString()} at{' '}
                      {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {item.meetingLink && (
                      <button
                        onClick={() => {
                          if (item.meetingLink.startsWith('/meeting/')) {
                            navigate(item.meetingLink);
                          } else {
                            window.open(item.meetingLink, '_blank', 'noreferrer');
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 mt-1"
                      >
                        <Video className="w-3 h-3" />
                        <span>Join Meeting →</span>
                      </button>
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
