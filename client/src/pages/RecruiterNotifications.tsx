import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { NotificationType, NotificationItem } from '../types/notification';
import { Card } from '../components/ui/Card';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Briefcase,
  Video,
  Users,
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

export const RecruiterNotifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    handleClickAction,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'applications' | 'interviews'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.read) return false;
    if (activeTab === 'applications' && n.type !== 'application_update') return false;
    if (activeTab === 'interviews' && n.type !== 'interview_invite') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900">Recruiter Notification Hub</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time alerts for candidate job applications, interview responses, and campus placement updates.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {(
            [
              { key: 'all', label: 'All Alerts' },
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'applications', label: 'Candidate Applications' },
              { key: 'interviews', label: 'Interviews' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate alerts..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <Card className="p-12 text-center text-xs text-neutral-400">
          Loading alerts...
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-neutral-700">No recruiter notifications found</p>
          <p className="text-[11px] text-neutral-400">
            When candidates apply to your job postings or schedule interviews, alerts will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item: NotificationItem) => (
            <Card
              key={item._id}
              className={`p-4 transition-all duration-150 border ${
                item.read
                  ? 'bg-white border-neutral-200/90 hover:border-neutral-300'
                  : 'bg-neutral-50/90 border-neutral-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200/80 shrink-0 mt-0.5">
                    {item.type === 'interview_invite' ? (
                      <Video className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Users className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-[10px] text-neutral-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 mt-1">{item.title}</h3>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>

                    {/* CTA Link */}
                    {(item.actionText || item.actionUrl || item.link) && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            if (!item.read) markAsRead(item._id);
                            handleClickAction(item.actionUrl || item.link, item.announcementId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-xs"
                        >
                          <span>{item.actionText || 'Review Candidates'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!item.read && (
                    <button
                      onClick={() => markAsRead(item._id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                      title="Mark read"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Mark read</span>
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(item._id)}
                    className="text-neutral-300 hover:text-rose-600 p-1.5 rounded hover:bg-neutral-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
