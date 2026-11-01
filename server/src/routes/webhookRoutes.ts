import { Router } from 'express';
import { handleEmployerAtsWebhook } from '../controllers/webhookController.js';

const router = Router();

// Inbound authenticated employer/ATS webhook
router.post('/employer-ats', handleEmployerAtsWebhook);

export default router;
