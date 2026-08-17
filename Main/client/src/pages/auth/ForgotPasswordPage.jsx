import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { forgotPassword } from '../../lib/authApi';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setIsSent(true);
    } catch (err) {
      setError(err.message || 'Unable to send a reset link. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-xs font-bold text-trust-slate hover:text-trust-verified transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </Link>

      {!isSent ? (
        <>
          <div>
            <h1 className="text-2xl font-black text-trust-ink tracking-tight">Reset your password</h1>
            <p className="text-xs text-trust-slate mt-1">
              Enter your work email address and we'll send you a password reset link.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Work Email Address"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@nexusai.io"
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-12"
              isLoading={isLoading}
            >
              <span>Send Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-trust-verified/10 text-trust-verified rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-trust-ink">Email Sent Successfully</h2>
            <p className="text-xs text-trust-slate mt-2 max-w-sm mx-auto leading-relaxed">
              If an account exists for <span className="font-bold text-trust-ink">{email}</span>, we've sent a password reset link. Please check your inbox.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full h-12"
            onClick={() => navigate('/login')}
          >
            <span>Back to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
