import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Building,
  DollarSign,
  Users,
  GraduationCap,
  CheckCircle2,
  Check
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../lib/apiClient';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Entrepreneur');
  const [isLoading, setIsLoading] = useState(false);
  const [signingMessage, setSigningMessage] = useState('');
  const [error, setError] = useState('');

  // Preselect role from LocalStorage memory
  useEffect(() => {
    const savedRole = localStorage.getItem('trustnet_last_workspace');
    if (savedRole) {
      setSelectedRole(savedRole);
    }
  }, []);

  // OAuth 2FA case: the backend redirects 2FA-enabled Google/LinkedIn
  // logins here with ?twoFactorToken=... (never straight to
  // /oauth/callback) -- forward to the same code-entry step a normal
  // password login with 2FA would use.
  useEffect(() => {
    const twoFactorToken = searchParams.get('twoFactorToken');
    if (twoFactorToken) {
      navigate('/verify-otp', { replace: true, state: { twoFactorToken } });
    }
  }, [searchParams, navigate]);

  const handleRoleSelect = (roleId) => {
    if (isLoading) return;
    setSelectedRole(roleId);
    setError('');
    localStorage.setItem('trustnet_last_workspace', roleId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please choose a workspace before signing in.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setIsLoading(true);
    setSigningMessage(`✓ Signing into ${selectedRole} Workspace...`);

    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor) {
        navigate('/verify-otp', { state: { twoFactorToken: result.twoFactorToken } });
        return;
      }
      // Everyone lands on the normal dashboard regardless of the workspace
      // tile chosen above -- it's a display preference, not a role grant.
      // Real administrators reach the Admin Console via the sidebar link,
      // which only renders for accounts whose backend-verified role is
      // 'admin' (see components/common/Sidebar.jsx).
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
      setSigningMessage('');
    }
  };

  // Administrator is intentionally not a selectable workspace here -- admin
  // access is granted solely by the backend-verified account role, never by
  // a login-time choice. Real admins sign in normally and reach the Admin
  // Console through the sidebar link.
  const roleOptions = [
    { id: 'Entrepreneur', title: 'Entrepreneur', icon: Building, desc: 'Build and manage startups', footer: 'Startup Dashboard' },
    { id: 'Investor', title: 'Investor', icon: DollarSign, desc: 'Discover investment opportunities', footer: 'Investment Workspace' },
    { id: 'Mentor', title: 'Mentor', icon: Users, desc: 'Guide founders', footer: 'Mentor Workspace' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-xs text-slate-500 mt-1">Select your workspace and enter credentials to sign in</p>
      </div>

      {/* Role Workspace Selection Section */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Select Your Workspace
          </label>
          <p className="text-[11px] text-slate-500">Choose how you want to access TrustNet.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none relative ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-soft-sm ring-2 ring-emerald-500/20'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:scale-[1.01]'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {role.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{role.desc}</p>
                    <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">
                      "{role.footer}"
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {signingMessage && (
        <div className="p-3 text-xs bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-bold flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
          <span>{signingMessage}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="absolute right-3.5 top-9 text-slate-400 hover:text-slate-600 text-xs"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked disabled={isLoading} className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
            <span className="text-slate-600 font-medium">Remember this device</span>
          </label>
          <Link to="/forgot-password" className="text-emerald-600 hover:underline font-semibold">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full h-12 mt-2"
          isLoading={isLoading}
        >
          <span>Sign In to TrustNet</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 uppercase">
        <div className="h-px flex-1 bg-slate-200" />
        <span>Or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Full-page redirects to the backend, not axios calls -- the backend
          issues its own redirect to Google/LinkedIn and back. */}
      <div className="space-y-2.5">
        <a
          href={`${BASE_URL}/auth/google`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Continue with Google
        </a>
        <a
          href={`${BASE_URL}/auth/linkedin`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Continue with LinkedIn
        </a>
      </div>

      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
        Don't have an account?{' '}
        <Link to="/signup" className="text-emerald-600 font-bold hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
};
