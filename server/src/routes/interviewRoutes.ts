import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import {
  scheduleInterview,
  getInterviews,
  evaluateMockAnswer,
  generateQuestions,
} from '../controllers/interviewController.js';

const router = Router();
router.use(authenticate);

// Recruiter & Admin only: schedule interview rounds
router.post('/', authorize('recruiter', 'admin'), scheduleInterview);

// AI-powered mock evaluation & dynamic question synthesis (quota protected)
router.post('/evaluate-mock', aiLimiter, evaluateMockAnswer);
router.post('/generate-questions', aiLimiter, generateQuestions);

// Shared authenticated interview schedule viewing
router.get('/', getInterviews);

export default router;
