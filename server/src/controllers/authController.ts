import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthService } from '../services/authService.js';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const result = await AuthService.registerUser({
      name,
      email,
      password,
      role,
    });

    // Set cookie only if token is issued (not in pending verification)
    if (result.token) {
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    sendSuccess(
      res,
      result.requiresVerification
        ? 'Account created! Please enter the 6-digit confirmation code sent to your email.'
        : 'Registration successful',
      {
        user: result.user,
        token: result.token,
        requiresVerification: result.requiresVerification,
      },
      201
    );
  } catch (error: any) {
    sendError(res, error.message || 'Registration failed', null, 400);
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role, rememberMe } = req.body;

  try {
    const { user, token } = await AuthService.loginUser({
      email,
      password,
      role,
      rememberMe: Boolean(rememberMe),
    });

    const maxAge = rememberMe
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    sendSuccess(res, 'Login successful', { user, token });
  } catch (error: any) {
    if (error.requiresVerification) {
      return res.status(403).json({
        success: false,
        message: error.message,
        requiresVerification: true,
        email: error.email,
        role: error.role,
      });
    }
    sendError(res, error.message || 'Authentication failed', null, 401);
  }
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }
  sendSuccess(res, 'Current user profile fetched successfully', { user: req.user });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const { resetToken } = await AuthService.forgotPassword(email);

    sendSuccess(res, 'Password reset token generated successfully.', {
      resetToken,
      resetUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Error requesting password reset', null, 400);
  }
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  try {
    await AuthService.resetPassword(token, password);
    sendSuccess(res, 'Password has been reset successfully. You can now login with your new password.');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to reset password', null, 400);
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  sendSuccess(res, 'Logged out successfully');
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  const {
    name,
    phone,
    company,
    website,
    location,
    description,
    title,
    profession,
    github,
    linkedin,
    portfolio,
    experienceLevel,
    companySize,
    industry,
    onboardingCompleted,
  } = req.body;

  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (company !== undefined) user.company = company.trim();
  if (website !== undefined) user.website = website.trim();
  if (location !== undefined) user.location = location.trim();
  if (description !== undefined) user.description = description.trim();
  if (title !== undefined) user.title = title.trim();
  if (profession !== undefined) user.profession = profession.trim();
  if (github !== undefined) user.github = github.trim();
  if (linkedin !== undefined) user.linkedin = linkedin.trim();
  if (portfolio !== undefined) user.portfolio = portfolio.trim();
  if (experienceLevel !== undefined) user.experienceLevel = experienceLevel.trim();
  if (companySize !== undefined) user.companySize = companySize.trim();
  if (industry !== undefined) user.industry = industry.trim();
  if (onboardingCompleted !== undefined) user.onboardingCompleted = Boolean(onboardingCompleted);

  await user.save();
  sendSuccess(res, 'Profile updated successfully', { user });
});

export const updatePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    sendError(res, 'Both current and new passwords are required', null, 400);
    return;
  }

  if (newPassword.length < 6) {
    sendError(res, 'New password must be at least 6 characters', null, 400);
    return;
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    sendError(res, 'Current password is incorrect', null, 400);
    return;
  }

  user.setPassword(newPassword);
  await user.save();
  sendSuccess(res, 'Password changed successfully');
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    sendError(res, 'Email and 6-digit verification code are required.', null, 400);
    return;
  }

  try {
    const { user, token } = await AuthService.verifyEmail(email, code);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, 'Email verified successfully! Welcome to RecruitX.', { user, token });
  } catch (error: any) {
    sendError(res, error.message || 'Email verification failed', null, 400);
  }
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    sendError(res, 'Email is required to resend verification code.', null, 400);
    return;
  }

  try {
    const result = await AuthService.resendVerificationCode(email);
    sendSuccess(res, result.message);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to resend verification email', null, 400);
  }
});

export const socialLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, name, provider, providerId, role, avatar } = req.body;

  if (!email) {
    sendError(res, 'Email is required for social authentication.', null, 400);
    return;
  }

  try {
    const { user, token } = await AuthService.socialLogin({
      email,
      name,
      provider: provider || 'google',
      providerId,
      role: role || 'student',
      avatar,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, `Signed in successfully with ${provider || 'social account'}`, { user, token });
  } catch (error: any) {
    sendError(res, error.message || 'Social authentication failed', null, 400);
  }
});


