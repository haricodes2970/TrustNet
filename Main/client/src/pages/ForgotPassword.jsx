import { Link } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import { AuthShell } from "../components/auth/auth-shell";
import { Field } from "./Register";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to send a reset link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Back to login
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl bg-brand-soft p-4 text-sm font-medium text-success">
          Reset link sent! Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <Field label="Email" name="email" type="email" placeholder="sarah@company.com" />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
