import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { AuthShell, OrDivider, SocialButtons } from "../components/auth/auth-shell";
import { Field } from "./Register";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");
    if (oauthError) {
      setErrors({ form: "That sign-in attempt didn't go through. Please try again." });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(String(fd.get("email"))))
      errs.email = "Enter a valid email";
    if (!String(fd.get("password"))) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await login(String(fd.get("email")), String(fd.get("password")));
      navigate("/dashboard");
    } catch (err) {
      setErrors({
        form: err?.response?.data?.message || "Login failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to TrustNet."
      footer={
        <p>
          New to TrustNet?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {errors.form && (
        <p className="mb-4 text-xs font-medium text-destructive">{errors.form}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="sarah@company.com"
          error={errors.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          error={errors.password}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />{" "}
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot Password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          Login
        </button>
      </form>
      <OrDivider />
      <SocialButtons />
    </AuthShell>
  );
}
