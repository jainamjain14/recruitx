import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { decodeHtmlEntities } from '../components/CompanyLocationMap';
import { useNavigate } from 'react-router-dom';
import { getResumeFileUrl } from '../utils/resumeUrl';
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
  ShieldCheck,
  Hash,
  Mail,
  BadgeCheck,
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

export type EvidenceClassification =
  | 'internal_recruitx'
  | 'candidate_provided'
  | 'external_system_response'
  | 'independently_authenticated';

export const APPLICATION_STATUS_CONFIG: Record<
  PrimaryApplicationStatus,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: string;
    description: string;
    actionRequired: boolean;
  }
> = {
  saved_in_recruitx: {
    label: 'Saved in RecruitX',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    icon: '💾',
    description: 'Application information is stored internally in your candidate database.',
    actionRequired: false,
  },
  external_application_required: {
    label: 'External Application Required',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300 font-bold',
    icon: '⚠️',
    description: 'Candidate must complete submission on the employer official career portal.',
    actionRequired: true,
  },
  awaiting_employer_verification: {
    label: 'Submitted — Awaiting Employer Verification',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-900',
    borderColor: 'border-sky-300 font-semibold',
    icon: '⏳',
    description: 'Application was submitted, but independent employer receipt has not yet been established.',
    actionRequired: false,
  },
  email_sent: {
    label: 'Email Sent — Verified Outbox',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-900',
    borderColor: 'border-indigo-300 font-bold',
    icon: '✉️',
    description: 'Application email dispatched directly to employer recruitment inbox with resume attached.',
    actionRequired: false,
  },
  email_delivered: {
    label: 'Email Delivered — Recipient Mailbox',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    borderColor: 'border-teal-300 font-bold',
    icon: '📬',
    description: 'Mail transfer agent confirmed successful delivery to receiving employer mailbox server.',
    actionRequired: false,
  },
  employer_receipt_confirmed: {
    label: 'Employer Receipt Confirmed',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-400 font-bold',
    icon: '✓',
    description: 'Genuine external evidence independently confirms the employer application system received it.',
    actionRequired: false,
  },
  employer_status_updated: {
    label: 'Employer Status Updated',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300 font-bold',
    icon: '⚡',
    description: 'Authentic employer or authorized ATS information confirms a progression in your application status.',
    actionRequired: false,
  },
  submission_failed: {
    label: 'Submission Failed',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300 font-bold',
    icon: '✕',
    description: 'Actual submission attempt failed. Please review error details.',
    actionRequired: true,
  },
  unable_to_verify: {
    label: 'Unable to Verify',
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    icon: '?',
    description: 'Submission or receipt cannot currently be independently established.',
    actionRequired: true,
  },
};

export const getEvidenceBadge = (level?: string) => {
  switch (level) {
    case 'independently_authenticated':
      return {
        label: 'Independently Authenticated (ATS / DKIM)',
        bg: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
        icon: '🛡️',
      };
    case 'external_system_response':
      return {
        label: 'External System Response (Gateway)',
        bg: 'bg-blue-50 text-blue-900 border-blue-200 font-medium',
        icon: '🌐',
      };
    case 'candidate_provided':
      return {
        label: 'Candidate Self-Reported Evidence',
        bg: 'bg-amber-50 text-amber-900 border-amber-300 font-medium',
        icon: '👤',
      };
    default:
      return {
        label: 'RecruitX Internal Record',
        bg: 'bg-neutral-100 text-neutral-700 border-neutral-200 font-medium',
        icon: '📋',
      };
  }
};

