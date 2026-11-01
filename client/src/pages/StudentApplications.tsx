import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Video,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Mail,
  Zap,
  Settings,
  Activity,
  ArrowUpRight,
  Check,
  Clock,
  Sparkles,
  Inbox,
  Eye,
} from 'lucide-react';

export type PrimaryApplicationStatus =
  | 'saved_in_recruitx'
  | 'external_application_required'
  | 'awaiting_employer_verification'
  | 'email_sent'
  | 'email_delivered'
  | 'employer_receipt_confirmed'
  | 'employer_status_updated'
  | 'submission_failed'
  | 'unable_to_verify';

export const APPLICATION_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: string;
  }
> = {
  email_sent: {
    label: 'Email Sent',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-900',
    borderColor: 'border-indigo-300',
    icon: '✉️',
  },
  email_delivered: {
    label: 'Email Delivered',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    borderColor: 'border-teal-300',
    icon: '📬',
  },
  awaiting_employer_verification: {
    label: 'Awaiting Employer Response',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-900',
    borderColor: 'border-sky-300',
    icon: '⏳',
  },
  employer_receipt_confirmed: {
    label: 'Employer Confirmed',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    icon: '✓',
  },
  employer_status_updated: {
    label: 'Status Updated',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300',
    icon: '⚡',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300',
    icon: '📅',
  },
  offered: {
    label: 'Offer Received',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    icon: '🎉',
  },
  rejected: {
    label: 'Not Selected',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300',
    icon: '✕',
  },
  external_application_required: {
    label: 'Portal Submission Required',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300',
    icon: '⚠️',
  },
  saved_in_recruitx: {
    label: 'Saved in RecruitX',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    icon: '💾',
  },
  submission_failed: {
    label: 'Submission Failed',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300',
    icon: '✕',
  },
};

