import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Check, X } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { resetPassword } from '../../lib/authApi';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password Requirements Evaluation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);

  const passedRulesCount = [hasMinLength, hasNumber, hasSpecialChar, hasUppercase, hasLowercase].filter(Boolean).length;

  const getStrengthState = () => {
    if (password.length === 0) return { label: 'Enter Password', score: 0, color: 'bg-slate-200', text: 'text-slate-400', message: '' };
    if (!hasMinLength) return { label: 'Weak', score: 1, color: 'bg-red-500', text: 'text-red-500', message: '❌ Too short (minimum 8 characters)' };
    if (!hasNumber) return { label: 'Fair', score: 2, color: 'bg-amber-500', text: 'text-amber-600', message: '✔ Length  ❌ Missing number' };
    if (passedRulesCount < 5) return { label: 'Strong', score: 3, color: 'bg-trust-verified', text: 'text-trust-verified', message: '✔ All requirements met' };
    return { label: 'Very Strong', score: 4, color: 'bg-trust-verified', text: 'text-trust-verified', message: '✓ Strong password · Ready to continue' };
  };

  const strength = getStrengthState();
  const isStrong = strength.score >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStrong) {
      setError('Password is too weak. Please meet security rules.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('This password reset link is invalid or missing its token.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await resetPassword({ token, password, confirmPassword });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Unable to reset your password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isSuccess ? (
        <>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Password</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your new password must satisfy TrustNet security requirements.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-9 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Strength:</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-slate-200'}`} />
                </div>

                <p className="text-[11px] font-bold text-slate-700 pt-0.5">{strength.message}</p>
              </div>
            )}

            {/* Checklist: Auto-Collapses when Strong */}
            {!isStrong && password.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px] border border-slate-200/80 transition-all duration-300">
                <div className={`flex items-center gap-2 ${hasMinLength ? 'text-trust-verified font-semibold' : 'text-slate-400'}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <X className="w-3.5 h-3.5" />}
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasNumber ? 'text-trust-verified font-semibold' : 'text-slate-400'}`}>
                  {hasNumber ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <X className="w-3.5 h-3.5" />}
                  <span>At least 1 number (0-9)</span>
                </div>
                <div className={`flex items-center gap-2 ${hasUppercase ? 'text-trust-verified font-semibold' : 'text-slate-400'}`}>
                  {hasUppercase ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <X className="w-3.5 h-3.5" />}
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-2 ${hasSpecialChar ? 'text-trust-verified font-semibold' : 'text-slate-400'}`}>
                  {hasSpecialChar ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <X className="w-3.5 h-3.5" />}
                  <span>At least 1 special character (!@#$)</span>
                </div>
              </div>
            )}

            {isStrong && (
              <div className="p-3 bg-trust-verified/10 rounded-xl border border-trust-verified/30 text-xs font-bold text-trust-verified flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-trust-verified" strokeWidth={1.75} />
                <span>✓ Strong password · Ready to continue</span>
              </div>
            )}

            <div className="relative">
              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-9 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full h-12 mt-4" isLoading={isLoading} disabled={!isStrong}>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center space-y-6 py-6">
          <div className="w-16 h-16 bg-trust-verified/10 text-trust-verified rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-9 h-9" strokeWidth={1.75} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">Password Updated!</h2>
            <p className="text-xs text-slate-500 mt-2">
              Your password has been updated successfully. Redirecting to login in 2 seconds...
            </p>
          </div>

          <Button variant="primary" size="lg" className="w-full h-12" onClick={() => navigate('/login')}>
            <span>Sign In Now</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>
      )}
    </div>
  );
};
