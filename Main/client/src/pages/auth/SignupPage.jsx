import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');

  // Password strength checker logic
  useEffect(() => {
    if (!password) {
      setStrengthScore(0);
      setStrengthLabel('');
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    setStrengthScore(score);
    if (score <= 2) {
      setStrengthLabel('Weak');
    } else if (score === 3) {
      setStrengthLabel('Medium');
    } else {
      setStrengthLabel('Strong');
    }
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!name || name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid work email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, password, fullName: name });
      // Register → immediate OTP entry (real backend issues the email OTP).
      navigate('/verify-otp', { state: { email, justRegistered: true } });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-red-500 text-red-600 dark:text-red-400';
    if (strengthScore === 3) return 'bg-amber-500 text-amber-600 dark:text-amber-400';
    return 'bg-trust-verified text-white dark:text-white';
  };

  const getStrengthTextColor = () => {
    if (strengthScore <= 2) return 'text-red-500';
    if (strengthScore === 3) return 'text-amber-500';
    return 'text-trust-verified';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-trust-ink tracking-tight">Create your TrustNet account</h1>
        <p className="text-xs text-trust-slate mt-1">Join 12,000+ founders, VCs, and mentors today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Morgan"
          disabled={isLoading}
          required
        />

        <Input
          label="Work Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@company.com"
          disabled={isLoading}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-9 text-trust-slate hover:text-trust-ink text-xs"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
          </button>
        </div>

        {password && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] font-semibold">
              <span className="text-trust-slate">Password Strength</span>
              <span className={getStrengthTextColor()}>{strengthLabel}</span>
            </div>
            <div className="flex gap-1 h-1.5 w-full bg-trust-slate/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${getStrengthColor().split(' ')[0]}`}
                style={{ width: `${(strengthScore / 5) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-trust-slate">
              Must be at least 8 characters with digits and symbols.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full h-12" isLoading={isLoading}>
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="text-center text-xs text-trust-slate pt-4 border-t border-trust-ink/10">
        Already have an account?{' '}
        <Link to="/login" className="text-trust-verified font-bold hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
};
