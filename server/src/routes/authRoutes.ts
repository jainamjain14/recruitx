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

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/logout', logout);

export default router;
