import { api } from './api';
import {
  NotificationItem,
  Announcement,
  CampaignAnalytics,
  NotificationType,
  NotificationFormat,
  NotificationPriority,
  TargetAudience,
} from '../types/notification';

export interface BroadcastPayload {
  title: string;
  message: string;
  targetRole: TargetAudience;
  targetSegment?: string;
  type: NotificationType;
  format: NotificationFormat;
  priority: NotificationPriority;
  actionText?: string;
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: string | null;
}

export const notificationService = {
  // Fetch user notification inbox + unread count
  getNotifications: async (): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
    const res = await api.get('/notifications');
    return res.data?.data || { notifications: [], unreadCount: 0 };
  },

  // Mark single notification as read
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  // Mark all notifications for user as read
  markAllAsRead: async (): Promise<number> => {
    const res = await api.patch('/notifications/read-all');
    return res.data?.data?.count || 0;
  },

  // Delete single notification
  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  // Clear all notifications
  clearAll: async (): Promise<number> => {
    const res = await api.delete('/notifications/clear-all');
    return res.data?.data?.count || 0;
  },

  // Fetch active announcements (Banners, Modals, Slideouts)
  getActiveAnnouncements: async (): Promise<Announcement[]> => {
    const res = await api.get('/notifications/active-announcements');
    return res.data?.data?.announcements || [];
  },

  // Record impression for analytics
  trackImpression: async (announcementId: string): Promise<void> => {
    if (!announcementId) return;
    try {
      await api.post('/notifications/track/impression', { announcementId });
    } catch {}
  },

  // Record click for analytics
  trackClick: async (announcementId: string): Promise<void> => {
    if (!announcementId) return;
    try {
      await api.post('/notifications/track/click', { announcementId });
    } catch {}
  },

  // Broadcast announcement campaign (Admin only)
  broadcastNotification: async (payload: BroadcastPayload): Promise<any> => {
    const res = await api.post('/notifications/broadcast', payload);
    return res.data;
  },

  // Get campaign analytics (Admin only)
  getAnalytics: async (): Promise<CampaignAnalytics> => {
    const res = await api.get('/notifications/analytics');
    return (
      res.data?.data || {
        summary: { totalCampaigns: 0, totalImpressions: 0, totalClicks: 0, averageCtr: 0 },
        campaigns: [],
      }
    );
  },
};