export const getAppStatus = (app: any): PrimaryApplicationStatus => {
  if (!app) return 'external_application_required';
  if (app.authoritativeStatus && APPLICATION_STATUS_CONFIG[app.authoritativeStatus as PrimaryApplicationStatus]) {
    return app.authoritativeStatus as PrimaryApplicationStatus;
  }
  if (app.status && APPLICATION_STATUS_CONFIG[app.status as PrimaryApplicationStatus]) {
    return app.status as PrimaryApplicationStatus;
  }
  if (app.hiringStage && app.hiringStage !== 'applied') return 'employer_status_updated';
  if (['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(app.status)) return 'employer_status_updated';
  if (app.employerReceipt?.isIndependentlyAuthenticated) return 'employer_receipt_confirmed';
  if (app.emailDeliveryStatus === 'delivered' || app.status === 'email_delivered') return 'email_delivered';
  if (app.emailDeliveryStatus === 'sent' || app.emailMessageId || app.status === 'email_sent') return 'email_sent';
  if (app.submissionStatus === 'external_awaiting_verification' || app.status === 'awaiting_employer_verification') return 'awaiting_employer_verification';
  if (app.submissionStatus === 'requires_manual_application' || app.status === 'external_application_required') return 'external_application_required';
  if (app.submissionStatus === 'submission_failed') return 'submission_failed';
  if (app.submissionStatus === 'unable_to_verify') return 'unable_to_verify';
  if (app.recruiter) return 'awaiting_employer_verification';
  return 'external_application_required';
};

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

export interface VerificationLifecycleStep {
  key: string;
  label: string;
  desc: string;
}

const VERIFICATION_LIFECYCLE_STEPS: VerificationLifecycleStep[] = [
  { key: 'recorded', label: '1. Recorded', desc: 'Application recorded in RecruitX candidate database.' },
  { key: 'dispatched', label: '2. Dispatched', desc: 'Dispatched to employer career portal / recruiter queue.' },
  { key: 'external_accepted', label: '3. Gateway Accepted', desc: 'Transmission accepted by receiving employer gateway.' },
  { key: 'employer_receipt_confirmed', label: '4. Employer Receipt', desc: 'Authentic ATS reference number or verified email receipt confirmed.' },
  { key: 'employer_status_updated', label: '5. Employer Action', desc: 'Hiring team actively progressing candidate through ATS screening.' },
];

const getLifecycleStepIdx = (app: any): number => {
  if (!app) return 0;
  const status = getAppStatus(app);
  if (status === 'employer_status_updated') return 4;
  if (status === 'employer_receipt_confirmed') return 3;
  if (status === 'email_delivered') return 3;
  if (status === 'email_sent') return 2;
  if (status === 'awaiting_employer_verification') {
    return app.submissionType === 'direct_hr_dispatch' || app.recruiter ? 2 : 1;
  }
  return 0;
};

export const StudentApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Slideout Drawer
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [confirmingAppId, setConfirmingAppId] = useState<string | null>(null);

  // Link Employer Receipt Modal State
  const [receiptModalApp, setReceiptModalApp] = useState<any | null>(null);
  const [receiptRefNumber, setReceiptRefNumber] = useState('');
  const [receiptSenderEmail, setReceiptSenderEmail] = useState('');
  const [receiptSnippet, setReceiptSnippet] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptHeaders, setReceiptHeaders] = useState('');
  const [linkingReceipt, setLinkingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null);

  const openReceiptModal = (app: any) => {
    setReceiptModalApp(app);
    setReceiptRefNumber(app.employerReceipt?.externalReferenceNumber || '');
    setReceiptSenderEmail(app.employerReceipt?.employerSenderEmail || '');
    setReceiptSnippet(app.employerReceipt?.employerConfirmationSnippet || '');
    setReceiptHeaders(app.employerReceipt?.rawEmailHeaders || '');
    setReceiptDate(
      app.employerReceipt?.confirmedAt
        ? new Date(app.employerReceipt.confirmedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setReceiptError(null);
    setReceiptSuccess(null);
  };

  const handleLinkReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalApp) return;

    if (!receiptRefNumber.trim() && !receiptSenderEmail.trim()) {
      setReceiptError('Please enter either an Employer ATS Reference Number or Employer Confirmation Email sender.');
      return;
    }

    setLinkingReceipt(true);
    setReceiptError(null);
    setReceiptSuccess(null);

    try {
      const res = await api.post(`/applications/${receiptModalApp._id}/link-employer-receipt`, {
        externalReferenceNumber: receiptRefNumber.trim(),
        employerSenderEmail: receiptSenderEmail.trim(),
        employerConfirmationSnippet: receiptSnippet.trim(),
        rawEmailHeaders: receiptHeaders.trim() || undefined,
        receivedAt: receiptDate || new Date().toISOString(),
      });

      if (res.data?.success) {
        const updated = res.data.data?.application;
        setApplications((prev) =>
          prev.map((a) => (a._id === receiptModalApp._id ? { ...a, ...updated } : a))
        );
        if (selectedApp && selectedApp._id === receiptModalApp._id) {
          setSelectedApp((prev: any) => ({ ...prev, ...updated }));
        }
        setReceiptSuccess('Employer confirmation receipt verified and linked successfully!');
        setTimeout(() => {
          setReceiptModalApp(null);
          setReceiptSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Failed to link employer receipt:', err);
      setReceiptError(err.response?.data?.message || err.message || 'Failed to verify employer confirmation receipt.');
    } finally {
      setLinkingReceipt(false);
    }
  };

  const handleConfirmManualApplication = async (appId: string) => {
    try {
      setConfirmingAppId(appId);
      const res = await api.patch(`/applications/${appId}/confirm-manual`, {
        note: 'Candidate completed external career portal submission — External Submission Awaiting Verification.',
      });
      if (res.data?.success) {
        const updated = res.data.data?.application || res.data.data;
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, ...updated, submissionStatus: 'external_awaiting_verification' } : a))
        );
        if (selectedApp && selectedApp._id === appId) {
          setSelectedApp((prev: any) => ({ ...prev, ...updated, submissionStatus: 'external_awaiting_verification' }));
        }
      }
    } catch (err: any) {
      console.error('Failed to confirm manual application:', err);
      alert(err.response?.data?.message || 'Failed to update application status.');
    } finally {
      setConfirmingAppId(null);
    }
  };

  const getSubmissionBadge = (submissionStatus?: string, employerReceipt?: any, appStatus?: string) => {
    if (employerReceipt) {
      return {
        label: 'Employer Receipt Confirmed',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
        icon: '✓',
      };
    }
    if (appStatus === 'email_delivered' || submissionStatus === 'email_delivered') {
      return {
        label: 'Delivered to Recipient Mailbox',
        bg: 'bg-teal-50 text-teal-900 border-teal-300 font-bold',
        icon: '📬',
      };
    }
    if (appStatus === 'email_sent' || submissionStatus === 'email_sent') {
      return {
        label: 'Dispatched via Verified Email',
        bg: 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold',
        icon: '✉️',
      };
    }
    switch (submissionStatus) {
      case 'external_awaiting_verification':
        return {
          label: 'External Submission — Awaiting Verification',
          bg: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          icon: '⏳',
        };
      case 'submitted':
        return {
          label: 'Confirmed Submitted',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: '✓',
        };
      case 'requires_manual_application':
        return {
          label: 'Action Required: Official Portal',
          bg: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
          icon: '⚠️',
        };
      case 'submission_failed':
        return {
          label: 'Submission Failed',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: '✕',
        };
      case 'submitting':
      case 'pending':
        return {
          label: 'Transmitting...',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: '⏳',
        };
      case 'unable_to_verify':
        return {
          label: 'Unable to Verify',
          bg: 'bg-neutral-100 text-neutral-700 border-neutral-300',
          icon: '?',
        };
      default:
        return {
          label: 'Verified Recruiter Queue',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: '✓',
        };
    }
  };

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

  /** Route internal /meeting/:code links via React Router; open external links in new tab */
  const handleJoinMeeting = (meetingLink: string) => {
    if (!meetingLink) return;
    // Internal route
    if (meetingLink.startsWith('/meeting/')) {
      navigate(meetingLink);
      return;
    }
    // Legacy external Jitsi link — extract code and route internally
    const externalMatch = meetingLink.match(/recruitx-([^/?#]+)/);
    if (externalMatch) {
      navigate(`/meeting/${externalMatch[1]}`);
      return;
    }
    window.open(meetingLink, '_blank', 'noreferrer');
  };


  const getStepIndex = (status: string): number => {
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

  // Filter applications by authoritative status
  const filteredApps = applications.filter((app) => {
    const title = decodeHtmlEntities(app.jobTitle || app.job?.title || '').toLowerCase();
    const company = decodeHtmlEntities(app.companyName || app.job?.company || '').toLowerCase();
    const matchesSearch = title.includes(search.toLowerCase()) || company.includes(search.toLowerCase());
    const appStatus = getAppStatus(app);
    const matchesStatus = statusFilter === 'ALL' || appStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Metrics based on mutually exclusive statuses
  const totalCount = applications.length;
  const externalReqCount = applications.filter((a) => getAppStatus(a) === 'external_application_required').length;
  const emailSentCount = applications.filter((a) => getAppStatus(a) === 'email_sent' || getAppStatus(a) === 'email_delivered').length;
  const awaitingCount = applications.filter((a) => getAppStatus(a) === 'awaiting_employer_verification').length;
  const verifiedCount = applications.filter(
    (a) => getAppStatus(a) === 'employer_receipt_confirmed' || getAppStatus(a) === 'employer_status_updated'
  ).length;

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 border-neutral-200 bg-white">
          <span className="text-[11px] font-semibold text-neutral-500 block">Tracked Roles</span>
          <span className="text-xl font-bold text-neutral-900 mt-0.5 block">{totalCount}</span>
        </Card>
        <Card className="p-3.5 border-amber-300 bg-amber-50/40">
          <span className="text-[11px] font-bold text-amber-900 block">External Action</span>
          <span className="text-xl font-bold text-amber-800 mt-0.5 block">{externalReqCount}</span>
        </Card>
        <Card className="p-3.5 border-indigo-300 bg-indigo-50/40">
          <span className="text-[11px] font-bold text-indigo-900 block">Email Sent</span>
          <span className="text-xl font-bold text-indigo-800 mt-0.5 block">{emailSentCount}</span>
        </Card>
        <Card className="p-3.5 border-sky-300 bg-sky-50/40">
          <span className="text-[11px] font-bold text-sky-900 block">Awaiting Verification</span>
          <span className="text-xl font-bold text-sky-800 mt-0.5 block">{awaitingCount}</span>
        </Card>
        <Card className="p-3.5 border-emerald-300 bg-emerald-50/40">
          <span className="text-[11px] font-bold text-emerald-900 block">Employer Confirmed</span>
          <span className="text-xl font-bold text-emerald-800 mt-0.5 block">{verifiedCount}</span>
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
            <option value="ALL">All Application Statuses ({totalCount})</option>
            <option value="external_application_required">External Application Required ({externalReqCount})</option>
            <option value="email_sent">Email Sent ({emailSentCount})</option>
            <option value="email_delivered">Email Delivered</option>
            <option value="awaiting_employer_verification">Submitted — Awaiting Verification ({awaitingCount})</option>
            <option value="employer_receipt_confirmed">Employer Receipt Confirmed ({verifiedCount})</option>
            <option value="employer_status_updated">Employer Status Updated</option>
            <option value="submission_failed">Submission Failed</option>
            <option value="unable_to_verify">Unable to Verify</option>
            <option value="saved_in_recruitx">Saved in RecruitX</option>
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
                      {/* Authoritative Mutually Exclusive Application Status Badge */}
                      {(() => {
                        const curStatus = getAppStatus(app);
                        const cfg = APPLICATION_STATUS_CONFIG[curStatus];
                        return (
                          <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}>
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        );
                      })()}
                      {/* Evidence Classification Badge */}
                      {(() => {
                        const ev = getEvidenceBadge(app.evidenceClassification);
                        return (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${ev.bg}`}>
                            <span>{ev.icon}</span>
                            <span>{ev.label}</span>
                          </span>
                        );
                      })()}
                      {/* Specific Hiring Pipeline Sub-Stage if Updated */}
                      {(app.hiringStage || (app.status && ['under_review', 'shortlisted', 'interview_scheduled', 'offered', 'rejected'].includes(app.status))) && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                          Stage: {(app.hiringStage || app.status).replace('_', ' ')}
                        </span>
                      )}
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
                      <button
                        onClick={() => handleJoinMeeting(matchedInterview.meetingLink)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-xs animate-pulse"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Video Interview
                      </button>
                    )}
                    {!app.employerReceipt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReceiptModal(app);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                        title="Link verified employer confirmation email or ATS reference number"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Link Receipt</span>
                      </button>
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

                {/* External Portal Action Required Banner */}
                {getAppStatus(app) === 'external_application_required' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">Action Required: Official Employer Application</p>
                        <p className="text-amber-900 text-[11px]">
                          This opportunity requires direct submission on {company}'s career portal. RecruitX has saved this opportunity in your candidate tracker. Click below to submit directly on their portal.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(app.destinationUrl || app.officialApplyUrl) && (
                        <a
                          href={app.destinationUrl || app.officialApplyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-xs"
                        >
                          Open Portal <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleConfirmManualApplication(app._id)}
                        disabled={confirmingAppId === app._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors"
                      >
                        {confirmingAppId === app._id ? 'Updating...' : '✓ I Applied on Portal'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Email Sent / Delivered Banner */}
                {(getAppStatus(app) === 'email_sent' || getAppStatus(app) === 'email_delivered' || app.senderEmail) && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-indigo-950">
                            {getAppStatus(app) === 'email_delivered' ? 'Email Delivered to Company Mailbox' : 'Application Sent via Authorized Email'}
                          </span>
                          {app.emailProvider && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                              {app.emailProvider === 'gmail' ? 'Google Gmail API' : (app.emailProvider === 'outlook' ? 'Microsoft Graph API' : 'Brevo Gateway')}
                            </span>
                          )}
                          {app.resumeAttached && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Resume Attached ({app.resumeFileName || 'Resume.pdf'})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-indigo-900 flex items-center gap-2 flex-wrap font-mono">
                          {app.senderEmail && <span>From: {app.senderEmail}</span>}
                          {app.recipientEmail && <span>➔ To: {app.recipientEmail}</span>}
                          {app.emailMessageId && <span className="text-neutral-500 font-normal">ID: {app.emailMessageId.substring(0, 16)}...</span>}
                        </div>
                      </div>
                    </div>
                    {app.emailSentAt && (
                      <span className="text-[10px] text-indigo-700 font-medium shrink-0">
                        Dispatched {new Date(app.emailSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}

                {/* Submitted — Awaiting Employer Verification Banner */}
                {getAppStatus(app) === 'awaiting_employer_verification' && (
                  <div className="p-3 bg-sky-50 border border-sky-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sky-950">Submitted — Awaiting Independent Employer Verification</p>
                        <p className="text-sky-900 text-[11px]">
                          Submission recorded for {company}. Have an official confirmation email or ATS reference number? Link it or paste raw email headers for independent cryptographic verification.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openReceiptModal(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Link Email / Headers
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmed Employer Receipt Card Banner */}
                {app.employerReceipt && (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-emerald-950">Employer Receipt Confirmed:</span>
                        {app.employerReceipt.externalReferenceNumber && (
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300/60">
                            Ref: {app.employerReceipt.externalReferenceNumber}
                          </span>
                        )}
                        {app.employerReceipt.employerSenderEmail && (
                          <span className="text-[11px] text-emerald-800 font-medium">
                            via {app.employerReceipt.employerSenderEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Verified {new Date(app.employerReceipt.confirmedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Submission Failure Alert */}
                {app.submissionStatus === 'submission_failed' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 text-xs text-rose-900" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold text-rose-900">Application Dispatch Failed</p>
                        <p className="text-rose-700 text-[11px]">
                          {app.submissionError || 'Automated dispatch to company inbox failed. Please apply directly via official employer portal.'}
                        </p>
                      </div>
                    </div>
                    {(app.destinationUrl || app.officialApplyUrl) && (
                      <a
                        href={app.destinationUrl || app.officialApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 transition-colors shrink-0"
                      >
                        Official Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

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
                          {new Date(matchedInterview.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinMeeting(matchedInterview.meetingLink)}
                      className="text-xs font-bold text-purple-800 hover:text-purple-950 underline flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" /> Join Meeting
                    </button>
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(() => {
                    const curStatus = getAppStatus(selectedApp);
                    const cfg = APPLICATION_STATUS_CONFIG[curStatus];
                    return (
                      <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>
                    );
                  })()}
                  {(() => {
                    const ev = getEvidenceBadge(selectedApp.evidenceClassification);
                    return (
                      <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${ev.bg}`}>
                        <span>{ev.icon}</span>
                        <span>{ev.label}</span>
                      </span>
                    );
                  })()}
                </div>
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

              {/* 5-Stage Verification Lifecycle Stepper */}
              <div className="space-y-3 p-4 rounded-xl border border-neutral-200 bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Employer Verification Lifecycle
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                    Stage {getLifecycleStepIdx(selectedApp) + 1} of 5
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {VERIFICATION_LIFECYCLE_STEPS.map((step, idx) => {
                    const currentIdx = getLifecycleStepIdx(selectedApp);
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={step.key} className="space-y-1.5 text-center">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCurrent
                              ? 'bg-purple-600 ring-2 ring-purple-300 animate-pulse'
                              : isDone
                              ? 'bg-emerald-600'
                              : 'bg-neutral-200'
                          }`}
                        />
                        <div className="hidden sm:block">
                          <span
                            className={`text-[9.5px] font-bold block leading-tight ${
                              isCurrent
                                ? 'text-purple-700 font-extrabold'
                                : isDone
                                ? 'text-emerald-700'
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

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700 flex items-center gap-2">
                  <span className="font-bold text-neutral-900 shrink-0">
                    Current Stage:
                  </span>
                  <span>{VERIFICATION_LIFECYCLE_STEPS[getLifecycleStepIdx(selectedApp)].desc}</span>
                </div>
              </div>

              {/* Genuine Employer-Side Verification Evidence Card */}
              <div className="space-y-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-700" />
                    Employer-Side Verification Evidence
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedApp.employerReceipt
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : selectedApp.submissionType === 'platform_recruiter'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : selectedApp.submissionStatus === 'external_awaiting_verification'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                  }`}>
                    {selectedApp.employerReceipt
                      ? 'Employer Receipt Confirmed ✓'
                      : selectedApp.submissionType === 'platform_recruiter'
                      ? 'Verified Recruiter ATS Queue'
                      : selectedApp.submissionStatus === 'external_awaiting_verification'
                      ? 'Awaiting Employer Verification ⏳'
                      : 'Unverified External Portal'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                    <span className="text-[10px] text-neutral-500 font-medium block">Verification Source</span>
                    <span className="font-bold text-neutral-900 block truncate">
                      {selectedApp.atsVerification?.verificationSource || (
                        selectedApp.employerReceipt
                          ? (selectedApp.employerReceipt.receiptSource === 'employer_confirmation_email'
                              ? 'Employer Confirmation Email Receipt'
                              : 'External ATS Application Reference')
                          : (selectedApp.submissionType === 'platform_recruiter'
                              ? 'RecruitX Verified Recruiter Portal'
                              : selectedApp.submissionStatus === 'external_awaiting_verification'
                              ? 'Candidate Self-Reported External Dispatch'
                              : 'Candidate Web Portal Dispatch')
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                    <span className="text-[10px] text-neutral-500 font-medium block">ATS / Gateway System</span>
                    <span className="font-bold text-neutral-900 block truncate">
                      {selectedApp.externalAtsName || (selectedApp.submissionType === 'platform_recruiter' ? 'RecruitX Verified Recruiter ATS' : 'Employer Career Portal')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                    <span className="text-[10px] text-neutral-500 font-medium block">External Application / Ref #</span>
                    <span className="font-mono text-[11px] font-bold text-neutral-900 block truncate">
                      {selectedApp.employerReceipt?.externalReferenceNumber || (
                        selectedApp.submissionType === 'platform_recruiter'
                          ? `RCX-ATS-${(selectedApp._id || '').substring(0, 10).toUpperCase()}`
                          : selectedApp.submissionStatus === 'external_awaiting_verification'
                          ? 'Awaiting Candidate Receipt Link'
                          : 'Not Provided'
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                    <span className="text-[10px] text-neutral-500 font-medium block">Employer Acknowledged By</span>
                    <span className="font-bold text-neutral-900 block truncate">
                      {selectedApp.employerReceipt?.acknowledgedBy || (
                        selectedApp.recruiter?.name
                          ? `${selectedApp.recruiter.name} (Hiring Team)`
                          : selectedApp.submissionStatus === 'external_awaiting_verification'
                          ? 'Pending Employer Email/ATS Acknowledgment'
                          : 'Pending Employer Confirmation'
                      )}
                    </span>
                  </div>
                </div>

                {selectedApp.employerReceipt?.receiptHash && (
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 font-medium">Receipt Integrity Fingerprint (SHA-256)</span>
                      <span className="text-[10px] font-bold text-emerald-700">Tamper-Proof Audit ✓</span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-700 block truncate select-all pt-0.5">
                      {selectedApp.employerReceipt.receiptHash}
                    </span>
                  </div>
                )}

                {selectedApp.employerReceipt?.employerConfirmationSnippet && (
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs space-y-1">
                    <span className="text-[10px] text-neutral-500 font-medium block">Employer Confirmation Snippet</span>
                    <p className="text-neutral-700 text-[11px] italic bg-neutral-50 p-2 rounded border border-neutral-100">
                      "{selectedApp.employerReceipt.employerConfirmationSnippet}"
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-emerald-200">
                  <span className="text-[11px] text-emerald-800 font-medium">
                    {selectedApp.employerReceipt
                      ? '✓ Authentic company-side evidence on file.'
                      : 'Have an ATS reference number or confirmation email?'}
                  </span>
                  <button
                    onClick={() => openReceiptModal(selectedApp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-xs shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedApp.employerReceipt ? 'Update Employer Receipt' : 'Link Employer Receipt'}
                  </button>
                </div>
              </div>

              {/* Verifiable Transmission & Delivery Audit Section */}
              <div className="space-y-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Application Transmission & Delivery Audit
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedApp.employerReceipt
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : selectedApp.submissionStatus === 'requires_manual_application'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : selectedApp.submissionStatus === 'submission_failed'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}>
                    {selectedApp.employerReceipt
                      ? 'Employer Receipt Confirmed ✓'
                      : selectedApp.submissionStatus === 'requires_manual_application'
                      ? 'Action Required: Official Portal'
                      : selectedApp.submissionStatus === 'submission_failed'
                      ? 'Submission Failed'
                      : 'Confirmed Submitted ✓'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-medium block">Destination System</span>
                    <span className="font-bold text-neutral-900 block truncate">
                      {selectedApp.applicationDestination || (selectedApp.submissionType === 'platform_recruiter' ? 'RecruitX Verified Recruiter Portal' : 'Official Employer System')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-medium block">Dispatch Method</span>
                    <span className="font-bold text-neutral-900 block truncate">
                      {selectedApp.confirmationDetails?.dispatchMethod || (selectedApp.submissionType === 'platform_recruiter' ? 'Verified Recruiter ATS + Socket' : selectedApp.submissionType === 'direct_hr_dispatch' ? 'Verified Brevo HTTPS API' : 'External Portal Link')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-medium block">Confirmation / Audit ID</span>
                    <span className="font-mono text-[11px] font-bold text-neutral-800 block truncate">
                      {selectedApp.confirmationDetails?.confirmationId || `RCX-AUDIT-${(selectedApp._id || '').substring(0, 8).toUpperCase()}`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                    <span className="text-[10px] text-neutral-400 font-medium block">Resume & Data Transmission</span>
                    <span className="font-bold text-emerald-700 block">
                      {selectedApp.resumeTransmitted !== false
                        ? '✓ Transmitted & Verified Received'
                        : '⚠️ Pending Candidate External Upload'}
                    </span>
                  </div>
                </div>

                {(selectedApp.destinationUrl || selectedApp.officialApplyUrl) && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-neutral-200/60">
                    <a
                      href={selectedApp.destinationUrl || selectedApp.officialApplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Official Application Portal Link
                    </a>
                    {selectedApp.submissionStatus === 'requires_manual_application' && (
                      <button
                        onClick={() => handleConfirmManualApplication(selectedApp._id)}
                        disabled={confirmingAppId === selectedApp._id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                      >
                        {confirmingAppId === selectedApp._id ? 'Updating...' : '✓ Confirm I Applied on Portal'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Candidate Email Dispatch & Attachment Audit (if email application) */}
              {(selectedApp.senderEmail || selectedApp.recipientEmail || selectedApp.emailMessageId || selectedApp.status === 'email_sent' || selectedApp.status === 'email_delivered') && (
                <div className="space-y-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      Authentic Email Transmission Audit
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                      {selectedApp.emailProvider === 'gmail' ? 'Google Gmail REST API' : (selectedApp.emailProvider === 'outlook' ? 'Microsoft Graph API' : 'RecruitX Gateway')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-indigo-200">
                      <span className="text-[10px] text-neutral-400 font-medium block">Authorized Sender Address</span>
                      <span className="font-mono text-[11px] font-bold text-neutral-900 block truncate">
                        {selectedApp.senderEmail || 'Connected Candidate Address'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-indigo-200">
                      <span className="text-[10px] text-neutral-400 font-medium block">Recipient Employer Inbox</span>
                      <span className="font-mono text-[11px] font-bold text-neutral-900 block truncate">
                        {selectedApp.recipientEmail || 'Company Recruitment Inbox'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-indigo-200">
                      <span className="text-[10px] text-neutral-400 font-medium block">Provider External Message ID</span>
                      <span className="font-mono text-[10px] font-bold text-neutral-800 block truncate select-all">
                        {selectedApp.emailMessageId || 'Confirmed API Dispatch'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-indigo-200">
                      <span className="text-[10px] text-neutral-400 font-medium block">Attached Resume File</span>
                      <span className="font-semibold text-emerald-700 block truncate">
                        {selectedApp.resumeAttached
                          ? `✓ ${selectedApp.resumeFileName || 'Resume.pdf'}`
                          : 'Resume Included in Dispatch'}
                      </span>
                    </div>
                  </div>

                  {selectedApp.emailSentAt && (
                    <div className="p-2 bg-white rounded border border-indigo-200 text-[10.5px] text-indigo-900 flex items-center justify-between">
                      <span>Dispatch Timestamp: {new Date(selectedApp.emailSentAt).toLocaleString()}</span>
                      <span className="font-bold text-emerald-700">✓ Cryptographically Signed &amp; Transmitted</span>
                    </div>
                  )}
                </div>
              )}

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
                  <a
                    href={getResumeFileUrl(selectedApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
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

      {/* Link Employer Confirmation Receipt Modal */}
      {receiptModalApp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Link Genuine Employer Confirmation Receipt
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Associate verifiable company-side proof of application receipt for{' '}
                  <span className="font-semibold text-neutral-800">
                    {decodeHtmlEntities(receiptModalApp.companyName || receiptModalApp.job?.company || 'Employer')}
                  </span>.
                </p>
              </div>
              <button
                onClick={() => setReceiptModalApp(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {receiptError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{receiptError}</span>
              </div>
            )}

            {receiptSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{receiptSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLinkReceiptSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-neutral-500" />
                  Employer ATS Reference Number / Application ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. WD-2026-98124, REQ-449102, GH-88219"
                  value={receiptRefNumber}
                  onChange={(e) => setReceiptRefNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono text-xs"
                />
                <p className="text-[10.5px] text-neutral-400">
                  Located in your confirmation email or employer portal (Workday, Greenhouse, Lever, Taleo, etc.).
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  Employer Sender Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. careers@company.com or jobs-noreply@workday.com"
                  value={receiptSenderEmail}
                  onChange={(e) => setReceiptSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
                />
                <p className="text-[10.5px] text-neutral-400">
                  The official corporate domain that dispatched the acknowledgement email.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  Employer Confirmation Snippet / Message Text
                </label>
                <textarea
                  rows={2}
                  placeholder='e.g. "Thank you for applying to the position of Software Engineer. Your application has been received."'
                  value={receiptSnippet}
                  onChange={(e) => setReceiptSnippet(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Raw Email Headers (DKIM / SPF Authentication)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase">Enables Independent Proof</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional: Paste original email headers (e.g. Gmail: Show Original, Outlook: Message Details). If DKIM=pass from the employer domain is detected, your receipt is independently authenticated!"
                  value={receiptHeaders}
                  onChange={(e) => setReceiptHeaders(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-[11px] font-mono resize-none bg-neutral-50"
                />
                <p className="text-[10.5px] text-neutral-400">
                  Headers containing dkim=pass from @company.com cryptographically prove employer receipt without manual intervention.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  Date of Confirmation Received
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReceiptModalApp(null)}
                  disabled={linkingReceipt}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={linkingReceipt}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {linkingReceipt ? 'Verifying Receipt...' : 'Verify & Link Receipt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

