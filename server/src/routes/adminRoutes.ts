import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { getAdminStats, getUsers, toggleUserStatus } from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

export default router;
