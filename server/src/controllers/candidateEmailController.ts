import { decryptToken } from '../utils/tokenEncryption.js';
import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { EmailService } from '../services/emailService.js';
import { CandidateEmailAuthService } from '../services/candidateEmailAuthService.js';
import { CandidateApplicationEmailService } from '../services/candidateApplicationEmailService.js';

/**
 * Get current candidate email management & connected OAuth accounts status
 */
export const getEmailStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  const providerConfigs = CandidateEmailAuthService.getProviderConfigStatus();

  // Exclude test sandbox tokens so only genuine OAuth authorizations are shown
  const genuineAccounts = (user.connectedEmailAccounts || []).filter((acc) => {
    try {
      if (!acc.accessTokenEncrypted) return false;
      const decrypted = decryptToken(acc.accessTokenEncrypted);
      if (decrypted.startsWith('test_access_token_')) return false;
      return true;
    } catch {
      return false;
    }
  });

  const connectedAccounts = genuineAccounts.map((acc) => ({
    provider: acc.provider,
    email: acc.email,
    name: acc.name,
    scopes: acc.scopes,
    connectedAt: acc.connectedAt,
    status: acc.status,
    lastError: acc.lastError,
  }));

  const hasActiveGenuine = connectedAccounts.some((a) => a.status === 'active');
  const authorizedSendingEmail = hasActiveGenuine ? user.authorizedSendingEmail : undefined;
  const authorizedSendingProvider = hasActiveGenuine ? user.authorizedSendingProvider : undefined;
  const isEmailSendingAuthorized = hasActiveGenuine && Boolean(user.isEmailSendingAuthorized);

  sendSuccess(res, 'Email management status retrieved successfully', {
    primaryAccountEmail: user.email,
    contactEmail: user.contactEmail || (user.emailVerified ? user.email : undefined),
    contactEmailVerified: user.contactEmailVerified || user.emailVerified,
    connectedAccounts,
    authorizedSendingEmail,
    authorizedSendingProvider,
    isEmailSendingAuthorized,
    providerConfigs,
  });
});

/**
 * Sends a 6-digit verification code to candidate's contact email
 */
export const sendContactEmailOtp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    sendError(res, 'A valid email address is required.', null, 400);
    return;
  }

  const normalizedEmail = (email as string).toLowerCase().trim();
  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  const verificationCode = crypto.randomInt(100000, 1000000).toString();
  user.contactEmail = normalizedEmail;
  user.contactEmailVerified = false;
  user.contactEmailVerificationCode = verificationCode;
  user.contactEmailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await user.save();

  // Send OTP email
  const sendResult = await EmailService.sendVerificationEmail({
    toEmail: normalizedEmail,
    userName: user.name || 'Candidate',
    code: verificationCode,
  });

  if (!sendResult.success) {
    console.warn(`[CandidateEmail] Verification email failed: ${sendResult.error}`);
    // Return friendly message with code preview in dev/staging if Brevo key missing
    if (process.env.NODE_ENV !== 'production' || !process.env.BREVO_API_KEY) {
      sendSuccess(res, `Verification code generated: ${verificationCode} (Brevo API key not set; displaying for test)`, {
        codePreview: verificationCode,
      });
      return;
    }
    sendError(res, sendResult.error || 'Failed to dispatch verification email', null, 500);
    return;
  }

  sendSuccess(res, `6-digit verification code sent to ${normalizedEmail}. Code expires in 15 minutes.`);
});

/**
 * Verifies candidate's contact email using the 6-digit OTP
 */
export const verifyContactEmailOtp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const { email, code } = req.body;
  if (!email || !code) {
    sendError(res, 'Email and 6-digit verification code are required.', null, 400);
    return;
  }

  const normalizedEmail = (email as string).toLowerCase().trim();
  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  if (user.contactEmail?.toLowerCase() !== normalizedEmail) {
    sendError(res, 'Email mismatch. Please request a new verification code for this email.', null, 400);
    return;
  }

  if (!user.contactEmailVerificationCode || user.contactEmailVerificationCode.trim() !== String(code).trim()) {
    sendError(res, 'Invalid verification code. Please check your inbox and try again.', null, 400);
    return;
  }

  if (user.contactEmailVerificationExpires && new Date(user.contactEmailVerificationExpires) < new Date()) {
    sendError(res, 'Verification code has expired. Please request a fresh code.', null, 400);
    return;
  }

  user.contactEmailVerified = true;
  user.contactEmailVerificationCode = undefined;
  user.contactEmailVerificationExpires = undefined;

  await user.save();

  sendSuccess(res, 'Contact email verified successfully! Note: To allow RecruitX to send applications directly from your email address, connect your Gmail or Outlook account via OAuth below.', {
    contactEmail: user.contactEmail,
    contactEmailVerified: true,
  });
});

/**
 * Initiates Google OAuth redirect URL
 */
