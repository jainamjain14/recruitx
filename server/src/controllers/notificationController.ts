import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Notification } from '../models/Notification.js';
import { Announcement } from '../models/Announcement.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { emitToRole, broadcastEvent } from '../socket.js';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipient: req.user?._id }).sort({ createdAt: -1 });
    const unreadCount = notifications.filter((n) => !n.read).length;
    sendSuccess(res, 'Notifications retrieved', { notifications, unreadCount });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch notifications', null, 500);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await Notification.findById(id);
    if (!notification) {
      sendError(res, 'Notification not found', null, 404);
      return;
    }

    if (notification.recipient.toString() !== req.user?._id.toString()) {
      sendError(res, 'Not authorized', null, 403);
      return;
    }

    notification.read = true;
    await notification.save();
    sendSuccess(res, 'Notification marked as read', { notification });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update notification', null, 500);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.markAllAsRead(req.user?._id || '');
    sendSuccess(res, `Marked ${count} notifications as read`, { count });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to mark all as read', null, 500);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await Notification.findById(id);
    if (!notification) {
      sendError(res, 'Notification not found', null, 404);
      return;
    }

    if (notification.recipient.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      sendError(res, 'Not authorized', null, 403);
      return;
    }

    await notification.deleteOne();
    sendSuccess(res, 'Notification deleted successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete notification', null, 500);
  }
};

export const clearAllNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.clearAllForUser(req.user?._id || '');
    sendSuccess(res, `Cleared ${count} notifications`, { count });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to clear notifications', null, 500);
  }
};

export const getActiveAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Campaign announcements are excluded from recruiter interface
    if (req.user?.role === 'recruiter') {
      sendSuccess(res, 'Active announcements retrieved', { announcements: [] });
      return;
    }

    const userRole = req.user?.role || 'student';
    const announcements = await Announcement.find({
      status: 'active',
      targetAudience: userRole,
    });

    const now = new Date();
    // Filter out expired announcements and optionally mark them expired
    const activeList = [];
    for (const a of announcements) {
      if (a.expiresAt && new Date(a.expiresAt) <= now) {
        a.status = 'expired';
        await a.save().catch(() => {});
      } else {
        activeList.push(a);
      }
    }

    sendSuccess(res, 'Active announcements retrieved', { announcements: activeList });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch active announcements', null, 500);
  }
};

export const broadcastNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Only admins can broadcast notifications', null, 403);
      return;
    }

    const {
      title,
      message,
      targetRole = 'all',
      targetSegment = '',
      type = 'system',
      format = 'banner',
      priority = 'normal',
      actionText = '',
      actionUrl = '',
      imageUrl = '',
      expiresAt = null,
    } = req.body;

    if (!title || !message) {
      sendError(res, 'Title and message are required', null, 400);
      return;
    }

    // 1. Create central Announcement campaign document
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    const announcement = await Announcement.create({
      title,
      message,
      type,
      format,
      targetAudience: targetRole,
      targetSegment,
      priority,
      actionText,
      actionUrl,
      imageUrl,
      expiresAt: parsedExpiresAt,
      status: 'active',
      createdBy: req.user._id,
    });

    // 2. Query target users to populate their notification inboxes
    // Exclude recruiters from receiving campaign notifications
    const filter: any = { role: { $ne: 'recruiter' } };
    if (targetRole && targetRole !== 'all') {
      filter.role = targetRole;
    }

    const users = await User.find(filter).select('_id');
    if (users.length > 0) {
      const docs = users.map((u) => ({
        recipient: u._id,
        title,
        message,
        type,
        format,
        priority,
        link: actionUrl,
        actionText,
        actionUrl,
        imageUrl,
        announcementId: announcement._id,
        expiresAt: parsedExpiresAt || undefined,
      }));

      await Notification.insertMany(docs);
    }

    // 3. Emit real-time WebSocket event
    const eventPayload = {
      announcement,
      notification: {
        title,
        message,
        type,
        format,
        priority,
        actionText,
        actionUrl,
        imageUrl,
        announcementId: announcement._id,
        createdAt: new Date(),
      },
    };

    if (targetRole === 'all') {
      emitToRole('student', 'announcement:new', eventPayload);
    } else {
      if (targetRole !== 'recruiter') emitToRole(targetRole, 'announcement:new', eventPayload);
    }

    sendSuccess(res, `Notification campaign broadcasted to ${users.length} users successfully`, {
      announcement,
      targetedUsers: users.length,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to broadcast notification', null, 500);
  }
};

export const trackImpression = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id || req.body.announcementId;
    if (id) {
      await Announcement.incrementImpressions(id);
    }
    sendSuccess(res, 'Impression recorded');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record impression', null, 500);
  }
};

export const trackClick = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id || req.body.announcementId;
    if (id) {
      await Announcement.incrementClicks(id);
    }
    sendSuccess(res, 'Click recorded');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record click', null, 500);
  }
};

export const getAnnouncementAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Only admins can access analytics', null, 403);
      return;
    }

    const campaigns = await Announcement.find({});
    let totalImpressions = 0;
    let totalClicks = 0;

    const formattedCampaigns = campaigns.map((c: any) => {
      totalImpressions += c.impressions || 0;
      totalClicks += c.clicks || 0;
      const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0.0';

      return {
        _id: c._id,
        title: c.title,
        message: c.message,
        type: c.type,
        format: c.format,
        targetAudience: c.targetAudience,
        targetSegment: c.targetSegment,
        priority: c.priority,
        status: c.status,
        scheduledAt: c.scheduledAt,
        expiresAt: c.expiresAt,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        ctr: Number(ctr),
        actionText: c.actionText,
        actionUrl: c.actionUrl,
        createdAt: c.createdAt,
      };
    });

    const averageCtr =
      totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

    sendSuccess(res, 'Analytics retrieved', {
      summary: {
        totalCampaigns: campaigns.length,
        totalImpressions,
        totalClicks,
        averageCtr: Number(averageCtr),
      },
      campaigns: formattedCampaigns,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch analytics', null, 500);
  }
};
