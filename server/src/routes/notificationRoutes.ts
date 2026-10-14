import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getActiveAnnouncements,
  broadcastNotification,
  trackImpression,
  trackClick,
  getAnnouncementAnalytics,
} from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate);

// User notification routes
router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.delete('/clear-all', clearAllNotifications);
router.get('/active-announcements', getActiveAnnouncements);
router.post('/track/impression', trackImpression);
router.post('/track/click', trackClick);
router.post('/:id/impression', trackImpression);
router.post('/:id/click', trackClick);

// Individual notification item routes
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Admin campaign management routes (restricted to role=admin)
router.post('/broadcast', authorize('admin'), broadcastNotification);
router.get('/analytics', authorize('admin'), getAnnouncementAnalytics);

export default router;
