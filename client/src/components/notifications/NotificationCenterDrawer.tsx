import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { NotificationType, NotificationItem } from '../../types/notification';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
  Briefcase,
  Video,
  Megaphone,
  Sparkles,
  AlertTriangle,
  Search,
  ChevronRight,
  Inbox,
} from 'lucide-react';

const formatRelativeTime = (dateStr: string) => {
  try {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recent';
  }
};

const getCategoryIcon = (type: NotificationType) => {
  switch (type) {
    case 'interview_invite':
      return <Video className="w-4 h-4 text-purple-600" />;
    case 'application_update':
      return <Briefcase className="w-4 h-4 text-blue-600" />;
    case 'placement_drive':
      return <Megaphone className="w-4 h-4 text-amber-600" />;
    case 'job_alert':
      return <Sparkles className="w-4 h-4 text-emerald-600" />;
    case 'maintenance':
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    default:
      return <Bell className="w-4 h-4 text-neutral-600" />;
  }
};

export const NotificationCenterDrawer: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isNotificationCenterOpen,
    closeNotificationCenter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    handleClickAction,
  } = useNotifications();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'applications' | 'interviews' | 'drives'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isNotificationCenterOpen) return null;

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    // Exclude campaign / placement drive announcements from recruiter interface
    if (user?.role === 'recruiter' && (n.type === 'placement_drive' || n.announcementId)) {
      return false;
    }
    // Tab filter
    if (activeTab === 'unread' && n.read) return false;
    if (activeTab === 'applications' && n.type !== 'application_update') return false;
    if (activeTab === 'interviews' && n.type !== 'interview_invite') return false;
    if (activeTab === 'drives' && n.type !== 'placement_drive') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const fullPagePath =
    user?.role === 'admin'
      ? '/admin/notifications'
      : user?.role === 'recruiter'
      ? '/recruiter/notifications'
      : '/student/notifications';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeNotificationCenter}
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="center-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-900 text-white shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="center-title" className="text-sm font-bold text-neutral-900">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">Real-time alerts & campus updates</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-200/60 transition-colors flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            <button
              onClick={closeNotificationCenter}
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-md hover:bg-neutral-200/60 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 space-y-2.5 bg-white">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
            {(
              [
                { key: 'all' as const, label: 'All' },
                { key: 'unread' as const, label: `Unread (${unreadCount})` },
                { key: 'applications' as const, label: 'Applications' },
                { key: 'interviews' as const, label: 'Interviews' },
                ...(user?.role !== 'recruiter' ? [{ key: 'drives' as const, label: 'Drives' }] : []),
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-neutral-700">No notifications found</p>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'No notifications matched your search query.'
                  : activeTab === 'unread'
                  ? 'You are all caught up! No unread notifications.'
                  : 'New campus updates, application statuses, and interview schedules will show up here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item: NotificationItem) => {
              return (
                <div
                  key={item._id}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-150 ${
                    item.read
                      ? 'bg-white border-neutral-200/80 hover:border-neutral-300'
                      : 'bg-neutral-50/90 border-neutral-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Icon */}
                    <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200/70 shrink-0 mt-0.5">
                      {getCategoryIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {item.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-neutral-900 mt-0.5 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-600 mt-1 leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>

                      {/* CTA Action link */}
                      {(item.actionText || item.actionUrl || item.link) && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!item.read) markAsRead(item._id);
                              handleClickAction(item.actionUrl || item.link, item.announcementId, item.metadata);
                              closeNotificationCenter();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 hover:text-neutral-600 underline underline-offset-2"
                          >
                            <span>{item.actionText || 'View Details'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Item Actions */}
                    <div className="flex flex-col items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!item.read && (
                        <button
                          onClick={() => markAsRead(item._id)}
                          className="text-neutral-400 hover:text-emerald-600 p-1 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(item._id)}
                        className="text-neutral-300 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-neutral-500 hover:text-rose-600 font-medium transition-colors"
            >
              Clear all
            </button>
          )}

          <button
            onClick={() => {
              closeNotificationCenter();
              navigate(fullPagePath);
            }}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-neutral-900 hover:text-neutral-600 transition-colors"
          >
            <span>View Full Center</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};
