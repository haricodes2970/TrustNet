import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import { AuthShell } from "../components/auth/auth-shell";
import { Field } from "./Register";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = {};
    if (String(fd.get("password")).length < 8)
      errs.password = "Password must be at least 8 characters";
    if (fd.get("password") !== fd.get("confirm")) errs.confirm = "Passwords do not match";
    if (!new URLSearchParams(window.location.search).get("token")) errs.form = "This password reset link is invalid or incomplete.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/auth/reset-password", {
        password: String(fd.get("password")),
        confirmPassword: String(fd.get("confirm")),
        token: new URLSearchParams(window.location.search).get("token"),
      });
      setMessage("Password reset successfully. Redirecting to login…");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || "Unable to reset password. Please request a new link." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Choose a strong new password.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && <p className="text-xs font-medium text-destructive">{errors.form}</p>}
        {message && <p className="text-xs font-medium text-success">{message}</p>}
        <Field label="New Password" name="password" type="password" placeholder="••••••••" error={errors.password} />
        <Field label="Confirm Password" name="confirm" type="password" placeholder="••••••••" error={errors.confirm} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </AuthShell>
  );
}
