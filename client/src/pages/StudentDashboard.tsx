import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { ChevronRight, Briefcase, Calendar, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';

const statusColor: Record<string, string> = {
  'applied': 'text-neutral-700 bg-neutral-100',
  'shortlisted': 'text-blue-700 bg-blue-50',
  'interview_scheduled': 'text-purple-700 bg-purple-50',
  'offered': 'text-emerald-700 bg-emerald-50 font-bold',
  'rejected': 'text-red-700 bg-red-50',
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appRes, intRes, resRes, jobRes] = await Promise.allSettled([
        api.get('/applications'),
        api.get('/interviews'),
        api.get('/resume'),
        api.get('/jobs/company-matches'),
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
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic profile completion
  const calculateProfileStrength = () => {
    let score = 25; // Registered
    if (resumeData?.headline) score += 25;
    if (resumeData?.skills && resumeData.skills.length > 0) score += 25;
    if (resumeData?.summary) score += 25;
    return score;
  };

  const profileStrength = calculateProfileStrength();
  const offersCount = applications.filter((a) => a.status === 'offered').length;
  const targetDomain = resumeData?.fieldOfInterest || 'Creative & Technical Industry';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Focus Domain: <span className="font-semibold text-neutral-800">{targetDomain}</span>
          </p>
        </div>
        <Button onClick={() => navigate('/student/jobs')} size="sm" className="flex items-center gap-1.5 self-start sm:self-auto">
          <Briefcase className="w-4 h-4" /> Explore Open Roles
        </Button>
      </div>

      {/* Real Live Stats */}
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
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{profileStrength}%</p>
          <p className="text-xs text-neutral-500 mt-1">Profile Strength</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Recommended Jobs */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Recommended for Your Profile</h2>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
                        {decodeHtmlEntities(job.company)} · {job.salary} · {job.location}
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

        {/* Right Column */}
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
                  Once a recruiter shortlists your profile, your interview link will appear here.
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
                        className="inline-block mt-2 text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        Join Video Meeting →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Profile Completion */}
          <Card>
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Profile Completion</h2>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-500">{profileStrength}% complete</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                style={{ width: `${profileStrength}%` }}
              />
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Account registered
              </p>
              <p className={resumeData?.headline ? 'text-emerald-700 font-medium flex items-center gap-1.5' : 'text-neutral-400 flex items-center gap-1.5'}>
                {resumeData?.headline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {resumeData?.headline ? 'Professional headline added' : 'Headline missing'}
              </p>
              <p className={resumeData?.skills?.length ? 'text-emerald-700 font-medium flex items-center gap-1.5' : 'text-neutral-400 flex items-center gap-1.5'}>
                {resumeData?.skills?.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {resumeData?.skills?.length ? `${resumeData.skills.length} skills listed` : 'Skills missing'}
              </p>
              <p className={resumeData?.summary ? 'text-emerald-700 font-medium flex items-center gap-1.5' : 'text-neutral-400 flex items-center gap-1.5'}>
                {resumeData?.summary ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {resumeData?.summary ? 'Professional summary completed' : 'Summary missing'}
              </p>
            </div>
            <Button
              onClick={() => navigate('/student/resume')}
              variant="outline"
              size="sm"
              className="w-full mt-4 text-xs"
            >
              Update Resume Profile
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
