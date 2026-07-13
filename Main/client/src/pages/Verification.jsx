import { useState } from "react";
import {
  Building2,
  Check,
  Clock,
  FileText,
  Globe,
  IdCard,
  Linkedin,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { resendVerification } from "../services/verification";

const timeline = [
  { label: "Submitted", done: true, time: "Jul 7, 4:32 PM" },
  { label: "Reviewing", done: false, active: true, time: "In progress" },
  { label: "Approved", done: false, time: "Pending" },
];
const documents = [
  { icon: IdCard, name: "Government ID", file: "passport-scan.pdf", status: "reviewing" },
  { icon: Building2, name: "Company Registration", file: "loopwise-incorporation.pdf", status: "reviewing" },
  { icon: Globe, name: "Business Website", file: "https://loopwise.ai", status: "approved" },
  { icon: Linkedin, name: "LinkedIn", file: "linkedin.com/in/sarahchen", status: "approved" },
  { icon: FileText, name: "Startup Registration", file: "startup-cert.pdf", status: "rejected" },
];
export default function VerificationPage() {
  const { user } = useAuth();
  const verified = user?.isVerified === true;
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const data = await resendVerification();
      setMessage({ type: "success", text: data?.message || "Verification email sent." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to resend verification email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verification Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track your review progress and manage submitted documents.</p>
      </div>

      {/* Status card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className={cn("grid h-12 w-12 place-items-center rounded-full", verified ? "bg-success/15" : "bg-warning/15")}>
            {verified ? <Check className="h-6 w-6 text-success" /> : <Clock className="h-6 w-6 text-warning" />}
          </div>
          <div>
            <p className="font-bold text-foreground">{verified ? "Email Verified" : "Pending Review"}</p>
            <p className="text-sm text-muted-foreground">
              {verified ? "Your email address is verified." : "Estimated review time: 24–48 hours"}
            </p>
          </div>
        </div>
        {verified ? (
          <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">Verified</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Resend verification email
          </button>
        )}
      </div>

      {message && (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            message.type === "success" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-bold text-foreground">Review Timeline</h2>
        <ol className="mt-5 space-y-0">
          {timeline.map((t, i) => (
            <li key={t.label} className="relative flex gap-4 pb-8 last:pb-0">
              {i < timeline.length - 1 && (
                <span className={cn("absolute top-8 left-[15px] h-full w-0.5", t.done ? "bg-success" : "bg-border")} />
              )}
              <div
                className={cn(
                  "z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2",
                  t.done && "border-success bg-success text-primary-foreground",
                  t.active && "border-warning bg-warning/15 text-warning",
                  !t.done && !t.active && "border-border bg-card text-muted-foreground"
                )}
              >
                {t.done ? <Check className="h-4 w-4" /> : t.active ? <Clock className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-border" />}
              </div>
              <div>
                <p className={cn("font-semibold", t.active ? "text-warning" : t.done ? "text-foreground" : "text-muted-foreground")}>{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Documents */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-bold text-foreground">Uploaded Documents</h2>
        <div className="mt-4 space-y-3">
          {documents.map((d) => (
            <div key={d.name} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft">
                <d.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.file}</p>
              </div>
              {d.status === "approved" && <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Approved</span>}
              {d.status === "reviewing" && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">Reviewing</span>}
              {d.status === "rejected" && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">Rejected</span>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                    <RefreshCw className="h-3 w-3" /> Re-upload
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
