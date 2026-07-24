import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = location.state?.email || 'alex@nexusai.io';

  const [otp, setOtp] = useState(['4', '8', '2', '9', '1', '6']);
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
    // Mock resend code
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (location.state?.isSignup) {
        navigate('/onboarding');
      } else {
        navigate('/reset-password', { state: { email: userEmail, code } });
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <Link
        to="/forgot-password"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </Link>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-soft-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black text-slate-900 dark:text-white">Enter Verification Code</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We sent a 6-digit OTP code to <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span>.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-center border border-red-200 dark:border-red-900">
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
              className="w-11 h-12 text-center text-lg font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          ))}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
          <span>Verify OTP Code</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Didn't receive code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className={`font-bold inline-flex items-center gap-1 ${
            canResend ? 'text-emerald-600 hover:underline cursor-pointer' : 'text-slate-400 cursor-not-allowed'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${!canResend ? 'animate-spin' : ''}`} />
          {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
        </button>
      </div>
    </div>
  );
};
