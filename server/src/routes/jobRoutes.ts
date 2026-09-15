import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { createJob, getJobs, getJobById, updateJob, deleteJob, getCompanyJobMatches, getCandidates } from '../controllers/jobController.js';

const router = Router();
router.use(authenticate);

router.post('/', createJob);
router.get('/', getJobs);
router.get('/company-matches', getCompanyJobMatches);
router.get('/candidates', getCandidates);
router.get('/:id', getJobById);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
