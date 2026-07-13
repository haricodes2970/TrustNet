import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { AuthShell, OrDivider, SocialButtons } from "../components/auth/auth-shell";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = {};
    if (!String(fd.get("name")).trim()) errs.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(String(fd.get("email")))) errs.email = "Enter a valid email";
    if (String(fd.get("password")).length < 8)
      errs.password = "Password must be at least 8 characters";
    if (fd.get("password") !== fd.get("confirm")) errs.confirm = "Passwords do not match";
    if (!fd.get("terms")) errs.terms = "You must agree to the terms";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        fullName: String(fd.get("name")),
        email: String(fd.get("email")),
        password: String(fd.get("password")),
      });
      navigate("/verify-email");
    } catch (err) {
      setErrors({
        form: err?.response?.data?.message || "Registration failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building verified business relationships."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Login
          </Link>
        </p>
      }
    >
      {errors.form && (
        <p className="mb-4 text-xs font-medium text-destructive">{errors.form}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Full Name" name="name" placeholder="Sarah Chen" error={errors.name} />
        <Field label="Email" name="email" type="email" placeholder="sarah@company.com" error={errors.email} />
        <Field label="Password" name="password" type="password" placeholder="••••••••" error={errors.password} />
        <Field label="Confirm Password" name="confirm" type="password" placeholder="••••••••" error={errors.confirm} />
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
          <span>
            I agree to the <span className="font-medium text-primary">Terms &amp; Privacy Policy</span>
          </span>
        </label>
        {errors.terms && <p className="text-xs font-medium text-destructive">{errors.terms}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          Create Account
        </button>
      </form>
      <OrDivider />
      <SocialButtons />
    </AuthShell>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  error,
  defaultValue,
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
      />
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
