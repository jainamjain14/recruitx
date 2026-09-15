import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { ChevronRight, Plus, Briefcase, Users, Calendar, Award, Building2 } from 'lucide-react';

const statusColor: Record<string, string> = {
  'applied': 'text-neutral-700 bg-neutral-100',
  'shortlisted': 'text-emerald-700 bg-emerald-50',
  'interview_scheduled': 'text-blue-700 bg-blue-50',
  'offered': 'text-purple-700 bg-purple-50 font-bold',
  'rejected': 'text-red-700 bg-red-50',
};

export const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [jobsRes, appsRes, intsRes] = await Promise.allSettled([
        api.get('/jobs'),
        api.get('/applications'),
        api.get('/interviews'),
      ]);

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.data?.jobs) {
        setJobs(jobsRes.value.data.data.jobs);
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data?.data?.applications) {
        setApplications(appsRes.value.data.data.applications);
      }

      if (intsRes.status === 'fulfilled' && intsRes.value.data?.data?.interviews) {
        setInterviews(intsRes.value.data.data.interviews);
      }
    } catch (err) {
      console.error('Failed to load recruiter dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const positionsFilled = applications.filter((a) => a.status === 'offered').length;
  const shortlistedCount = applications.filter((a) => a.status === 'shortlisted').length;
  const interviewCount = applications.filter((a) => a.status === 'interview_scheduled').length;
  const totalApps = applications.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Company: <span className="font-semibold text-neutral-800">{user?.company || 'Recruitment Operations'}</span>
          </p>
        </div>
        <Button onClick={() => navigate('/recruiter/post-job')} size="sm" className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Post New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{jobs.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Active Job Postings</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{totalApps}</p>
          <p className="text-xs text-neutral-500 mt-1">Total Applicants</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{interviews.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Interviews Scheduled</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-neutral-900">{positionsFilled}</p>
          <p className="text-xs text-neutral-500 mt-1">Positions Filled / Offered</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Job Postings */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Job Postings ({jobs.length})</h2>
              <button
                onClick={() => navigate('/recruiter/jobs')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                Manage all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {jobs.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-neutral-500">No active job postings created yet.</p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/recruiter/post-job')}>
                  Create First Opening
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {jobs.slice(0, 4).map((job) => (
                  <div key={job._id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{job.title}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {job.location} • {job.jobType} • {job.salary}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        Active
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-1">{job.applicationsCount || 0} applicants</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Applications */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Recent Applications ({totalApps})</h2>
              <button
                onClick={() => navigate('/recruiter/applications')}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {applications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-neutral-500">No student applications submitted yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {applications.slice(0, 4).map((app) => (
                  <div key={app._id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{app.student?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {app.jobTitle || app.job?.title || 'Open Role'} • {app.student?.email}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ml-3 ${statusColor[app.status] || 'text-neutral-700 bg-neutral-100'}`}>
                      {app.status.replace('_', ' ')}
                    </span>
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
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {interviews.map((item) => (
                  <div key={item._id} className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-neutral-900">{item.student?.name || 'Candidate'}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{item.title}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {new Date(item.scheduledAt).toLocaleDateString()} at {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hiring Pipeline */}
          <Card>
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Hiring Pipeline</h2>
            <div className="space-y-2.5">
              {[
                { stage: 'Applied', count: totalApps },
                { stage: 'Shortlisted', count: shortlistedCount },
                { stage: 'Interview', count: interviewCount },
                { stage: 'Offered', count: positionsFilled },
              ].map((s, i) => {
                const pct = totalApps > 0 ? (s.count / totalApps) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 w-20 shrink-0">{s.stage}</span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-neutral-900 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-neutral-700 w-5 text-right">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
