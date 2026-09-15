import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<{ resetToken: string; resetUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(values.email);
      if (response.success && response.data) {
        setSuccessPayload(response.data);
      } else {
        setErrorMessage(response.message || 'Error processing request.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error sending password reset request.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          Reset your password
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Enter your registered email address and we'll send you instructions to reset your password.
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

      {successPayload ? (
        <div className="flex flex-col gap-4 text-center py-2">
          <Alert
            type="success"
            title="Reset Token Generated"
            message="We have generated password reset instructions for your account."
          />
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3.5 text-left text-xs space-y-2">
            <span className="font-semibold text-neutral-800 block">Reset Token:</span>
            <code className="block p-2 bg-white border border-neutral-200 rounded text-[11px] font-mono break-all text-neutral-800">
              {successPayload.resetToken}
            </code>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() =>
              navigate(`/reset-password?token=${encodeURIComponent(successPayload.resetToken)}`)
            }
          >
            Proceed to Reset Password
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<Send className="w-4 h-4" />}
          >
            Send reset instructions
          </Button>
        </form>
      )}

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
