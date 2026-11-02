import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { Mail, ArrowLeft, Send, CheckCircle2, Lock, KeyRound, Eye, EyeOff, RotateCcw } from 'lucide-react';

type Step = 'email' | 'code' | 'password' | 'success';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard State
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetSessionToken, setResetSessionToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timers
  const [cooldown, setCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes

  // Handle countdown timers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'code' && expirySeconds > 0) {
      timer = setTimeout(() => setExpirySeconds((e) => e - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, expirySeconds]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // STEP 1: Request 6-digit verification code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordResetOtp(cleanEmail);
      setStep('code');
      setCooldown(60);
      setExpirySeconds(600);
      setInfoMessage(`We've dispatched a 6-digit verification code to ${cleanEmail}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code with cooldown
  const handleResendCode = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await authService.requestPasswordResetOtp(email.trim().toLowerCase());
      setCooldown(60);
      setExpirySeconds(600);
      setInfoMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify 6-digit OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('Your verification code has expired. Please click "Resend Code" to receive a new one.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyPasswordResetOtp(email.trim().toLowerCase(), cleanOtp);
      if (res.data?.resetSessionToken) {
        setResetSessionToken(res.data.resetSessionToken);
        setStep('password');
        setInfoMessage('Code verified! Please create a strong new password for your account.');
      } else {
        setErrorMessage('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setErrorMessage('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setErrorMessage('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setErrorMessage('Password must contain at least one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPasswordWithOtp(email.trim().toLowerCase(), resetSessionToken, newPassword);
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update password. Session may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-full bg-neutral-100 text-neutral-900 mb-3 border border-neutral-200">
          {step === 'email' && <Mail className="w-6 h-6 text-neutral-800" />}
          {step === 'code' && <KeyRound className="w-6 h-6 text-indigo-600" />}
          {step === 'password' && <Lock className="w-6 h-6 text-neutral-800" />}
          {step === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
        </div>

        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          {step === 'email' && 'Reset your password'}
          {step === 'code' && 'Enter Verification Code'}
          {step === 'password' && 'Create New Password'}
          {step === 'success' && 'Password Reset Complete'}
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          {step === 'email' && "Enter your registered email address and we'll send a 6-digit verification code."}
          {step === 'code' && `We've sent a 6-digit code to ${email}. This code expires in 10 minutes.`}
          {step === 'password' && 'Choose a strong password containing uppercase, lowercase, and numbers.'}
          {step === 'success' && 'Your password has been successfully updated. You can now sign in.'}
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
          className="mb-4 text-xs"
        />
      )}
      {infoMessage && step !== 'success' && (
        <Alert
          type="info"
          message={infoMessage}
          onClose={() => setInfoMessage(null)}
          className="mb-4 text-xs"
        />
      )}

      {/* STEP 1: EMAIL INPUT */}
      {step === 'email' && (
        <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
          <Input
            label="Registered email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4 text-neutral-400" />}
            required
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold"
            isLoading={isLoading}
            rightIcon={<Send className="w-4 h-4" />}
          >
            Send Verification Code
          </Button>
        </form>
      )}

      {/* STEP 2: 6-DIGIT VERIFICATION CODE */}
      {step === 'code' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700">6-Digit Code</label>
              <span className={`text-[11px] font-mono font-semibold ${expirySeconds < 60 ? 'text-rose-600' : 'text-neutral-500'}`}>
                Expires in {formatTimer(expirySeconds)}
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setOtp(val);
              }}
              placeholder="••••••"
              className="w-full tracking-[10px] text-center font-mono text-2xl font-bold py-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all placeholder:text-neutral-300"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold"
            isLoading={isLoading}
            disabled={otp.trim().length !== 6 || expirySeconds <= 0}
          >
            Verify Code
          </Button>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setErrorMessage(null);
              }}
              className="text-neutral-500 hover:text-neutral-900 font-medium"
            >
              Change email
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || isLoading}
              className={`flex items-center gap-1 font-semibold ${
                cooldown > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SET NEW PASSWORD */}
      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-700">Password requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-500">
              <li className={newPassword.length >= 8 ? 'text-emerald-700 font-medium' : ''}>At least 8 characters</li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-700 font-medium' : ''}>At least one uppercase letter (A-Z)</li>
              <li className={/[a-z]/.test(newPassword) ? 'text-emerald-700 font-medium' : ''}>At least one lowercase letter (a-z)</li>
              <li className={/\d/.test(newPassword) ? 'text-emerald-700 font-medium' : ''}>At least one number (0-9)</li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold"
            isLoading={isLoading}
          >
            Update Password
          </Button>
        </form>
      )}

      {/* STEP 4: SUCCESS CONFIRMATION */}
      {step === 'success' && (
        <div className="text-center space-y-4 py-2">
          <Alert
            type="success"
            title="Password Updated"
            message="Your RecruitX password has been reset successfully. You can now use your new password to sign in."
          />
          <Button
            variant="primary"
            size="md"
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold"
            onClick={() => navigate('/login', { replace: true })}
          >
            Proceed to Sign In
          </Button>
        </div>
      )}

      {/* Footer Navigation */}
      {step !== 'success' && (
        <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      )}
    </Card>
  );
};
