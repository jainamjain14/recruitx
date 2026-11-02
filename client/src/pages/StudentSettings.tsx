import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  Mail,
  Send,
  KeyRound,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface ConnectedAccount {
  provider: 'gmail' | 'outlook' | 'gateway';
  email: string;
  connectedAt?: string;
  scope?: string;
}

export const StudentSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [profession, setProfession] = useState((user as any)?.profession || '');
  const [title, setTitle] = useState((user as any)?.title || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [experienceLevel, setExperienceLevel] = useState((user as any)?.experienceLevel || 'Fresher / Entry-Level');
  const [github, setGithub] = useState((user as any)?.github || '');
  const [linkedin, setLinkedin] = useState((user as any)?.linkedin || '');
  const [portfolio, setPortfolio] = useState((user as any)?.portfolio || '');
  const [description, setDescription] = useState((user as any)?.description || '');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Management & Connected Accounts State
  const [contactEmailInput, setContactEmailInput] = useState((user as any)?.contactEmail || user?.email || '');
  const [contactEmailVerified, setContactEmailVerified] = useState(Boolean((user as any)?.contactEmailVerified));
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isEmailSendingAuthorized, setIsEmailSendingAuthorized] = useState(false);
  const [authorizedSendingEmail, setAuthorizedSendingEmail] = useState<string | null>(null);
  const [authorizedSendingProvider, setAuthorizedSendingProvider] = useState<'gmail' | 'outlook' | 'gateway' | null>(null);
  const [emailStatusLoading, setEmailStatusLoading] = useState(false);
  const [providerConfigs, setProviderConfigs] = useState<{
    google?: { isConfigured: boolean; missing: string[] };
    microsoft?: { isConfigured: boolean; missing: string[] };
  } | null>(null);

  const [testSending, setTestSending] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [bannerAlert, setBannerAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load email and OAuth status
  const fetchEmailStatus = async () => {
    setEmailStatusLoading(true);
    try {
      const res = await api.get('/candidate-email/status');
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (data.contactEmail) {
          setContactEmailInput(data.contactEmail);
        }
        setContactEmailVerified(Boolean(data.contactEmailVerified));
        setConnectedAccounts(data.connectedAccounts || []);
        setIsEmailSendingAuthorized(Boolean(data.isEmailSendingAuthorized));
        setAuthorizedSendingEmail(data.authorizedSendingEmail || null);
        setAuthorizedSendingProvider(data.authorizedSendingProvider || null);
        if (data.providerConfigs) {
          setProviderConfigs(data.providerConfigs);
        }
      }
    } catch (err: any) {
      console.warn('[StudentSettings] Could not load candidate email status:', err.message);
    } finally {
      setEmailStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailStatus();

    // Check query params for OAuth redirect outcomes
    const urlParams = new URLSearchParams(window.location.search);
    const emailConnected = urlParams.get('email_connected');
    const emailError = urlParams.get('email_error');

    if (emailConnected) {
      setBannerAlert({
        type: 'success',
        text: `Successfully connected and authorized your ${emailConnected.toUpperCase()} account for direct job applications!`,
      });
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (emailError) {
      setBannerAlert({
        type: 'error',
        text: `OAuth authorization error: ${decodeURIComponent(emailError)}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', {
        name,
        phone,
        profession,
        title,
        location,
        experienceLevel,
        github,
        linkedin,
        portfolio,
        description,
      });
      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      setPassMsg({ type: 'error', text: 'Please fill in both current and new password' });
      return;
    }
    setSavingPass(true);
    setPassMsg(null);
    try {
      await api.put('/auth/password', { currentPassword: currentPass, newPassword: newPass });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setPassMsg(null), 4000);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setSavingPass(false);
    }
  };

  // Send 6-digit OTP to contact email
  const handleSendContactOtp = async () => {
    if (!contactEmailInput || !contactEmailInput.includes('@')) {
      setOtpMsg({ type: 'error', text: 'Please enter a valid contact email address.' });
      return;
    }
    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await api.post('/candidate-email/send-contact-otp', {
        contactEmail: contactEmailInput.trim(),
      });
      setOtpSent(true);
      setOtpMsg({
        type: 'success',
        text: res.data?.message || '6-digit OTP code sent! Please check your inbox.',
      });
    } catch (err: any) {
      setOtpMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send OTP code. Please try again.',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify 6-digit OTP
  const handleVerifyContactOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpMsg({ type: 'error', text: 'Please enter the 6-digit code received in your email.' });
      return;
    }
    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await api.post('/candidate-email/verify-contact-otp', {
        code: otpCode.trim(),
      });
      setContactEmailVerified(true);
      setOtpSent(false);
      setOtpCode('');
      setOtpMsg({
        type: 'success',
        text: res.data?.message || 'Contact email successfully verified!',
      });
      fetchEmailStatus();
      setTimeout(() => setOtpMsg(null), 5000);
    } catch (err: any) {
      setOtpMsg({
        type: 'error',
        text: err.response?.data?.message || 'Invalid or expired OTP code. Please request a new code.',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Connect Google Gmail via OAuth
  const handleConnectGoogle = async () => {
    if (providerConfigs?.google && !providerConfigs.google.isConfigured) {
      setBannerAlert({
        type: 'error',
        text: 'Google Gmail OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render.',
      });
      return;
    }
    try {
      const res = await api.get('/candidate-email/google/connect-url');
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        text: err.response?.data?.message || 'Could not initiate Google OAuth. Check your environment configuration.',
      });
    }
  };

  // Connect Microsoft Outlook via OAuth
  const handleConnectMicrosoft = async () => {
    if (providerConfigs?.microsoft && !providerConfigs.microsoft.isConfigured) {
      setBannerAlert({
        type: 'error',
        text: 'Microsoft Outlook OAuth is not configured on the server. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET on Render.',
      });
      return;
    }
    try {
      const res = await api.get('/candidate-email/microsoft/connect-url');
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        text: err.response?.data?.message || 'Could not initiate Microsoft OAuth. Check your environment configuration.',
      });
    }
  };

  // Disconnect connected account
  const handleDisconnect = async (provider: 'gmail' | 'outlook') => {
    try {
      const account = connectedAccounts.find((a) => a.provider === provider);
      await api.post('/candidate-email/disconnect', {
        provider,
        email: account?.email,
      });
      setBannerAlert({
        type: 'success',
        text: `Disconnected ${provider.toUpperCase()} account successfully.`,
      });
      fetchEmailStatus();
      setTimeout(() => setBannerAlert(null), 4000);
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to disconnect account.',
      });
    }
  };

  // Send Test Application Email
  const handleSendTestEmail = async () => {
    setTestSending(true);
    setTestMsg(null);
    try {
      const res = await api.post('/candidate-email/send-test', {});
      setTestMsg({
        type: 'success',
        text: `Test email sent successfully! Message ID: ${res.data?.data?.messageId || 'CONFIRMED'} via ${res.data?.data?.provider?.toUpperCase()}`,
      });
    } catch (err: any) {
      setTestMsg({
        type: 'error',
        text: err.response?.data?.message || 'Test dispatch failed. Please verify your token status.',
      });
    } finally {
      setTestSending(false);
    }
  };

  // Connect Sandbox Test Account (Development helper)
  const handleConnectSandbox = async () => {
    setSandboxLoading(true);
    try {
      const res = await api.post('/candidate-email/connect-sandbox', {
        provider: 'gmail',
        email: contactEmailInput || user?.email || 'applicant.sandbox@recruitx.dev',
      });
      setBannerAlert({
        type: 'success',
        text: res.data?.message || 'Connected development sandbox email account!',
      });
      fetchEmailStatus();
      setTimeout(() => setBannerAlert(null), 5000);
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to connect sandbox account.',
      });
    } finally {
      setSandboxLoading(false);
    }
  };

  const gmailAccount = connectedAccounts.find((a) => a.provider === 'gmail');
  const outlookAccount = connectedAccounts.find((a) => a.provider === 'outlook');
  const gatewayAccount = connectedAccounts.find((a) => a.provider === 'gateway');

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900">Candidate Profile &amp; Settings</h1>
        <p className="text-xs text-neutral-500">Manage your recruitment profile, verified contact email, and authorized email accounts for direct job applications.</p>
      </div>

      {bannerAlert && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            bannerAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{bannerAlert.text}</span>
          </div>
          <button
            onClick={() => setBannerAlert(null)}
            className="text-neutral-400 hover:text-neutral-600 font-bold ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* CARD 1: CANDIDATE INFO & LINKS */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <User className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Candidate Information &amp; Links</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Login Account Email</label>
              <Input value={email} disabled className="bg-neutral-50 text-neutral-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Primary Discipline / Profession</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white"
              >
                <option value="">Select your discipline...</option>
                <option value="Software Engineering">Software Engineering &amp; Web Development</option>
                <option value="Artificial Intelligence &amp; Data Science">AI, Machine Learning &amp; Data Science</option>
                <option value="UI/UX &amp; Product Design">UI/UX &amp; Product Design</option>
                <option value="Product Marketing &amp; Growth Management">Product Marketing &amp; Growth Management</option>
                <option value="Finance &amp; Accounting">Finance &amp; Corporate Accounting</option>
                <option value="Video Editing &amp; Post-Production">Video Editing &amp; Post-Production</option>
                <option value="Film &amp; Movie Direction">Film &amp; Cinema Direction</option>
                <option value="Cloud Infrastructure &amp; DevOps">Cloud Infrastructure &amp; DevOps</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Target Role / Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Contact Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Current / Desired Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 bg-white"
              >
                <option value="Fresher / Entry-Level">Fresher / Entry-Level</option>
                <option value="Junior (1-2 years)">Junior (1-2 years)</option>
                <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
                <option value="Senior (5+ years)">Senior (5+ years)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-neutral-700 block mb-1">LinkedIn Profile</label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">GitHub Profile</label>
              <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="font-medium text-neutral-700 block mb-1">Portfolio / Personal Site</label>
              <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="font-medium text-neutral-700 block mb-1">Professional Bio &amp; Summary</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of your background, core competencies, and career goals..."
              className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? 'Updating Profile...' : 'Save Profile Changes'}
            </Button>
            {profileMsg && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${profileMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* CARD 2: CANDIDATE EMAIL MANAGEMENT & CONNECTED SENDING ACCOUNTS */}
      <Card className="p-5 space-y-5 border-neutral-300 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-neutral-900">Candidate Email &amp; Connected Sending Accounts</h2>
          </div>
          <button
            onClick={fetchEmailStatus}
            disabled={emailStatusLoading}
            className="text-neutral-500 hover:text-neutral-800 text-xs flex items-center gap-1"
            title="Refresh Token &amp; Email Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${emailStatusLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Section A: Verified Contact Email with OTP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">1. Verified Contact Email</h3>
              <p className="text-[11px] text-neutral-500">Recruiters and hiring managers use this address to contact you.</p>
            </div>
            {contactEmailVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Contact
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Unverified
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Input
                type="email"
                value={contactEmailInput}
                onChange={(e) => {
                  setContactEmailInput(e.target.value);
                  setContactEmailVerified(false);
                }}
                placeholder="e.g. yourname@gmail.com"
                className="text-xs"
              />
            </div>
            <div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={otpLoading || !contactEmailInput}
                onClick={handleSendContactOtp}
                className="w-full text-xs"
              >
                {otpLoading ? 'Sending Code...' : (otpSent ? 'Resend 6-Digit OTP' : 'Send Verification OTP')}
              </Button>
            </div>
          </div>

          {/* OTP Verification Input Form */}
          {otpSent && (
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">Enter the 6-Digit Code sent to {contactEmailInput}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-36 text-center font-mono tracking-widest text-sm bg-white"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={otpLoading || otpCode.length !== 6}
                  onClick={handleVerifyContactOtp}
                  className="text-xs"
                >
                  {otpLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>
            </div>
          )}

          {otpMsg && (
            <div
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                otpMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {otpMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {otpMsg.text}
            </div>
          )}

          <div className="p-2.5 rounded bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <span>
              <strong>Advisory Notice:</strong> Verifying a contact email confirms where companies can contact you. It does <em>NOT</em> grant RecruitX permission to send emails from this address. To send applications directly from your email account, authorize Google or Microsoft below.
            </span>
          </div>
        </div>

        {/* Section B: Automated Application Sending Service */}
        <div className="border-t border-neutral-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">2. Automated Application Sending Service</h3>
              <p className="text-[11px] text-neutral-500">RecruitX sends application emails directly through its own verified transactional email service.</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Service Active
            </span>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-900 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Direct-to-Employer Automated Email Dispatch</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed">
              When you click <strong>Apply Automatically</strong> on any job with a verified employer recruitment desk, RecruitX generates a tailored professional cover letter and email using Gemini AI, attaches your uploaded PDF resume, and dispatches the application directly to the hiring team.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
              <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
                <span className="font-bold text-neutral-900 block">Verified Sender Identity</span>
                <span className="text-neutral-600 block">
                  Emails are transmitted through RecruitX's authenticated transactional email gateway, guaranteeing high deliverability without SPF/DKIM rejections.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-neutral-200 space-y-1">
                <span className="font-bold text-neutral-900 block">Direct Candidate Reply-To</span>
                <span className="text-neutral-800 font-mono text-[10.5px] block truncate">
                  {contactEmailVerified ? contactEmailInput : (email || 'Your Registered Email')}
                </span>
                <span className="text-neutral-500 block text-[10px]">
                  All employer responses and interview invitations are delivered straight to your personal inbox.
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* CARD 3: CHANGE PASSWORD */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Lock className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Change Password</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">Current Password</label>
            <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">New Password (min 6 chars)</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" variant="secondary" disabled={savingPass}>
              {savingPass ? 'Updating...' : 'Update Password'}
            </Button>
            {passMsg && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${passMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passMsg.text}
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* CARD 4: AUTOMATED JOB APPLICATIONS */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-900">Automated Job Applications (Auto-Apply)</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Universal Job Application Standards</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed">
              RecruitX applies genuine submission protocols across all professions, job titles, and employers. If an authorized sending account is connected, applications are sent directly from your address to the employer's recruitment inbox with your resume attached. When an employer requires direct portal submission, RecruitX establishes your application tracker and provides direct links to the official portal.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white">
            <div>
              <p className="font-semibold text-neutral-900">Auto-Apply Engine Quick Action</p>
              <p className="text-[11px] text-neutral-500">Configure parameters or trigger an automated application scan across all professions and locations.</p>
            </div>
            <Button
              size="sm"
              onClick={() => (window.location.href = '/student/jobs')}
              className="text-xs shrink-0"
            >
              Open Auto-Apply in Job Matches →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
