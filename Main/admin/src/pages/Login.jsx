import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import './auth/Login.css';

export default function Login() {
  const { login, completeTwoFactorLogin, authState, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in and an admin, redirect directly to dashboard
  if (isAuthenticated && authState === 'authenticated') {
    return <Navigate to="/admin" replace />;
  }

  // Handle standard credential submission
  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      if (response && response.requiresTwoFactor) {
        setTwoFactorToken(response.twoFactorToken);
        setRequires2FA(true);
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 2FA verification submission
  const handleSubmit2FA = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      setErrorMsg('Please enter a valid 6-digit authentication code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeTwoFactorLogin(twoFactorToken, otpCode);
      navigate('/admin');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setOtpCode('');
    setErrorMsg('');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-left-banner">
        <div className="banner-logo-container">
          <ShieldAlert className="banner-logo" size={32} />
          <h2 className="banner-brand-name">TrustNet</h2>
        </div>
        <div className="banner-text-content">
          <h1 className="banner-title">Ecosystem Control Center</h1>
          <p className="banner-subtitle">
            Admin console for identity verification, safety management, and analytics reporting.
          </p>
        </div>
        <div className="banner-footer">
          <span>&copy; {new Date().getFullYear()} TrustNet. All rights reserved.</span>
        </div>
      </div>

      <div className="login-right-form-panel">
        <div className="login-card-container">
          <div className="login-card-header">
            <h1 className="login-card-title">
              {requires2FA ? 'Two-Factor Verification' : 'Welcome Back'}
            </h1>
            <p className="login-card-subtitle">
              {requires2FA 
                ? 'Enter the 6-digit verification code from your authenticator app.' 
                : 'Sign in to access your admin dashboard.'
              }
            </p>
          </div>

          {errorMsg && (
            <div className="login-error-banner">
              <ShieldAlert size={16} className="error-banner-icon" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authState === 'unauthorized' && !requires2FA && (
            <div className="login-error-banner warning">
              <ShieldAlert size={16} className="error-banner-icon" />
              <span>
                Your account is authenticated but does not possess administrator permissions.
              </span>
            </div>
          )}

          {!requires2FA ? (
            <>
              {/* Credential Login Form */}
              <form onSubmit={handleSubmitCredentials} className="login-form-element">
                <div className="form-group-item">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="input-with-icon-wrapper">
                    <Mail size={16} className="input-field-icon" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="admin@trustnet.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label htmlFor="login-password">Password</label>
                  <div className="input-with-icon-wrapper">
                    <Lock size={16} className="input-field-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-trigger"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary login-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="auth-spinner" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
              {import.meta.env.DEV && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)', fontWeight: 600 }}
                    onClick={() => navigate('/admin')}
                  >
                    Launch Admin Preview Mode
                  </button>
                </div>
              )}
            </>
          ) : (
            /* 2FA Verification Form */
            <form onSubmit={handleSubmit2FA} className="login-form-element">
              <div className="form-group-item">
                <label htmlFor="login-otp">Security Verification Code</label>
                <input
                  id="login-otp"
                  type="text"
                  placeholder="000 000"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                  className="otp-code-input"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary login-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="auth-spinner" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify & Login</span>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline back-to-login-btn"
                onClick={handleBackToLogin}
                disabled={isSubmitting}
              >
                <ArrowLeft size={14} />
                <span>Back to credentials</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
