import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateCreateJob } from '../middleware/validateMiddleware.js';
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getCompanyJobMatches,
  getCandidates,
} from '../controllers/jobController.js';

const router = Router();
router.use(authenticate);

// Recruiter & Admin job management
router.post('/', authorize('recruiter', 'admin'), validateCreateJob, createJob);
router.put('/:id', authorize('recruiter', 'admin'), updateJob);
router.delete('/:id', authorize('recruiter', 'admin'), deleteJob);
router.get('/candidates', authorize('recruiter', 'admin'), getCandidates);

// Candidate & Admin job search and proximity matching
router.get('/company-matches', authorize('student', 'admin'), getCompanyJobMatches);

// Shared authenticated job listings
router.get('/', getJobs);
router.get('/:id', getJobById);

export default router;
