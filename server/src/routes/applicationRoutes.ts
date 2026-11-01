import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  applyForJob,
  applyDirectCompanyJob,
  confirmManualSubmission,
  getApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';

const router = Router();
router.use(authenticate);

// Student only: apply for job opportunities
router.post('/', authorize('student'), applyForJob);
router.post('/apply-direct', authorize('student'), applyDirectCompanyJob);
router.post('/direct-company', authorize('student'), applyDirectCompanyJob);
router.patch('/:id/confirm-manual', authorize('student'), confirmManualSubmission);

// Recruiter & Admin only: review and transition application stage
router.patch('/:id/status', authorize('recruiter', 'admin'), updateApplicationStatus);

// Shared authenticated application retrieval (scoped per role)
router.get('/', getApplications);

export default router;
