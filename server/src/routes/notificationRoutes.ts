import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getNotifications, markAsRead, broadcastNotification } from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/broadcast', broadcastNotification);

export default router;
