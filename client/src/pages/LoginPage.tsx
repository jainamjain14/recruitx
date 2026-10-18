import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Alert } from '../components/ui/Alert';
import { RoleSelector } from '../components/ui/RoleSelector';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { EmailVerificationModal } from '../components/auth/EmailVerificationModal';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email verification modal state (triggered if account is unverified)
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Read message from location state if redirected from register/reset password
  const successNotice = (location.state as any)?.message;

  // Retrieve remembered email and preferences
  const savedEmail = (() => {
    try {
      return localStorage.getItem('recruitx_remember_email') || '';
    } catch {
      return '';
    }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail,
      password: '',
      rememberMe: Boolean(savedEmail),
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // If rememberMe is checked, save email to localStorage; otherwise remove it
      try {
        if (values.rememberMe) {
          localStorage.setItem('recruitx_remember_email', values.email);
        } else {
          localStorage.removeItem('recruitx_remember_email');
        }
      } catch {}

      const user = await login({
        email: values.email,
        password: values.password,
        role: selectedRole,
        rememberMe: values.rememberMe,
      });

      // Redirect user according to role
      const redirectPath =
        selectedRole === 'admin'
          ? '/admin'
          : selectedRole === 'recruiter'
          ? '/recruiter'
          : '/student';

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      const data = err.response?.data;
      // Backend returns requiresVerification: true when email not verified
      if (data?.requiresVerification) {
        setPendingEmail(data.email || values.email);
        setIsVerificationOpen(true);
        return;
      }
      setErrorMessage(
        data?.message || err.message || 'Failed to sign in. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      {/* Header section */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Please sign in to access your RecruitX account
        </p>
      </div>

      {/* Success banner if redirected */}
      {successNotice && (
        <Alert
          type="success"
          message={successNotice}
          className="mb-4"
        />
      )}

      {/* Error banner */}
      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Role Selector */}
        <RoleSelector
          value={selectedRole}
          onChange={setSelectedRole}
          allowAdmin={true}
        />

        {/* Email Field */}
        <Input
          label="Email address"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password Field */}
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <Checkbox
            label="Remember me"
            {...register('rememberMe')}
          />
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign in
        </Button>
      </form>

      {/* Social Sign-In Stack (Google & GitHub) */}
      <SocialAuthButtons
        role={selectedRole}
        mode="signin"
        onSuccess={(path) => navigate(path, { replace: true })}
        onError={(err) => setErrorMessage(err)}
      />

      {/* Link to Register */}
      <div className="mt-5 pt-4 border-t border-neutral-100 text-center">
        <p className="text-xs text-neutral-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-neutral-900 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Verification modal – opens when user tries to log in with unverified email */}
      <EmailVerificationModal
        isOpen={isVerificationOpen}
        email={pendingEmail}
        onSuccess={() => {
          setIsVerificationOpen(false);
          const redirectPath =
            selectedRole === 'admin'
              ? '/admin'
              : selectedRole === 'recruiter'
              ? '/recruiter'
              : '/student';
          navigate(redirectPath, { replace: true });
        }}
        onCancel={() => setIsVerificationOpen(false)}
      />
    </Card>
  );
};

