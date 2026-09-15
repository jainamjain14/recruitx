import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

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
    const notification = await Notification.findById(req.params.id);
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

export const broadcastNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      sendError(res, 'Only admins can broadcast notifications', null, 403);
      return;
    }

    const { title, message, targetRole } = req.body;
    const filter: any = {};
    if (targetRole && targetRole !== 'all') {
      filter.role = targetRole;
    }

    const users = await User.find(filter).select('_id');
    const docs = users.map((u) => ({
      recipient: u._id,
      title,
      message,
      type: 'system',
    }));

    await Notification.insertMany(docs);
    sendSuccess(res, `Notification broadcast to ${users.length} users`);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to broadcast notification', null, 500);
  }
};
