import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { Lock, Eye, EyeOff, Key, ArrowRight, ArrowLeft } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken,
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.resetPassword(values.token, values.password);
      if (response.success) {
        navigate('/login', {
          state: { message: 'Password has been reset successfully. Please sign in with your new password.' },
          replace: true,
        });
      } else {
        setErrorMessage(response.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error resetting password. Token may be invalid or expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          Set new password
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Enter your security reset token and choose a new password
        </p>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Token Input */}
        <Input
          label="Reset Token"
          type="text"
          placeholder="Paste security reset token"
          leftIcon={<Key className="w-4 h-4" />}
          error={errors.token?.message}
          {...register('token')}
        />

        {/* New Password */}
        <div>
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new strong password"
            autoComplete="new-password"
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
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          }
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Reset password
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </Card>
  );
};
