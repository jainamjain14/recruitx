import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  getRecommendedCourses,
  verifyCourseCompletion,
  markAuditCompleted,
  unmarkCourseCompletion,
} from '../controllers/courseController.js';

const router = Router();
router.use(authenticate);

// Student only: Coursera course discovery & completion verification
router.get('/recommended', authorize('student'), getRecommendedCourses);
router.post('/verify', authorize('student'), verifyCourseCompletion);
router.post('/mark-audit', authorize('student'), markAuditCompleted);
router.post('/unmark', authorize('student'), unmarkCourseCompletion);

export default router;
