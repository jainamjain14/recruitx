import { Router, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { AuthenticatedRequest } from '../types/index.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// Require authentication for all protected endpoints
router.use(authenticate);

// Protected endpoint accessible to any authenticated user
router.get('/demo', (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, 'Access granted to general protected endpoint', {
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// Student role only
router.get('/student-data', authorize('student'), (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, 'Access granted to Student protected resources', {
    message: 'Welcome to Student portal API',
    user: req.user,
  });
});

// Recruiter role only
router.get('/recruiter-data', authorize('recruiter'), (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, 'Access granted to Recruiter protected resources', {
    message: 'Welcome to Recruiter portal API',
    user: req.user,
  });
});

// Admin role only
router.get('/admin-data', authorize('admin'), (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, 'Access granted to Admin protected resources', {
    message: 'Welcome to Admin control panel API',
    user: req.user,
  });
});

export default router;
