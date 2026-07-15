import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { AuthShell, OrDivider, SocialButtons } from "../components/auth/auth-shell";
import { Field } from "./Register";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, completeTwoFactorLogin } = useAuth();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const [twoFactorToken, setTwoFactorToken] = useState(() => searchParams.get("twoFactorToken") || "");

  useEffect(() => {
    if (searchParams.get("oauthError")) setErrors({ form: "That sign-in attempt didn't go through. Please try again." });
    if (searchParams.get("twoFactorToken")) setErrors({ form: "Enter the code from your authenticator app to finish signing in." });
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors = {};
    if (twoFactorToken) {
      if (!/^\d{6}$/.test(String(form.get("token")))) errors.token = "Enter the 6-digit code from your authenticator app";
    } else {
      if (!/^\S+@\S+\.\S+$/.test(String(form.get("email")))) errors.email = "Enter a valid email";
      if (!String(form.get("password"))) errors.password = "Password is required";
    }
    setErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const result = twoFactorToken
        ? await completeTwoFactorLogin(twoFactorToken, String(form.get("token")))
        : await login(String(form.get("email")), String(form.get("password")));
      if (result?.data?.requiresTwoFactor) {
        setTwoFactorToken(result.data.twoFactorToken);
        setErrors({ form: "Enter the code from your authenticator app to finish signing in." });
        return;
      }
      navigate(result?.data?.user?.onboardingCompleted ? (result?.data?.user?.verificationStatus === "approved" ? "/dashboard" : "/verification") : "/onboarding");
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || "Login failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to TrustNet." footer={<p>New to TrustNet? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></p>}>
      {errors.form && <p className="mb-4 text-xs font-medium text-destructive">{errors.form}</p>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {twoFactorToken ? (
          <Field label="Authentication Code" name="token" inputMode="numeric" placeholder="123456" error={errors.token} />
        ) : (
          <>
            <Field label="Email" name="email" type="email" placeholder="sarah@company.com" error={errors.email} />
            <Field label="Password" name="password" type="password" placeholder="••••••••" error={errors.password} />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" /> Remember me</label>
              <Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot Password?</Link>
            </div>
          </>
        )}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60">
          {submitting ? "Verifying…" : twoFactorToken ? "Verify Code" : "Login"}
        </button>
      </form>
      {!twoFactorToken && <><OrDivider /><SocialButtons /></>}
    </AuthShell>
  );
}
