import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getResume, updateResume, aiParseResume, getSkillGap } from '../controllers/resumeController.js';

const router = Router();
router.use(authenticate);

router.get('/', getResume);
router.put('/', updateResume);
router.post('/ai-parse', aiParseResume);
router.get('/skill-gap', getSkillGap);

export default router;
