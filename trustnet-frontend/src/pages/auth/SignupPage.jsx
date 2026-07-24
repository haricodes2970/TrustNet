import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // This backend has no real OTP/email-verification flow -- GET
  // /auth/verify-email and POST /auth/resend-verification are
  // unauthenticated stubs that return a canned success without checking
  // anything (see integration report). Registering goes straight to
  // /login instead of the fictional /verify-otp step.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register({ email, password, fullName: name });
      navigate('/login', { state: { justRegistered: true } });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create your TrustNet account</h1>
        <p className="text-xs text-slate-500 mt-1">Join 12,000+ founders, VCs, and mentors today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Morgan"
          required
        />

        <Input
          label="Work Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@company.com"
          required
        />

        <Input
          label="Password"
          type="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          helperText="Must be at least 8 characters with digits and symbols."
          required
        />

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-bold hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
};
