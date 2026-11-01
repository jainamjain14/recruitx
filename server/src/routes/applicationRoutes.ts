import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  applyForJob,
  applyDirectCompanyJob,
  confirmManualSubmission,
  linkEmployerReceipt,
  acknowledgeEmployerReceipt,
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
router.post('/:id/link-employer-receipt', authorize('student'), linkEmployerReceipt);
router.patch('/:id/link-employer-receipt', authorize('student'), linkEmployerReceipt);

// Recruiter & Admin only: review and transition application stage
router.patch('/:id/status', authorize('recruiter', 'admin'), updateApplicationStatus);
router.post('/:id/acknowledge-receipt', authorize('recruiter', 'admin'), acknowledgeEmployerReceipt);

// Shared authenticated application retrieval (scoped per role)
router.get('/', getApplications);

export default router;
