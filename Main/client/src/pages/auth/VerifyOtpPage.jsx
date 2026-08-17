import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { resendVerification, verifyEmail } from '../../lib/authApi';

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { completeTwoFactorLogin, currentUser, refreshCurrentUser } = useAuth();
  const { showToast } = useApp();
  const userEmail = location.state?.email || currentUser?.email || '';

  // Login 2FA uses a short-lived token; signup and unverified-login use
  // the email OTP issued by the backend during registration.
  const twoFactorToken = location.state?.twoFactorToken || searchParams.get('twoFactorToken');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtp(digits);
      inputRefs[5].current?.focus();
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setResendTimer(60);
    setCanResend(false);
    setError('');
    resendVerification({ email: userEmail })
      .then(() => showToast('Verification Code Resent', 'A new 6-digit OTP code has been sent.', 'success'))
      .catch((err) => setError(err.message || 'Unable to resend a code.'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    if (twoFactorToken) {
      try {
        const result = await completeTwoFactorLogin(twoFactorToken, code);
        navigate(result.user?.emailVerified && result.user?.verificationStatus === 'approved' ? '/app/dashboard' : result.user?.emailVerified ? '/verification' : '/verify-otp', {
          replace: true,
          state: result.user?.emailVerified ? undefined : { email: userEmail },
        });
      } catch (err) {
        setError(err.message || 'Invalid or expired authentication code.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Registration / login OTP path: real POST /auth/verify-email, then
    // refresh the session and continue to the KYC document flow.
    try {
      if (!userEmail) throw new Error('Sign in again to verify your email address.');
      await verifyEmail({ email: userEmail, otp: code });
      await refreshCurrentUser();
      showToast('Email Verified', 'Your email is now verified. Continue with your KYC documents.', 'success');
      navigate('/verification', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-xs font-bold text-trust-slate hover:text-trust-verified transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </Link>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-trust-verified/10 text-trust-verified rounded-2xl flex items-center justify-center mx-auto shadow-soft-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black text-trust-ink">
          {twoFactorToken ? 'Two-Factor Authentication' : 'Enter Verification Code'}
        </h1>
        <p className="text-xs text-trust-slate">
          {twoFactorToken
            ? 'Enter the 6-digit code from your authenticator app.'
            : <>We sent a 6-digit OTP code to <span className="font-semibold text-trust-ink">{userEmail || 'your email address'}</span>.</>}
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl text-center border border-red-200 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isLoading}
              aria-label={`Digit ${idx + 1}`}
              className="w-11 h-12 text-center text-lg font-bold bg-white border border-trust-slate/20 text-trust-ink rounded-xl focus:outline-none focus:ring-2 focus:ring-trust-verified/40 focus:border-trust-verified transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ))}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
          <span>Verify OTP Code</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      {!twoFactorToken && (
        <div className="text-center text-xs text-trust-slate">
          Didn't receive code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className={`font-bold inline-flex items-center gap-1 ${
              canResend ? 'text-trust-verified hover:underline cursor-pointer' : 'text-trust-slate cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${!canResend ? 'animate-spin' : ''}`} />
            {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
          </button>
        </div>
      )}
    </div>
  );
};
