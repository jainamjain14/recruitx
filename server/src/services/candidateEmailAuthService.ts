import crypto from 'crypto';
import { User, IUserDocument, ConnectedEmailAccount } from '../models/User.js';
import { encryptToken, decryptToken } from '../utils/tokenEncryption.js';

export interface OAuthConnectionStatus {
  isConfigured: boolean;
  missingConfig?: string[];
  connectedAccounts: Array<{
    provider: 'gmail' | 'outlook' | 'smtp';
    email: string;
    name?: string;
    scopes: string[];
    connectedAt: Date;
    status: 'active' | 'expired' | 'revoked' | 'error';
    lastError?: string;
  }>;
  authorizedSendingEmail?: string;
  authorizedSendingProvider?: 'gmail' | 'outlook' | 'smtp';
  isEmailSendingAuthorized: boolean;
}

export class CandidateEmailAuthService {
  /**
   * Diagnostic check for OAuth provider credentials
   */
  static getProviderConfigStatus(): {
    google: { isConfigured: boolean; missing: string[] };
    microsoft: { isConfigured: boolean; missing: string[] };
  } {
    const googleMissing: string[] = [];
    if (!process.env.GOOGLE_CLIENT_ID) googleMissing.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) googleMissing.push('GOOGLE_CLIENT_SECRET');

    const msMissing: string[] = [];
    if (!process.env.MICROSOFT_CLIENT_ID) msMissing.push('MICROSOFT_CLIENT_ID');
    if (!process.env.MICROSOFT_CLIENT_SECRET) msMissing.push('MICROSOFT_CLIENT_SECRET');

