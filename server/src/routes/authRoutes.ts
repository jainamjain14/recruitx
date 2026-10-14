import { Router } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
  updateProfile,
  updatePassword,
} from '../controllers/authController.js';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/validateMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.post('/forgot-password', authLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, resetPassword);
router.post('/logout', logout);

export default router;
