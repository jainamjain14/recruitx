import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types/auth';

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  role?: UserRole;
  onSuccess: (user: User) => void;
  onCancel?: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  email,
  onSuccess,
  onCancel,
}) => {
  const { verifyEmail, resendVerification } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen) return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const user = await verifyEmail(email, code.trim());
      setSuccessMsg('Email confirmed successfully! Redirecting...');
      setTimeout(() => {
        onSuccess(user);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setError(null);
    setIsResending(true);

    try {
      await resendVerification(email);
      setSuccessMsg('A new verification code has been dispatched to your email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/20 border border-blue-400/30 mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Confirm Your Email</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            We sent a 6-digit confirmation code to verify your identity.
          </p>
        </div>

        {/* Content body */}
        <div className="p-6">
          {/* Target Email Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-5">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-xs truncate">
              <span className="text-slate-500">Sent to: </span>
              <span className="font-semibold text-slate-900">{email}</span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 text-center uppercase tracking-wider">
                Enter 6-Digit Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCode(val);
                    if (error) setError(null);
                  }}
                  autoFocus
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3.5 px-4 rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend & Actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="text-slate-600 hover:text-blue-600 disabled:text-slate-400 font-medium inline-flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {countdown > 0 ? (
                <span>Resend code in <strong>{countdown}s</strong></span>
              ) : (
                <span>Didn't get code? <strong>Resend</strong></span>
              )}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel & Return
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
