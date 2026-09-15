import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z.boolean().refine((val) => val === true, 'You must agree to terms & conditions'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await registerAuth({
        name: values.name,
        email: values.email,
        password: values.password,
        role: selectedRole,
      });

      const redirectPath = selectedRole === 'recruiter' ? '/recruiter' : '/student';
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Registration failed. Please try again.'
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
          Create your account
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Join RecruitX as a Student or Recruiter
        </p>
      </div>

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
        {/* Role Selector (Admin excluded from public registration) */}
        <RoleSelector
          value={selectedRole}
          onChange={setSelectedRole}
          allowAdmin={false}
        />

        {/* Full Name */}
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          leftIcon={<UserIcon className="w-4 h-4" />}
          error={errors.name?.message}
          {...register('name')}
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
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
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

        {/* Confirm Password Field */}
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter your password"
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

        {/* Terms Checkbox */}
        <Checkbox
          label={
            <span>
              I agree to the{' '}
              <a href="#" className="font-semibold underline text-neutral-900">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-semibold underline text-neutral-900">
                Privacy Policy
              </a>
            </span>
          }
          error={errors.terms?.message}
          {...register('terms')}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create account
        </Button>
      </form>

      {/* Link to Login */}
      <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
        <p className="text-xs text-neutral-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-neutral-900 hover:underline transition-colors"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </Card>
  );
};
