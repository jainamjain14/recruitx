import React, { useState } from 'react';
import { signInWithPopup, AuthError } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';

interface SocialAuthButtonsProps {
  role: UserRole;
  mode: 'login' | 'signin' | 'signup';
  onSuccess: (redirectPath: string) => void;
  onError: (message: string) => void;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  role,
  mode,
  onSuccess,
  onError,
}) => {
  const { socialLogin } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

  const actionText = mode === 'signup' ? 'Sign up' : 'Sign in';

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    onError(''); // Clear any previous errors

    try {
      const firebaseProvider = provider === 'google' ? googleProvider : githubProvider;
      const result = await signInWithPopup(auth, firebaseProvider);

      const user = result.user;

      // Extract user info from Firebase
      const email = user.email || '';
      const name = user.displayName || email.split('@')[0] || 'User';
      const avatar = user.photoURL || undefined;
      const providerId = user.uid;

      if (!email) {
        throw new Error('Could not retrieve email from your account. Please try again.');
      }

      // Call backend with Firebase user info
      await socialLogin({ email, name, provider, providerId, role, avatar });

      const redirectPath = role === 'recruiter' ? '/recruiter' : '/student';
      onSuccess(redirectPath);
    } catch (err: any) {
      const authError = err as AuthError;

      // Handle specific Firebase errors gracefully
      if (authError.code === 'auth/popup-closed-by-user' || authError.code === 'auth/cancelled-popup-request') {
        // User just closed the popup — not really an error
        return;
      }
      if (authError.code === 'auth/account-exists-with-different-credential') {
        onError('An account with this email already exists. Try signing in with a different method.');
        return;
      }
      if (authError.code === 'auth/popup-blocked') {
        onError('Popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      if (authError.code === 'auth/unauthorized-domain') {
        onError('This domain is not authorized for OAuth. Please contact support.');
        return;
      }

      onError(
        authError.message ||
          err?.response?.data?.message ||
          `${provider === 'google' ? 'Google' : 'GitHub'} sign-in failed. Please try again.`
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="mt-5 space-y-3">
      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-[11px] font-medium text-neutral-400 tracking-wide uppercase whitespace-nowrap">
          or {actionText.toLowerCase()} with
        </span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Google Button */}
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => handleSocialAuth('google')}
        className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingProvider === 'google' ? (
          <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          /* Official Google G logo */
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
        )}
        <span>{loadingProvider === 'google' ? 'Connecting to Google…' : `${actionText} with Google`}</span>
      </button>

      {/* GitHub Button */}
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => handleSocialAuth('github')}
        className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loadingProvider === 'github' ? (
          <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          /* GitHub Octocat */
          <svg className="w-4 h-4 fill-slate-900 shrink-0" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        )}
        <span>{loadingProvider === 'github' ? 'Connecting to GitHub…' : `${actionText} with GitHub`}</span>
      </button>
    </div>
  );
};