export const StudentApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [viewEmailApp, setViewEmailApp] = useState<any | null>(null);
  const [historyModalApp, setHistoryModalApp] = useState<any | null>(null);
  const [appHistoryEvents, setAppHistoryEvents] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [manifestModalApp, setManifestModalApp] = useState<any | null>(null);

  // Auto-apply preferences
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [autoApplyPreferences, setAutoApplyPreferences] = useState({
    autoApplyEnabled: false,
    autoApplyDailyLimit: 5,
    autoApplyMinScore: 70,
  });
  const [autoApplyRunning, setAutoApplyRunning] = useState(false);
  const [autoApplyFeedback, setAutoApplyFeedback] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    fetchAutoApplyPreferences();

    // Silently synchronize candidate inbox in background on mount
    silentSyncInbox();
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
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const silentSyncInbox = async () => {
    try {
      const res = await api.post('/applications/inbox/sync');
      if (res.data?.success && res.data?.data?.matchedApplicationsCount > 0) {
        // Refresh application state if new confirmations or interviews were detected
        await fetchData();
      }
    } catch (err) {
      // Quiet background task — does not interrupt candidate experience
    }
  };

  const fetchAutoApplyPreferences = async () => {
    try {
      const res = await api.get('/applications/auto-apply/preferences');
      if (res.data?.success && res.data.data) {
        setAutoApplyPreferences(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load auto-apply preferences:', err);
    }
  };

  const handleRunAutoApply = async () => {
    setAutoApplyRunning(true);
    setAutoApplyFeedback(null);
    try {
      const res = await api.post('/applications/auto-apply/run', {
        consentGranted: true,
        dailyLimit: autoApplyPreferences.autoApplyDailyLimit,
        minMatchScore: autoApplyPreferences.autoApplyMinScore,
      });
      if (res.data?.success) {
        setAutoApplyFeedback(res.data.data);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Auto-apply execution failed.');
    } finally {
      setAutoApplyRunning(false);
    }
  };

  const handleSavePreferences = async (newPrefs: any) => {
    try {
      const res = await api.put('/applications/auto-apply/preferences', newPrefs);
      if (res.data?.success) {
        setAutoApplyPreferences((prev) => ({ ...prev, ...res.data.data }));
        setPreferencesModalOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update preferences.');
    }
  };

  const handleOpenHistory = async (app: any) => {
    setHistoryModalApp(app);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/applications/${app._id}/events`);
      if (res.data?.success) {
        setAppHistoryEvents(res.data.data.events || []);
      }
    } catch (err) {
      console.error('Failed to load application history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getInterviewForApp = (app: any) => {
    return interviews.find(
      (inv) =>
        (inv.application && (inv.application._id === app._id || inv.application === app._id)) ||
        (inv.job && app.job && (inv.job._id === app.job._id || inv.job === app.job._id))
    );
  };

  const handleJoinMeeting = (meetingLink: string) => {
    if (!meetingLink) return;
    if (meetingLink.startsWith('/meeting/')) {
      navigate(meetingLink);
      return;
    }
    const externalMatch = meetingLink.match(/recruitx-([^/?#]+)/);
    if (externalMatch) {
      navigate(`/meeting/${externalMatch[1]}`);
      return;
    }
    window.open(meetingLink, '_blank', 'noreferrer');
  };

  const resolveAppStatus = (app: any): string => {
    if (app.status === 'offered' || app.hiringStage === 'offered') return 'offered';
    if (app.status === 'interview_scheduled' || app.hiringStage === 'interview_scheduled') return 'interview_scheduled';
    if (app.status === 'rejected' || app.hiringStage === 'rejected') return 'rejected';
    if (app.primaryStatus) return app.primaryStatus;
    if (app.status === 'email_sent' || app.status === 'email_delivered' || app.senderEmail) return 'email_sent';
    if (app.status === 'employer_receipt_confirmed' || app.employerReceipt) return 'employer_receipt_confirmed';
    if (app.status === 'external_application_required' || app.submissionStatus === 'requires_manual_application') {
      return 'external_application_required';
    }
    return app.status || 'saved_in_recruitx';
  };

  const resolveMethodLabel = (app: any): { label: string; icon: string } => {
    if (app.emailProvider === 'gmail' || (app.senderEmail && app.senderEmail.includes('@gmail.com'))) {
      return { label: 'Gmail', icon: '✉️' };
    }
    if (app.emailProvider === 'outlook' || (app.senderEmail && (app.senderEmail.includes('@outlook.com') || app.senderEmail.includes('@hotmail.com')))) {
      return { label: 'Outlook', icon: '✉️' };
    }
    if (app.senderEmail) {
      return { label: 'Connected Email', icon: '✉️' };
    }
    if (app.atsPlatform === 'greenhouse') {
      return { label: 'Greenhouse ATS', icon: '⚡' };
    }
    if (app.atsPlatform === 'lever') {
      return { label: 'Lever ATS', icon: '⚡' };
    }
    if (app.submissionType === 'platform_recruiter') {
      return { label: 'Platform Recruiter', icon: '🎯' };
    }
    return { label: 'Career Portal', icon: '🌐' };
  };

  // KPI Metrics
  const totalCount = applications.length;
  const emailSentCount = applications.filter((a) => Boolean(a.senderEmail || a.emailMessageId || a.emailSentAt || a.status === 'email_sent' || a.status === 'email_delivered')).length;
  const awaitingCount = applications.filter((a) => resolveAppStatus(a) === 'awaiting_employer_verification' || resolveAppStatus(a) === 'email_sent').length;
  const confirmedCount = applications.filter((a) => resolveAppStatus(a) === 'employer_receipt_confirmed' || a.employerReceipt).length;
  const interviewsCount = applications.filter((a) => resolveAppStatus(a) === 'interview_scheduled' || Boolean(getInterviewForApp(a))).length;
  const offersCount = applications.filter((a) => resolveAppStatus(a) === 'offered').length;

  const filteredApps = applications.filter((app) => {
    const title = decodeHtmlEntities(app.jobTitle || app.job?.title || '').toLowerCase();
    const company = decodeHtmlEntities(app.companyName || app.job?.company || '').toLowerCase();
    const matchesSearch = title.includes(search.toLowerCase()) || company.includes(search.toLowerCase());

    const curStatus = resolveAppStatus(app);
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'email_sent') {
        matchesStatus = curStatus === 'email_sent' || curStatus === 'email_delivered' || Boolean(app.senderEmail);
      } else {
        matchesStatus = curStatus === statusFilter;
      }
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">My Job Applications</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Automated job applications dispatched through your connected account and tracked automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunAutoApply}
            disabled={autoApplyRunning}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{autoApplyRunning ? 'Applying Automatically...' : 'Apply Automatically'}</span>
          </Button>

          <button
            onClick={() => setPreferencesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-500" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Auto-Apply Feedback Banner */}
      {autoApplyFeedback && (
        <div className="p-3.5 bg-indigo-50/90 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-indigo-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {autoApplyFeedback.message}
            </p>
            <p className="text-[11px] text-neutral-600">
              Applications Dispatched: <strong>{autoApplyFeedback.appliedCount}</strong> (Emails: {autoApplyFeedback.emailDispatchedCount} · ATS Submissions: {autoApplyFeedback.directAtsSubmittedCount} · Portal Guides: {autoApplyFeedback.assistedPortalCount})
            </p>
          </div>
          <button onClick={() => setAutoApplyFeedback(null)} className="text-neutral-400 hover:text-neutral-700 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 6 Key Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <Card className="p-3 border-neutral-200 bg-white">
          <span className="text-[10.5px] font-semibold text-neutral-500 block">Total Applied</span>
          <span className="text-lg font-bold text-neutral-900 mt-0.5 block">{totalCount}</span>
        </Card>

        <Card className="p-3 border-indigo-200 bg-indigo-50/40">
          <span className="text-[10.5px] font-bold text-indigo-900 block">Emails Sent</span>
          <span className="text-lg font-bold text-indigo-800 mt-0.5 block">{emailSentCount}</span>
        </Card>

        <Card className="p-3 border-sky-200 bg-sky-50/40">
          <span className="text-[10.5px] font-bold text-sky-900 block">Awaiting Response</span>
          <span className="text-lg font-bold text-sky-800 mt-0.5 block">{awaitingCount}</span>
        </Card>

        <Card className="p-3 border-emerald-200 bg-emerald-50/40">
          <span className="text-[10.5px] font-bold text-emerald-900 block">Employer Confirmed</span>
          <span className="text-lg font-bold text-emerald-800 mt-0.5 block">{confirmedCount}</span>
        </Card>

        <Card className="p-3 border-purple-200 bg-purple-50/40">
          <span className="text-[10.5px] font-bold text-purple-900 block">Interviews</span>
          <span className="text-lg font-bold text-purple-800 mt-0.5 block">{interviewsCount}</span>
        </Card>

        <Card className="p-3 border-emerald-300 bg-emerald-50/80">
          <span className="text-[10.5px] font-bold text-emerald-900 block">Offers</span>
          <span className="text-lg font-bold text-emerald-800 mt-0.5 block">{offersCount}</span>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-neutral-200 bg-white font-semibold text-neutral-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Applications ({totalCount})</option>
            <option value="email_sent">Emails Sent ({emailSentCount})</option>
            <option value="awaiting_employer_verification">Awaiting Response ({awaitingCount})</option>
            <option value="employer_receipt_confirmed">Employer Confirmed ({confirmedCount})</option>
            <option value="interview_scheduled">Interviews ({interviewsCount})</option>
            <option value="offered">Offers ({offersCount})</option>
            <option value="external_application_required">Portal Submission Required</option>
          </select>
        </div>
      </div>

      {/* Applications Table / Clean List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          <Sparkles className="w-5 h-5 animate-spin mx-auto text-neutral-700 mb-2" />
          Loading your applications and tracking updates...
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Inbox className="w-8 h-8 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-800">No Applications Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'No applications match your active search or filter.'
              : 'You have not submitted any applications yet. Explore openings and apply automatically in 1 click!'}
          </p>
          <Button size="sm" onClick={() => navigate('/student/jobs')} className="mt-2 text-xs">
            Browse Hiring Companies
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[11px] font-bold text-neutral-600 border-b border-neutral-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Application Method</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Confirmation / Next Step</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredApps.map((app) => {
                  const company = decodeHtmlEntities(app.companyName || app.job?.company || 'Employer');
                  const title = decodeHtmlEntities(app.jobTitle || app.job?.title || 'Open Position');
                  const curStatus = resolveAppStatus(app);
                  const statusCfg = APPLICATION_STATUS_CONFIG[curStatus] || APPLICATION_STATUS_CONFIG.saved_in_recruitx;
                  const method = resolveMethodLabel(app);
                  const matchedInterview = getInterviewForApp(app);
                  const appliedDateFormatted = app.appliedAt
                    ? new Date(app.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Recent';

                  // Confirmation text
                  let confirmationText = 'Awaiting employer response';
                  if (curStatus === 'offered') {
                    confirmationText = '🎉 Formal Offer received!';
                  } else if (matchedInterview || curStatus === 'interview_scheduled') {
                    confirmationText = '📅 Interview scheduled';
                  } else if (curStatus === 'employer_receipt_confirmed' || app.employerReceipt) {
                    confirmationText = `✓ Confirmed by ${company}`;
                  } else if (curStatus === 'rejected') {
                    confirmationText = 'Position closed / not selected';
                  } else if (curStatus === 'external_application_required') {
                    confirmationText = 'Action required: Complete on career portal';
                  } else if (app.recipientEmail) {
                    confirmationText = `Sent to ${app.recipientEmail}`;
                  }

                  return (
                    <tr key={app._id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* 1. Company */}
                      <td className="py-3 px-4 font-bold text-neutral-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-[11px] text-neutral-700 shrink-0">
                            {company.charAt(0).toUpperCase()}
                          </div>
                          <span>{company}</span>
                        </div>
                      </td>

                      {/* 2. Position */}
                      <td className="py-3 px-4 font-semibold text-neutral-800">
                        {title}
                      </td>

                      {/* 3. Application Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                          <span>{method.icon}</span>
                          <span>{method.label}</span>
                        </span>
                      </td>

                      {/* 4. Applied Date */}
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {appliedDateFormatted}
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.borderColor}`}>
                          <span>{statusCfg.icon}</span>
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* 6. Confirmation / Next Step */}
                      <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">
                        {confirmationText}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Video Interview Pulse Button */}
                          {matchedInterview && (
                            <button
                              onClick={() => handleJoinMeeting(matchedInterview.meetingLink)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-700 text-white text-[11px] font-bold hover:bg-purple-800 transition-colors shadow-xs"
                            >
                              <Video className="w-3 h-3" />
                              <span>Interview</span>
                            </button>
                          )}

                          {/* View Sent Email Link */}
                          {(app.senderEmail || app.emailMessageId) && (
                            <button
                              onClick={() => {
                                if (app.viewSentEmailUrl) {
                                  window.open(app.viewSentEmailUrl, '_blank', 'noopener,noreferrer');
                                } else {
                                  setViewEmailApp(app);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                              title="Open verified sent email"
                            >
                              <Mail className="w-3 h-3 text-indigo-700" />
                              <span>View Sent Email</span>
                              <ArrowUpRight className="w-2.5 h-2.5 text-indigo-500" />
                            </button>
                          )}

                          {/* External Portal Link */}
                          {curStatus === 'external_application_required' && (app.destinationUrl || app.officialApplyUrl) && (
                            <a
                              href={app.destinationUrl || app.officialApplyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors shadow-xs"
                            >
                              <span>Open Portal</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          {/* Assisted Portal Pre-filled Manifest */}
                          {app.assistedAutofillManifest && (
                            <button
                              onClick={() => setManifestModalApp(app)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-700 text-[11px] font-semibold hover:bg-neutral-50 transition-colors"
                              title="View pre-filled details"
                            >
                              <FileText className="w-3 h-3 text-neutral-500" />
                              <span className="hidden sm:inline">Details</span>
                            </button>
                          )}

                          {/* Lightweight History Drawer (for internal audit/debugging) */}
                          <button
                            onClick={() => handleOpenHistory(app)}
                            className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                            title="Application History"
                          >
                            <Activity className="w-3.5 h-3.5 text-neutral-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW SENT EMAIL MODAL */}
      {viewEmailApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-5 space-y-4 shadow-xl border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Verified Sent Email</h3>
                  <p className="text-[11px] text-neutral-500">
                    Dispatched from your connected {viewEmailApp.emailProvider?.toUpperCase() || 'OAuth'} account
                  </p>
                </div>
              </div>
              <button onClick={() => setViewEmailApp(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg space-y-1.5 border border-neutral-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">From:</span>
                  <span className="font-semibold text-neutral-800">{viewEmailApp.senderEmail || 'Your Connected Account'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">To:</span>
                  <span className="font-semibold text-neutral-800">{viewEmailApp.recipientEmail || viewEmailApp.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Subject:</span>
                  <span className="font-medium text-neutral-900 truncate max-w-[280px]">
                    Application for {viewEmailApp.jobTitle} - {viewEmailApp.companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date:</span>
                  <span className="text-neutral-700">
                    {viewEmailApp.emailSentAt ? new Date(viewEmailApp.emailSentAt).toLocaleString() : 'Recently Dispatched'}
                  </span>
                </div>
                {viewEmailApp.emailMessageId && (
                  <div className="flex justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-200">
                    <span>Message ID:</span>
                    <span className="font-mono">{viewEmailApp.emailMessageId}</span>
                  </div>
                )}
              </div>

              {/* Resume Attachment Badge */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-emerald-950 block text-[11px]">
                      {viewEmailApp.resumeFileName || 'Resume.pdf'} Attached
                    </span>
                    <span className="text-[10px] text-emerald-800">
                      Standard PDF resume was transmitted directly to employer inbox.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  PDF ✓
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button size="sm" variant="secondary" onClick={() => setViewEmailApp(null)} className="text-xs">
                Close
              </Button>
              {viewEmailApp.viewSentEmailUrl ? (
                <a
                  href={viewEmailApp.viewSentEmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <span>Open in {viewEmailApp.emailProvider === 'gmail' ? 'Gmail' : 'Outlook'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              ) : (
                <a
                  href="https://mail.google.com/mail/u/0/#sent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <span>Open Sent Items</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* APPLICATION HISTORY MODAL (Audit/Debugging) */}
      {historyModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-5 space-y-4 shadow-xl border-neutral-200 bg-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Application Event History</h3>
                <p className="text-[11px] text-neutral-500">
                  {historyModalApp.jobTitle} at {historyModalApp.companyName}
                </p>
              </div>
              <button onClick={() => setHistoryModalApp(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
              {loadingHistory ? (
                <div className="py-8 text-center text-neutral-400">Loading audit events...</div>
              ) : appHistoryEvents.length === 0 ? (
                <div className="p-4 bg-neutral-50 rounded-lg text-center text-neutral-500">
                  Application recorded on {new Date(historyModalApp.appliedAt).toLocaleDateString()}. No subsequent telemetry events logged.
                </div>
              ) : (
                appHistoryEvents.map((evt, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">{evt.title || evt.eventType}</span>
                      <span className="text-[10px] text-neutral-400">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600">{evt.description}</p>
                    {evt.actor && (
                      <span className="inline-block text-[9.5px] font-mono text-neutral-400 uppercase">
                        Actor: {evt.actor}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setHistoryModalApp(null)} className="text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ASSISTED MANIFEST MODAL */}
      {manifestModalApp && manifestModalApp.assistedAutofillManifest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-5 space-y-4 shadow-xl border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Pre-filled Application Details</h3>
                <p className="text-[11px] text-neutral-500">
                  Tailored for {manifestModalApp.companyName} ({manifestModalApp.assistedAutofillManifest.platform?.toUpperCase()})
                </p>
              </div>
              <button onClick={() => setManifestModalApp(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                <span className="font-bold text-neutral-800 block text-[11px]">Personal Profile</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Name: <strong>{manifestModalApp.assistedAutofillManifest.prefilledFields?.fullName}</strong></div>
                  <div>Email: <strong>{manifestModalApp.assistedAutofillManifest.prefilledFields?.email}</strong></div>
                  <div>Phone: <strong>{manifestModalApp.assistedAutofillManifest.prefilledFields?.phone || 'N/A'}</strong></div>
                  <div>Discipline: <strong>{manifestModalApp.assistedAutofillManifest.prefilledFields?.headline || 'Applicant'}</strong></div>
                </div>
              </div>

              {manifestModalApp.assistedAutofillManifest.prefilledFields?.tailoredCoverLetter && (
                <div className="space-y-1">
                  <span className="font-bold text-neutral-700 block text-[11px]">Tailored Cover Letter:</span>
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px] text-neutral-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {manifestModalApp.assistedAutofillManifest.prefilledFields.tailoredCoverLetter}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button size="sm" variant="secondary" onClick={() => setManifestModalApp(null)} className="text-xs">
                Close
              </Button>
              {manifestModalApp.assistedAutofillManifest.portalUrl && (
                <a
                  href={manifestModalApp.assistedAutofillManifest.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <span>Open Career Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* PREFERENCES & QUOTAS MODAL */}
      {preferencesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 space-y-4 shadow-xl border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">Auto-Apply Preferences</h3>
              </div>
              <button onClick={() => setPreferencesModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="flex items-center justify-between font-semibold text-neutral-800 mb-1">
                  <span>Daily Application Limit:</span>
                  <span className="font-bold text-neutral-900">{autoApplyPreferences.autoApplyDailyLimit} per day</span>
                </label>
                <select
                  value={autoApplyPreferences.autoApplyDailyLimit}
                  onChange={(e) => setAutoApplyPreferences((prev) => ({ ...prev, autoApplyDailyLimit: Number(e.target.value) }))}
                  className="w-full p-2 rounded-lg border border-neutral-300 bg-white text-xs"
                >
                  <option value="3">3 Applications / Day</option>
                  <option value="5">5 Applications / Day (Recommended)</option>
                  <option value="10">10 Applications / Day</option>
                  <option value="15">15 Applications / Day</option>
                </select>
              </div>

              <div>
                <label className="flex items-center justify-between font-semibold text-neutral-800 mb-1">
                  <span>Minimum Compatibility Score:</span>
                  <span className="font-bold text-neutral-900">{autoApplyPreferences.autoApplyMinScore}%</span>
                </label>
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="5"
                  value={autoApplyPreferences.autoApplyMinScore}
                  onChange={(e) => setAutoApplyPreferences((prev) => ({ ...prev, autoApplyMinScore: Number(e.target.value) }))}
                  className="w-full accent-neutral-900"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                  <span>60% (Broad)</span>
                  <span>75% (Recommended)</span>
                  <span>90% (Strict)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button size="sm" variant="secondary" onClick={() => setPreferencesModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleSavePreferences(autoApplyPreferences)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold"
              >
                Save Preferences
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
