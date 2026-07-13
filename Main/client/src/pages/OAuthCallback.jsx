import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's double-invoke in dev, which would
    // otherwise try to consume the token twice.
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      navigate("/login?oauthError=missing_token", { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => navigate("/login?oauthError=session", { replace: true }));
  }, [params, navigate, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Signing you in…
    </div>
  );
}
