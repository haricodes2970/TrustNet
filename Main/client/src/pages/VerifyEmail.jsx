import { Link } from "react-router-dom";
import { useEffect } from "react";
import api from "../services/api";
import { MailCheck } from "lucide-react";
import { AuthShell } from "../components/auth/auth-shell";

export default function VerifyEmailPage() {
  useEffect(() => {
    // Confirm the email with the backend; the page UI stays the same.
    api
      .get("/v1/auth/verify-email")
      .catch(() => {});
  }, []);

  return (
    <AuthShell title="Check your inbox" subtitle="One more step before you continue.">
      <div className="flex flex-col items-center text-center">
        <div className="animate-scale-in grid h-24 w-24 place-items-center rounded-full bg-brand-soft">
          <MailCheck className="h-12 w-12 text-success" />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          We've sent a verification link to your email.
          <br />
          <span className="font-medium text-foreground">Please verify before continuing.</span>
        </p>
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <button className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
            Resend Email
          </button>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Open Gmail
          </a>
        </div>
        <Link to="/login" className="mt-5 text-sm font-medium text-primary hover:underline">
          I've verified — continue to login
        </Link>
      </div>
    </AuthShell>
  );
}
