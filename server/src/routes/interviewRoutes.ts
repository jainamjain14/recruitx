import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { scheduleInterview, getInterviews, evaluateMockAnswer } from '../controllers/interviewController.js';

const router = Router();
router.use(authenticate);

router.post('/', scheduleInterview);
router.get('/', getInterviews);
router.post('/evaluate-mock', evaluateMockAnswer);

export default router;
