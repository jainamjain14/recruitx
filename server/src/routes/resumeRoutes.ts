import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import {
  getResume,
  updateResume,
  aiParseResume,
  getSkillGap,
  getCareerRoadmap,
} from '../controllers/resumeController.js';

const router = Router();
router.use(authenticate);

// Student only: profile modifications and AI parsing
router.put('/', authorize('student'), updateResume);
router.post('/ai-parse', authorize('student'), aiLimiter, aiParseResume);
router.get('/skill-gap', authorize('student'), getSkillGap);
router.get('/roadmap', authorize('student'), getCareerRoadmap);

// Shared authenticated resume access
router.get('/', getResume);

export default router;