    return {
      google: {
        isConfigured: googleMissing.length === 0,
        missing: googleMissing,
      },
      microsoft: {
        isConfigured: msMissing.length === 0,
        missing: msMissing,
      },
    };
  }

  /**
   * Generates Google OAuth authorization URL for candidate email sending
   */
  static getGoogleAuthUrl(userId: string, hostUrl?: string): { url: string; state: string } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.trim().length === 0) {
      throw new Error('Google Gmail OAuth is not configured on this server. GOOGLE_CLIENT_ID is missing from server environment variables.');
    }
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${hostUrl || process.env.SERVER_URL || 'https://recruitx-api-7cn6.onrender.com'}/api/candidate-email/connect/google/callback`;

    // Secure state token containing userId, timestamp and HMAC signature
    const statePayload = JSON.stringify({ userId, ts: Date.now() });
    const secret = process.env.JWT_SECRET || 'recruitx_oauth_state_secret';
    const sig = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');
    const state = Buffer.from(`${statePayload}::${sig}`).toString('base64url');

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ].join(' ');

    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    return { url, state };
  }

  /**
   * Generates Microsoft OAuth authorization URL for candidate email sending
   */
  static getMicrosoftAuthUrl(userId: string, hostUrl?: string): { url: string; state: string } {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId || clientId.trim().length === 0) {
      throw new Error('Microsoft Outlook OAuth is not configured on this server. MICROSOFT_CLIENT_ID is missing from server environment variables.');
    }
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${hostUrl || process.env.SERVER_URL || 'https://recruitx-api-7cn6.onrender.com'}/api/candidate-email/connect/microsoft/callback`;

    const statePayload = JSON.stringify({ userId, ts: Date.now() });
    const secret = process.env.JWT_SECRET || 'recruitx_oauth_state_secret';
    const sig = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');
    const state = Buffer.from(`${statePayload}::${sig}`).toString('base64url');

    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Mail.Send',
      'Mail.Read',
    ].join(' ');

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    return { url, state };
  }

  /**
   * Verifies state payload and returns userId
   */
  static verifyOAuthState(state: string): string {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      const [statePayload, sig] = decoded.split('::');
      const secret = process.env.JWT_SECRET || 'recruitx_oauth_state_secret';
      const expectedSig = crypto.createHmac('sha256', secret).update(statePayload).digest('hex');

      if (sig !== expectedSig) {
        throw new Error('OAuth state verification failed: Invalid signature');
      }

      const parsed = JSON.parse(statePayload);
      if (Date.now() - parsed.ts > 10 * 60 * 1000) {
        throw new Error('OAuth state has expired (10 min timeout)');
      }

      return parsed.userId;
    } catch (err: any) {
      throw new Error(`Invalid OAuth state: ${err.message}`);
    }
  }

  /**
   * Exchanges Google authorization code for tokens and registers connected email
   */
  static async handleGoogleCallback(options: {
    code: string;
    userId: string;
    hostUrl?: string;
  }): Promise<{ success: boolean; email: string; name?: string }> {
    const { code, userId, hostUrl } = options;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${hostUrl || process.env.SERVER_URL || 'https://recruitx-api-7cn6.onrender.com'}/api/candidate-email/connect/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Server is missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.');
    }

    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google OAuth code for tokens');
    }

    // 2. Fetch candidate profile info from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData: any = await profileRes.json();
    const candidateEmail = (profileData.email || '').toLowerCase().trim();

    if (!candidateEmail) {
      throw new Error('Google OAuth succeeded, but no email address was returned.');
    }

    // 3. Encrypt tokens with AES-256-GCM
    const accessTokenEncrypted = encryptToken(tokenData.access_token);
    const refreshTokenEncrypted = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined;
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // 4. Save to User document
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Candidate user account not found');
    }

    const existingAccounts = user.connectedEmailAccounts || [];
    const filteredAccounts = existingAccounts.filter((acc) => !(acc.provider === 'gmail' && acc.email === candidateEmail));

    const newAccount: ConnectedEmailAccount = {
      provider: 'gmail',
      email: candidateEmail,
      name: profileData.name || user.name,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      scopes: (tokenData.scope || '').split(' '),
      connectedAt: new Date(),
      status: 'active',
    };

    filteredAccounts.push(newAccount);

    user.connectedEmailAccounts = filteredAccounts;
    user.authorizedSendingEmail = candidateEmail;
    user.authorizedSendingProvider = 'gmail';
    user.isEmailSendingAuthorized = true;

    await user.save();

    console.log(`[CandidateEmailAuthService] ✨ Candidate ${user.name} (${user.email}) successfully authorized Gmail account: ${candidateEmail}`);
    return { success: true, email: candidateEmail, name: profileData.name };
  }

  /**
   * Exchanges Microsoft authorization code for tokens and registers connected email
   */
  static async handleMicrosoftCallback(options: {
    code: string;
    userId: string;
    hostUrl?: string;
  }): Promise<{ success: boolean; email: string; name?: string }> {
    const { code, userId, hostUrl } = options;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${hostUrl || process.env.SERVER_URL || 'https://recruitx-api-7cn6.onrender.com'}/api/candidate-email/connect/microsoft/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Server is missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET in environment variables.');
    }

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Microsoft OAuth code for tokens');
    }

    // Fetch user profile from Microsoft Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData: any = await profileRes.json();
    const candidateEmail = (profileData.mail || profileData.userPrincipalName || '').toLowerCase().trim();

    if (!candidateEmail) {
      throw new Error('Microsoft OAuth succeeded, but no email address was returned.');
    }

    const accessTokenEncrypted = encryptToken(tokenData.access_token);
    const refreshTokenEncrypted = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined;
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Candidate user account not found');
    }

    const existingAccounts = user.connectedEmailAccounts || [];
    const filteredAccounts = existingAccounts.filter((acc) => !(acc.provider === 'outlook' && acc.email === candidateEmail));

    const newAccount: ConnectedEmailAccount = {
      provider: 'outlook',
      email: candidateEmail,
      name: profileData.displayName || user.name,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt,
      scopes: (tokenData.scope || '').split(' '),
      connectedAt: new Date(),
      status: 'active',
    };

    filteredAccounts.push(newAccount);

    user.connectedEmailAccounts = filteredAccounts;
    user.authorizedSendingEmail = candidateEmail;
    user.authorizedSendingProvider = 'outlook';
    user.isEmailSendingAuthorized = true;

    await user.save();

    console.log(`[CandidateEmailAuthService] ✨ Candidate ${user.name} (${user.email}) successfully authorized Outlook account: ${candidateEmail}`);
    return { success: true, email: candidateEmail, name: profileData.displayName };
  }

  /**
   * Retrieves an authentic, decrypted access token for sending, refreshing if needed
   */
  static async getValidAccessToken(
    user: IUserDocument,
    preferredProvider?: 'gmail' | 'outlook'
  ): Promise<{
    accessToken: string;
    provider: 'gmail' | 'outlook';
    email: string;
    name?: string;
  } | null> {
    const accounts = user.connectedEmailAccounts || [];
    if (accounts.length === 0) return null;

    let targetAccount = preferredProvider
      ? accounts.find((a) => a.provider === preferredProvider && a.status === 'active')
      : accounts.find((a) => a.email === user.authorizedSendingEmail && a.status === 'active');

    if (!targetAccount) {
      targetAccount = accounts.find((a) => a.status === 'active');
    }

    if (!targetAccount) return null;

    const now = new Date();
    const expiresAt = targetAccount.tokenExpiresAt ? new Date(targetAccount.tokenExpiresAt) : new Date(0);

    // If token is still valid with 2-minute safety margin
    if (expiresAt.getTime() > now.getTime() + 2 * 60 * 1000) {
      const decrypted = decryptToken(targetAccount.accessTokenEncrypted);
      if (decrypted.startsWith('test_access_token_')) {
        console.warn(`[CandidateEmailAuthService] Excluding test sandbox token for ${targetAccount.email}`);
        return null;
      }
      return {
        accessToken: decrypted,
        provider: targetAccount.provider as 'gmail' | 'outlook',
        email: targetAccount.email,
        name: targetAccount.name,
      };
    }

    // Token is expired: attempt refresh
    if (!targetAccount.refreshTokenEncrypted) {
      console.warn(`[CandidateEmailAuthService] Token for ${targetAccount.email} expired and no refresh token available`);
      targetAccount.status = 'expired';
      await user.save();
      return null;
    }

    try {
      const refreshToken = decryptToken(targetAccount.refreshTokenEncrypted);

      if (targetAccount.provider === 'gmail') {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData: any = await refreshRes.json();
        if (refreshRes.ok && refreshData.access_token) {
          targetAccount.accessTokenEncrypted = encryptToken(refreshData.access_token);
          targetAccount.tokenExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);
          targetAccount.status = 'active';
          await user.save();
          return {
            accessToken: refreshData.access_token,
            provider: 'gmail',
            email: targetAccount.email,
            name: targetAccount.name,
          };
        }
      } else if (targetAccount.provider === 'outlook') {
        const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID || '',
            client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData: any = await refreshRes.json();
        if (refreshRes.ok && refreshData.access_token) {
          targetAccount.accessTokenEncrypted = encryptToken(refreshData.access_token);
          if (refreshData.refresh_token) {
            targetAccount.refreshTokenEncrypted = encryptToken(refreshData.refresh_token);
          }
          targetAccount.tokenExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);
          targetAccount.status = 'active';
          await user.save();
          return {
            accessToken: refreshData.access_token,
            provider: 'outlook',
            email: targetAccount.email,
            name: targetAccount.name,
          };
        }
      }
    } catch (err: any) {
      console.error(`[CandidateEmailAuthService] Failed to refresh token for ${targetAccount.email}:`, err.message);
      targetAccount.status = 'expired';
      targetAccount.lastError = err.message;
      await user.save();
      return null;
    }

    return null;
  }

  /**
   * Registers a verified sandbox or test email account for testing and development
   */
  static async connectTestSendingAccount(options: {
    userId: string;
    provider: 'gmail' | 'outlook' | 'smtp';
    email: string;
    name?: string;
  }): Promise<boolean> {
    const { userId, provider, email, name } = options;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const cleanEmail = email.toLowerCase().trim();
    const existing = (user.connectedEmailAccounts || []).filter((a) => a.email !== cleanEmail);

    const testAccount: ConnectedEmailAccount = {
      provider,
      email: cleanEmail,
      name: name || user.name,
      accessTokenEncrypted: encryptToken('test_access_token_' + Date.now()),
      refreshTokenEncrypted: encryptToken('test_refresh_token_' + Date.now()),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scopes: ['https://www.googleapis.com/auth/gmail.send', 'Mail.Send'],
      connectedAt: new Date(),
      status: 'active',
    };

    existing.push(testAccount);
    user.connectedEmailAccounts = existing;
    user.authorizedSendingEmail = cleanEmail;
    user.authorizedSendingProvider = provider;
    user.isEmailSendingAuthorized = true;
    await user.save();
    return true;
  }

  /**
   * Revokes and disconnects an authorized email account
   */
  static async disconnectAccount(userId: string, targetIdentifier: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const clean = targetIdentifier.toLowerCase().trim();
    user.connectedEmailAccounts = (user.connectedEmailAccounts || []).filter(
      (a) => a.email.toLowerCase() !== clean && a.provider !== clean
    );

    if (user.authorizedSendingEmail?.toLowerCase() === clean || user.authorizedSendingProvider === clean) {
      const remainingActive = (user.connectedEmailAccounts || []).find((a) => a.status === 'active');
      if (remainingActive) {
        user.authorizedSendingEmail = remainingActive.email;
        user.authorizedSendingProvider = remainingActive.provider as any;
        user.isEmailSendingAuthorized = true;
      } else {
        user.authorizedSendingEmail = undefined;
        user.authorizedSendingProvider = undefined;
        user.isEmailSendingAuthorized = false;
      }
    }

    await user.save();
    return true;
  }
}

