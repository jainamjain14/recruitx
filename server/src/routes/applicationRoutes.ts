import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { applyForJob, applyDirectCompanyJob, getApplications, updateApplicationStatus } from '../controllers/applicationController.js';

const router = Router();
router.use(authenticate);

router.post('/', applyForJob);
router.post('/apply-direct', applyDirectCompanyJob);
router.get('/', getApplications);
router.patch('/:id/status', updateApplicationStatus);

export default router;