export const getGoogleConnectUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.trim().length === 0) {
    sendError(
      res,
      'Google Gmail OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment variables.',
      null,
      400
    );
    return;
  }

  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const { url } = CandidateEmailAuthService.getGoogleAuthUrl(req.user._id.toString(), hostUrl);
    sendSuccess(res, 'Google OAuth URL generated', { url });
  } catch (err: any) {
    sendError(res, err.message || 'Failed to generate Google OAuth URL', null, 400);
  }
});

/**
 * Handles Google OAuth redirect callback
 */
export const handleGoogleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'https://recruitx-eosin.vercel.app';

  if (error) {
    res.redirect(`${clientUrl}/student/settings?email_error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${clientUrl}/student/settings?email_error=missing_code_or_state`);
    return;
  }

  try {
    const userId = CandidateEmailAuthService.verifyOAuthState(String(state));
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    const result = await CandidateEmailAuthService.handleGoogleCallback({
      code: String(code),
      userId,
      hostUrl,
    });

    res.redirect(`${clientUrl}/student/settings?email_connected=gmail&email=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    console.error('[CandidateEmailController] Google callback failed:', err.message);
    res.redirect(`${clientUrl}/student/settings?email_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * Initiates Microsoft OAuth redirect URL
 */
export const getMicrosoftConnectUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId || clientId.trim().length === 0) {
    sendError(
      res,
      'Microsoft Outlook OAuth is not configured on this server. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in the server environment variables.',
      null,
      400
    );
    return;
  }

  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const { url } = CandidateEmailAuthService.getMicrosoftAuthUrl(req.user._id.toString(), hostUrl);
    sendSuccess(res, 'Microsoft OAuth URL generated', { url });
  } catch (err: any) {
    sendError(res, err.message || 'Failed to generate Microsoft OAuth URL', null, 400);
  }
});

/**
 * Handles Microsoft OAuth redirect callback
 */
export const handleMicrosoftCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = (req.query.code || req.body?.code) as string | undefined;
  const state = (req.query.state || req.body?.state) as string | undefined;
  const error = (req.query.error || req.body?.error) as string | undefined;
  const errorDesc = (req.query.error_description || req.body?.error_description || error) as string | undefined;
  const clientUrl = process.env.CLIENT_URL || 'https://recruitx-eosin.vercel.app';

  if (error || errorDesc) {
    res.redirect(`${clientUrl}/student/settings?email_error=${encodeURIComponent(String(errorDesc || error))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${clientUrl}/student/settings?email_error=missing_code_or_state`);
    return;
  }

  try {
    const userId = CandidateEmailAuthService.verifyOAuthState(String(state));
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    const result = await CandidateEmailAuthService.handleMicrosoftCallback({
      code: String(code),
      userId,
      hostUrl,
    });

    res.redirect(`${clientUrl}/student/settings?email_connected=outlook&email=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    console.error('[CandidateEmailController] Microsoft callback failed:', err.message);
    res.redirect(`${clientUrl}/student/settings?email_error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * Disconnects and revokes candidate's connected email account
 */
export const disconnectEmailAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const { email, provider } = req.body;
  const target = email || provider;
  if (!target) {
    sendError(res, 'Email address or provider to disconnect is required.', null, 400);
    return;
  }

  await CandidateEmailAuthService.disconnectAccount(req.user._id.toString(), target);
  sendSuccess(res, `Account (${target}) disconnected successfully. Sending permissions revoked.`);
});

/**
 * Sends a real test application email to candidate's own address to verify sending credentials
 */
export const sendTestApplicationEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    sendError(res, 'User not found', null, 404);
    return;
  }

  const { recipientEmail } = req.body;
  const targetRecipient = recipientEmail || user.contactEmail || user.email;

  const result = await CandidateApplicationEmailService.dispatchApplication({
    user,
    companyName: 'RecruitX Test Recruitment Suite',
    jobTitle: 'Software Systems Engineer (Test Run)',
    targetHrEmail: targetRecipient,
    coverLetter: `This is a genuine test application email dispatched from candidate ${user.name}'s authorized email account to verify end-to-end transmission.`,
  });

  if (result.status === 'failed') {
    sendError(res, result.message, result, 400);
    return;
  }

  sendSuccess(res, result.message, result);
});

/**
 * Connects a test sandbox email account for development/testing
 */
export const connectSandboxTestAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendError(res, 'Not authenticated', null, 401);
    return;
  }

  const { email, provider = 'gmail' } = req.body;
  const targetEmail = (email || req.user.email).toLowerCase().trim();

  await CandidateEmailAuthService.connectTestSendingAccount({
    userId: req.user._id.toString(),
    provider,
    email: targetEmail,
    name: req.user.name,
  });

  sendSuccess(res, `Sandbox ${provider.toUpperCase()} account (${targetEmail}) connected successfully for testing.`, {
    email: targetEmail,
    provider,
    isEmailSendingAuthorized: true,
  });
});

