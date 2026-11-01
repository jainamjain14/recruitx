import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getEmailStatus,
  sendContactEmailOtp,
  verifyContactEmailOtp,
  getGoogleConnectUrl,
  handleGoogleCallback,
  getMicrosoftConnectUrl,
  handleMicrosoftCallback,
  disconnectEmailAccount,
  sendTestApplicationEmail,
  connectSandboxTestAccount,
} from '../controllers/candidateEmailController.js';

const router = Router();

// Candidate email management & status
router.get('/status', authenticate, getEmailStatus);

// Contact email OTP verification
router.post('/send-contact-otp', authenticate, sendContactEmailOtp);
router.post('/verify-contact-otp', authenticate, verifyContactEmailOtp);

// Google OAuth connect & callback
router.get('/google/connect-url', authenticate, getGoogleConnectUrl);
router.get('/google/callback', handleGoogleCallback);
router.post('/google/callback', handleGoogleCallback);
router.get('/connect/google/callback', handleGoogleCallback);
router.post('/connect/google/callback', handleGoogleCallback);

// Microsoft OAuth connect & callback
router.get('/microsoft/connect-url', authenticate, getMicrosoftConnectUrl);
router.get('/microsoft/callback', handleMicrosoftCallback);
router.post('/microsoft/callback', handleMicrosoftCallback);
router.get('/connect/microsoft/callback', handleMicrosoftCallback);
router.post('/connect/microsoft/callback', handleMicrosoftCallback);

// Disconnect / Revoke
router.post('/disconnect', authenticate, disconnectEmailAccount);

// Direct Test Dispatch
router.post('/send-test', authenticate, sendTestApplicationEmail);

// Development Sandbox Simulation
router.post('/connect-sandbox', authenticate, connectSandboxTestAccount);

export default router;
