import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  getAdminStats,
  getUsers,
  toggleUserStatus,
  deleteUser,
  getEligibilityRules,
  updateEligibilityRules,
  bulkImportStudents,
  getAccreditationStats,
  getSystemHealth,
  getAuditLogs,
} from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/delete', deleteUser);
router.get('/health', getSystemHealth);
router.get('/audit-logs', getAuditLogs);
router.get('/eligibility-rules', getEligibilityRules);
router.put('/eligibility-rules', updateEligibilityRules);
router.post('/students/import', bulkImportStudents);
router.get('/accreditation-stats', getAccreditationStats);

export default router;

