import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function VerificationInProgressPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-soft">
          <CheckCircle2 className="h-11 w-11 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Verification Submitted Successfully</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Your documents have been submitted for review. Our team will verify your information within 24–48 hours. You will gain access to the dashboard once your account is approved.</p>
        <span className="mt-6 inline-flex rounded-full bg-warning/15 px-3 py-1 text-sm font-semibold text-warning">Verification Status: Pending Review</span>
        <button type="button" onClick={handleBackToLogin} className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">Back to Login</button>
      </div>
    </div>
  );
}
