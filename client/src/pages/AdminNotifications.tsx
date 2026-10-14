import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { notificationService, BroadcastPayload } from '../services/notificationService';
import { useNotifications } from '../context/NotificationContext';
import {
  NotificationFormat,
  NotificationType,
  NotificationPriority,
  TargetAudience,
  Announcement,
  CampaignAnalytics,
} from '../types/notification';
import {
  Send,
  Bell,
  BarChart3,
  Sparkles,
  Layers,
  Clock,
  Eye,
  MousePointerClick,
  TrendingUp,
  Megaphone,
  Video,
  CheckCircle2,
  Trash2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const AdminNotifications: React.FC = () => {
  const { startHotspotTour } = useNotifications();

  // Active view tab: 'builder' | 'analytics'
  const [activeTab, setActiveTab] = useState<'builder' | 'analytics'>('builder');

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<TargetAudience>('all');
  const [targetSegment, setTargetSegment] = useState('All Students & Recruiters');
  const [format, setFormat] = useState<NotificationFormat>('banner');
  const [type, setType] = useState<NotificationType>('placement_drive');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [actionText, setActionText] = useState('Register Now');
  const [actionUrl, setActionUrl] = useState('/student/jobs');
  const [imageUrl, setImageUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Analytics State
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await notificationService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load campaign analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setBroadcastSuccess(null);

    try {
      const payload: BroadcastPayload = {
        title,
        message,
        targetRole,
        targetSegment,
        format,
        type,
        priority,
        actionText: actionText.trim() || undefined,
        actionUrl: actionUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const res = await notificationService.broadcastNotification(payload);
      setBroadcastSuccess(
        `Campaign successfully launched! Delivered in real-time to ${res.data?.targetedUsers || 0} active users.`
      );

      // Reset form
      setTitle('');
      setMessage('');
      setImageUrl('');
      setExpiresAt('');

      // Refresh analytics if loaded
      if (analytics) {
        loadAnalytics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="border-b border-neutral-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            In-App Notification & Campaign Command Hub
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create segmented in-app announcements, schedule placement drives, and measure engagement conversion (CTR %).
          </p>
        </div>

        {/* View Switcher Tabs & Tour */}
        <div className="flex items-center gap-2">
          <button
            onClick={startHotspotTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 text-xs font-semibold shadow-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Tour</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'builder'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Campaign Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics & CTR</span>
            </button>
          </div>
        </div>
      </div>

      {broadcastSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{broadcastSuccess}</span>
          </div>
          <button
            onClick={() => setBroadcastSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: CAMPAIGN & ANNOUNCEMENT BUILDER */}
      {/* ============================================================== */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Builder Form (Left 7 Cols) */}
          <form onSubmit={handleBroadcast} className="lg:col-span-7 space-y-4">
            <Card className="p-5 space-y-4 border-neutral-200">
              <div className="border-b border-neutral-100 pb-3">
                <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-neutral-600" />
                  <span>1. Audience Segmentation & Priority</span>
                </h2>
              </div>

              {/* Audience Segmentation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Target Audience Role
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as TargetAudience)}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-2.5 bg-white focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="all">All Users (Students & Recruiters)</option>
                    <option value="student">Students / Job Seekers Only</option>
                    <option value="recruiter">Recruiters / Employers Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Audience Sub-Segment
                  </label>
                  <select
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-2.5 bg-white focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="All Students & Recruiters">Full Batch (All Departments)</option>
                    <option value="Computer Science & IT">Computer Science & IT Only</option>
                    <option value="Electronics & Electrical">Electronics & Electrical Only</option>
                    <option value="Unplaced Candidates">Unplaced Candidates Only</option>
                    <option value="Active Hiring Recruiters">Active Hiring Recruiters</option>
                  </select>
                </div>
              </div>

              {/* Display Format & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    In-App UX Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as NotificationFormat)}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-2.5 bg-white focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="banner">Banner (Announcement Bar)</option>
                    <option value="modal">Modal (Center-Screen Overlay)</option>
                    <option value="toast">Toast (Corner Snackbar)</option>
                    <option value="slideout">Slideout (Feature Drawer)</option>
                    <option value="inbox">Inbox Only (Center List)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Announcement Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as NotificationType)}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-2.5 bg-white focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="placement_drive">Campus Placement Drive</option>
                    <option value="interview_alert">Interview / Exam Alert</option>
                    <option value="job_recommendation">Job Opportunity</option>
                    <option value="system">System / Platform Notice</option>
                    <option value="maintenance">Maintenance Warning</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-2.5 bg-white focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Message Content */}
              <div className="border-t border-neutral-100 pt-3 space-y-3">
                <h2 className="text-sm font-bold text-neutral-900">
                  2. Message & Rich Content
                </h2>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Campaign Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mega Campus Placement Drive 2026: TCS & Infosys"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Announcement Body Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full text-xs rounded-lg border border-neutral-200 p-3 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    placeholder="Provide details about the placement drive, eligibility criteria, interview schedule, or platform alert..."
                    required
                  />
                </div>
              </div>

              {/* CTA Action & Expiration */}
              <div className="border-t border-neutral-100 pt-3 space-y-3">
                <h2 className="text-sm font-bold text-neutral-900">
                  3. Call-to-Action (CTA) & Scheduling
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Action Button Text
                    </label>
                    <Input
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="e.g. Register for Drive"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Action Target URL
                    </label>
                    <Input
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="e.g. /student/jobs or external link"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Hard Expiration Date (Optional)
                    </label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      Announcement will automatically stop showing after this date.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Banner / Image URL (Optional)
                    </label>
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Launching Campaign...' : 'Broadcast In-App Announcement'}
                </Button>
              </div>
            </Card>
          </form>

          {/* Real-time Preview Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-20">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Real-time Recipient Preview ({format})</span>
                </h3>
                <span className="text-[10px] font-semibold text-neutral-400">
                  Target: {targetRole}
                </span>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-4 shadow-sm space-y-4">
                {/* Banner Preview */}
                {format === 'banner' && (
                  <div className="rounded-xl bg-neutral-900 text-white p-3 shadow-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
                          {type}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Preview</span>
                    </div>
                    <p className="text-xs font-bold">{title || 'Campaign Title Goes Here'}</p>
                    <p className="text-[11px] text-neutral-300 line-clamp-2">
                      {message || 'Announcement message preview will appear here...'}
                    </p>
                    {actionText && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-white text-neutral-900">
                          {actionText} <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Preview */}
                {format === 'modal' && (
                  <div className="rounded-xl bg-white border border-neutral-200 p-4 shadow-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold uppercase text-neutral-400">
                          Center Screen Modal
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900">
                          {title || 'High-Priority Modal Title'}
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 whitespace-pre-line">
                      {message || 'Critical message content to be acknowledged by the user...'}
                    </p>
                    <div className="pt-2 flex justify-end gap-2">
                      <span className="px-2.5 py-1 text-xs text-neutral-500">Dismiss</span>
                      <span className="px-3 py-1 rounded text-xs font-semibold bg-neutral-900 text-white">
                        {actionText || 'Take Action'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Toast Preview */}
                {format === 'toast' && (
                  <div className="rounded-xl bg-white border border-neutral-200 p-3 shadow-md space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[9px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          Toast Alert
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Just now</span>
                    </div>
                    <h5 className="text-xs font-bold text-neutral-900">
                      {title || 'Real-Time Toast Alert'}
                    </h5>
                    <p className="text-[11px] text-neutral-600">
                      {message || 'Quick corner popup alert description...'}
                    </p>
                  </div>
                )}

                {/* Slideout Preview */}
                {format === 'slideout' && (
                  <div className="rounded-xl bg-white border border-neutral-200 p-4 shadow-md space-y-2 border-l-4 border-l-neutral-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                        Feature Spotlight
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-neutral-900">{title || 'Spotlight Title'}</h5>
                    <p className="text-[11px] text-neutral-600">{message || 'Spotlight details...'}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900">
                      {actionText || 'Try Feature'} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                )}

                {/* Inbox List Preview */}
                {format === 'inbox' && (
                  <div className="rounded-xl bg-white border border-neutral-200 p-3 shadow-xs space-y-1">
                    <span className="text-[9px] font-bold uppercase text-neutral-500">Inbox Alert</span>
                    <h5 className="text-xs font-bold text-neutral-900">{title || 'Inbox Notification'}</h5>
                    <p className="text-[11px] text-neutral-600">{message || 'Standard message...'}</p>
                  </div>
                )}

                {/* Meta summary */}
                <div className="text-[11px] text-neutral-500 space-y-1 pt-2 border-t border-neutral-200">
                  <div className="flex justify-between">
                    <span>Priority:</span>
                    <span className="font-semibold capitalize text-neutral-800">{priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Segment:</span>
                    <span className="font-semibold text-neutral-800 truncate max-w-[150px]">
                      {targetSegment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Channel:</span>
                    <span className="font-semibold text-neutral-800">WebSocket & Firestore</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ANALYTICS & CONVERSION TRACKING DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1 border-neutral-200">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Campaigns</span>
                <Megaphone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {analytics?.summary?.totalCampaigns || 0}
              </div>
              <p className="text-[11px] text-neutral-400">Broadcasted across all roles</p>
            </Card>

            <Card className="p-4 space-y-1 border-neutral-200">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Impressions</span>
                <Eye className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {analytics?.summary?.totalImpressions || 0}
              </div>
              <p className="text-[11px] text-neutral-400">In-app views & banner displays</p>
            </Card>

            <Card className="p-4 space-y-1 border-neutral-200">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">CTA Clicks</span>
                <MousePointerClick className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {analytics?.summary?.totalClicks || 0}
              </div>
              <p className="text-[11px] text-neutral-400">User interactions & redirects</p>
            </Card>

            <Card className="p-4 space-y-1 border-neutral-200 bg-neutral-900 text-white">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Average CTR</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {analytics?.summary?.averageCtr || 0}%
              </div>
              <p className="text-[11px] text-neutral-400">Click-Through Rate conversion</p>
            </Card>
          </div>

          {/* Campaign Table */}
          <Card className="p-5 space-y-4 border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Campaign Performance Breakdown</h3>
                <p className="text-xs text-neutral-500">
                  Track individual impressions, engagement clicks, and conversion rates.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAnalytics}
                disabled={loadingAnalytics}
                className="text-xs"
              >
                Refresh Data
              </Button>
            </div>

            {loadingAnalytics ? (
              <p className="text-xs text-neutral-400 py-8 text-center">Loading campaign metrics...</p>
            ) : !analytics?.campaigns || analytics.campaigns.length === 0 ? (
              <p className="text-xs text-neutral-500 py-8 text-center">
                No notification campaigns recorded yet. Launch your first announcement above!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Campaign Title</th>
                      <th className="py-2.5 px-3">Format</th>
                      <th className="py-2.5 px-3">Audience</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Impressions</th>
                      <th className="py-2.5 px-3">Clicks</th>
                      <th className="py-2.5 px-3">CTR %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {analytics.campaigns.map((c: any) => (
                      <tr key={c._id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-neutral-900 truncate max-w-xs">{c.title}</div>
                          <div className="text-[11px] text-neutral-400 truncate max-w-xs">{c.message}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {c.format}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-neutral-700 capitalize">{c.targetAudience}</span>
                          {c.targetSegment && (
                            <span className="text-[10px] text-neutral-400 block truncate max-w-[120px]">
                              {c.targetSegment}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-800">{c.impressions}</td>
                        <td className="py-3 px-3 font-semibold text-neutral-800">{c.clicks}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-bold text-neutral-900">
                            {c.ctr}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
};
