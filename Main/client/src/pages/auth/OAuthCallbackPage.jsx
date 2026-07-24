import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Backend redirects here (GET /auth/google/callback, /auth/linkedin/callback
// on success) with ?token=<accessToken> already issued -- OR, if the user
// has 2FA enabled, redirects to /login?twoFactorToken=... instead (handled
// by LoginPage/VerifyOtpPage, not this page). Mirrors Main/client's
// OAuthCallback.jsx exactly, adapted to this frontend's AuthContext.
export const OAuthCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's double-invoke in dev, which would
    // otherwise try to consume the token twice.
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    if (!token) {
      navigate('/login?oauthError=missing_token', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/app/dashboard', { replace: true }))
      .catch(() => navigate('/login?oauthError=session', { replace: true }));
  }, [params, navigate, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
      Signing you in…
    </div>
  );
};
