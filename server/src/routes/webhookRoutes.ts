import { Router } from 'express';
import { handleEmployerAtsWebhook, handleBrevoWebhook } from '../controllers/webhookController.js';

const router = Router();

// Inbound authenticated employer/ATS webhook
router.post('/employer-ats', handleEmployerAtsWebhook);

export default router;


// Inbound Brevo transactional email event webhook
router.post('/brevo', handleBrevoWebhook);
