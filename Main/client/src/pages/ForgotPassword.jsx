import { Link } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import { AuthShell } from "../components/auth/auth-shell";
import { Field } from "./Register";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
          Reset link sent! Check your inbox.{" "}
          <Link to="/reset-password" className="underline">
            (Demo: open reset page)
          </Link>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setSubmitting(true);
            try {
              await api.post("/v1/auth/forgot-password", {
                email: String(fd.get("email")),
              });
            } catch (err) {
              // Endpoint always reports success; surface nothing disruptive.
            } finally {
              setSubmitting(false);
              setSent(true);
            }
          }}
          className="space-y-4"
        >
          <Field label="Email" name="email" type="email" placeholder="sarah@company.com" />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            Send Reset Link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
