import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  User,
  Check,
  Send,
} from 'lucide-react';

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offered'
  | 'rejected';

interface ProgressStep {
  key: string;
  label: string;
  description: string;
}

const PROGRESS_STEPS: ProgressStep[] = [
  { key: 'applied', label: 'Submitted', description: 'Application & resume received' },
  { key: 'under_review', label: 'Under Review', description: 'Screening qualifications' },
  { key: 'shortlisted', label: 'Shortlisted', description: 'Passed initial screening' },
  { key: 'interview_scheduled', label: 'Interview', description: 'Technical / Cultural screen' },
  { key: 'offered', label: 'Offer', description: 'Offer letter extended' },
];

export const StudentApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Slideout Drawer
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appsRes, interviewsRes] = await Promise.all([
        api.get('/applications'),
        api.get('/interviews'),
      ]);

      if (appsRes.data?.data?.applications) {
        setApplications(appsRes.data.data.applications);
      }
      if (interviewsRes.data?.data?.interviews) {
        setInterviews(interviewsRes.data.data.interviews);
      }
    } catch (err) {
      console.error('Failed to fetch applications and interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInterviewForApp = (app: any) => {
    return interviews.find(
      (inv) =>
        (inv.application && (inv.application._id === app._id || inv.application === app._id)) ||
        (inv.job && app.job && (inv.job._id === app.job._id || inv.job === app.job._id))
    );
  };

  const getStepIndex = (status: ApplicationStatus): number => {
    switch (status) {
      case 'applied':
        return 0;
      case 'under_review':
        return 1;
      case 'shortlisted':
        return 2;
      case 'interview_scheduled':
        return 3;
      case 'offered':
        return 4;
      case 'rejected':
        return -1;
      default:
        return 0;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
      case 'under_review':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'shortlisted':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'interview_scheduled':
        return 'bg-purple-50 text-purple-800 border-purple-200 ring-1 ring-purple-400/30';
      case 'offered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const title = decodeHtmlEntities(app.jobTitle || app.job?.title || '').toLowerCase();
    const company = decodeHtmlEntities(app.companyName || app.job?.company || '').toLowerCase();
    const matchesSearch = title.includes(search.toLowerCase()) || company.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Metrics
  const totalCount = applications.length;
  const inReviewCount = applications.filter(
    (a) => a.status === 'under_review' || a.status === 'shortlisted'
  ).length;
  const interviewCount = applications.filter((a) => a.status === 'interview_scheduled').length;
  const offerCount = applications.filter((a) => a.status === 'offered').length;

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">My Applications & Hiring Tracker</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Real-time timeline progression, interview scheduling notifications, and recruiter communication.
        </p>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border-neutral-200">
          <span className="text-[11px] font-semibold text-neutral-500 block">Total Submitted</span>
          <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{totalCount}</span>
        </Card>
        <Card className="p-3.5 border-neutral-200">
          <span className="text-[11px] font-semibold text-neutral-500 block">In Review / Screen</span>
          <span className="text-xl font-bold text-blue-700 mt-0.5 block">{inReviewCount}</span>
        </Card>
        <Card className="p-3.5 border-neutral-200">
          <span className="text-[11px] font-semibold text-neutral-500 block">Interviews Scheduled</span>
          <span className="text-xl font-bold text-purple-700 mt-0.5 block">{interviewCount}</span>
        </Card>
        <Card className="p-3.5 border-neutral-200">
          <span className="text-[11px] font-semibold text-neutral-500 block">Offers Extended</span>
          <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{offerCount}</span>
        </Card>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job or employer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <Filter className="w-3 h-3 text-neutral-400" />
          <span className="text-neutral-500 font-medium">Filter Stage:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-neutral-200 bg-white font-semibold text-neutral-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Applications ({totalCount})</option>
            <option value="applied">Applied</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="offered">Offer Extended</option>
            <option value="rejected">Archived / Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications List with Timeline Stepper */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          <Sparkles className="w-5 h-5 animate-spin mx-auto text-neutral-700 mb-2" />
          Loading your applications and interview schedules...
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-800">No Applications Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'No applications match your active filters. Try clearing your search.'
              : 'You have not submitted any applications yet. Head over to Vacancies to explore verified openings.'}
          </p>
          <Button size="sm" onClick={() => navigate('/student/jobs')} className="mt-2">
            Explore Open Vacancies
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Employer');
            const title = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Open Position');
            const currentStepIdx = getStepIndex(app.status);
            const isRejected = app.status === 'rejected';
            const matchedInterview = getInterviewForApp(app);

            return (
              <Card
                key={app._id}
                onClick={() => setSelectedApp(app)}
                className="p-5 border-neutral-200 hover:border-neutral-300 hover:shadow-xs transition-all cursor-pointer space-y-4"
              >
                {/* Top Row: Job Title, Company, Date, and Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-neutral-900 hover:text-neutral-700 transition-colors">
                        {title}
                      </h3>
                      <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(app.status)}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>{company}</span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-400 font-normal">
                        Applied {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                    {matchedInterview && (
                      <a
                        href={matchedInterview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs animate-pulse"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Video Interview
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedApp(app)}
                      className="flex items-center gap-1 text-xs"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress Stepper Visual Bar */}
                <div className="pt-2 pb-1">
                  {isRejected ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 text-xs text-rose-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Application not selected by employer. Retained in archive for candidate records.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5 relative">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div key={step.key} className="space-y-1.5 text-center">
                            {/* Bar segment */}
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600'
                                  : isCurrent
                                  ? 'bg-purple-600 ring-2 ring-purple-300 animate-pulse'
                                  : 'bg-neutral-200'
                              }`}
                            />
                            {/* Step label */}
                            <div className="hidden sm:block">
                              <span
                                className={`text-[10px] font-bold block ${
                                  isCompleted
                                    ? 'text-emerald-700'
                                    : isCurrent
                                    ? 'text-purple-700 font-extrabold'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Interview Alert Ribbon if Scheduled */}
                {matchedInterview && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <span className="font-bold text-purple-900 block">
                          Upcoming Interview: {matchedInterview.title}
                        </span>
                        <span className="text-purple-700 text-[11px]">
                          {new Date(matchedInterview.scheduledAt).toLocaleString()} ({matchedInterview.durationMinutes} mins)
                        </span>
                      </div>
                    </div>
                    <a
                      href={matchedInterview.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-purple-800 hover:text-purple-950 underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Meeting Link
                    </a>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* APPLICATION DETAIL SLIDEOUT DRAWER */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(selectedApp.status)}`}>
                  {selectedApp.status.replace('_', ' ')}
                </span>
                <h2 className="text-base font-bold text-neutral-900 mt-1">
                  {decodeHtmlEntities(selectedApp.jobTitle || selectedApp.job?.title || 'Position')}
                </h2>
                <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{decodeHtmlEntities(selectedApp.companyName || selectedApp.job?.company || 'Company')}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Scheduled Interview Card (if any) */}
              {(() => {
                const inv = getInterviewForApp(selectedApp);
                if (!inv) return null;

                return (
                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-700" />
                      <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                        Confirmed Video Interview
                      </h3>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-neutral-900">{inv.title}</p>
                      <p className="text-neutral-600 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(inv.scheduledAt).toLocaleString()}
                      </p>
                      <p className="text-neutral-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        {inv.durationMinutes} Minutes Duration
                      </p>
                      {inv.notes && (
                        <p className="text-neutral-600 text-[11px] pt-1 italic">
                          "{inv.notes}"
                        </p>
                      )}
                    </div>

                    <a
                      href={inv.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs"
                    >
                      <Video className="w-4 h-4" /> Join Interview Video Room
                    </a>
                  </div>
                );
              })()}

              {/* Status Timeline History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Hiring Process Timeline
                </h3>
                <div className="space-y-3 pl-2 border-l-2 border-neutral-200">
                  {(selectedApp.statusHistory || []).map((h: any, idx: number) => (
                    <div key={idx} className="relative pl-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 absolute -left-[19px] top-1 border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 uppercase">
                          {h.status?.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}
                        </span>
                      </div>
                      {h.note && <p className="text-xs text-neutral-600 mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attached Resume */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Submitted Resume & Profile
                </h3>
                <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-neutral-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">Candidate Resume Package</span>
                      <span className="text-[11px] text-neutral-500">
                        {selectedApp.resumeUrl || 'Uploaded Verified Profile'}
                      </span>
                    </div>
                  </div>
                  {selectedApp.resumeUrl && selectedApp.resumeUrl.startsWith('http') && (
                    <a
                      href={selectedApp.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                </div>
              </div>

              {/* Recruiter Communication Action */}
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Direct Recruiter Chat
                </h3>
                <p className="text-xs text-neutral-500">
                  Have questions about this role or scheduling? Message the hiring team directly in real-time.
                </p>
                <Button
                  onClick={() => {
                    const recruiterId = typeof selectedApp.recruiter === 'object' && selectedApp.recruiter?._id
                      ? selectedApp.recruiter._id
                      : selectedApp.recruiter;
                    const recruiterName = typeof selectedApp.recruiter === 'object' && selectedApp.recruiter?.name
                      ? selectedApp.recruiter.name
                      : (selectedApp.companyName ? `${selectedApp.companyName} Hiring Team` : 'Hiring Team');

                    const company = selectedApp.companyName || selectedApp.job?.company || '';
                    const jobTitle = selectedApp.jobTitle || selectedApp.job?.title || '';

                    const params = new URLSearchParams();
                    if (recruiterId) params.set('recipientId', recruiterId);
                    if (recruiterName) params.set('name', recruiterName);
                    if (company) params.set('company', company);
                    if (jobTitle) params.set('jobTitle', jobTitle);

                    navigate(`/student/messages?${params.toString()}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 mt-2"
                >
                  <MessageSquare className="w-4 h-4" /> Message Hiring Manager
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

