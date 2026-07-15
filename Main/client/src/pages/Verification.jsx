import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Clock, FileText, Globe, IdCard, Linkedin, Loader2, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { resendVerification, getVerification, uploadVerificationDocument, submitVerification } from "../services/verification";

const documentDefinitions = [
  { type: "government_id", icon: IdCard, name: "Government ID", required: true },
  { type: "company_registration", icon: Building2, name: "Company Registration", required: true },
  { type: "business_website", icon: Globe, name: "Business Website", required: true },
  { type: "linkedin", icon: Linkedin, name: "LinkedIn", required: true },
  { type: "startup_registration", icon: FileText, name: "Startup Registration", required: false },
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Pending";
}

export default function VerificationPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [verification, setVerification] = useState({ status: "draft", documents: [] });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [message, setMessage] = useState(null);
  const fileInputs = useRef({});

  useEffect(() => {
    let active = true;
    getVerification()
      .then((data) => {
        if (!active) return;
        setVerification(data);
        setUser((user) => (user ? { ...user, verificationStatus: data.status } : user));
      })
      .catch((err) => active && setMessage({ type: "error", text: err?.response?.data?.message || "Failed to load verification status." }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [setUser]);

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const data = await resendVerification();
      setMessage({ type: "success", text: data?.message || "Verification email sent." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to resend verification email." });
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (type, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingType(type);
    setMessage(null);
    try {
      const data = await uploadVerificationDocument(type, file);
      setVerification(data);
      setUser((user) => (user ? { ...user, verificationStatus: data.status } : user));
      setMessage({ type: "success", text: "Document uploaded. Submit when all required documents are ready." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to upload document." });
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit your documents for verification? You will not be able to edit them while they are under review.")) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const data = await submitVerification();
      setVerification(data);
      setUser((user) => (user ? { ...user, verificationStatus: data.status } : user));
      navigate("/verification-in-progress", { replace: true });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to submit verification." });
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = verification.status === "approved";
  const isPending = verification.status === "pending";
  const isRejected = verification.status === "rejected";
  const canEdit = !isPending && !isApproved;
  const requiredDocumentsUploaded = documentDefinitions.filter((document) => document.required).every((definition) => verification.documents.some((document) => document.type === definition.type));
  const rejectionReason = verification.documents.find((document) => document.status === "rejected")?.rejectionReason;
  const timeline = [
    { label: "Submitted", done: verification.status !== "draft", time: formatDate(verification.submittedAt) },
    { label: "Reviewing", done: isApproved, active: isPending, time: isPending ? "In progress" : "Pending" },
    { label: "Approved", done: isApproved, time: isApproved ? formatDate(verification.reviewedAt) : "Pending" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verification Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload your documents, then submit them together for review.</p>
      </div>
      {!isApproved && <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm font-medium text-warning">Account verification is required before you can access the TrustNet dashboard.</p>}
      {isRejected && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{rejectionReason || "Your verification was rejected. Re-upload the required document and submit again."}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className={cn("grid h-12 w-12 place-items-center rounded-full", isApproved ? "bg-success/15" : isRejected ? "bg-destructive/10" : "bg-warning/15")}>
            {isApproved ? <Check className="h-6 w-6 text-success" /> : <Clock className={cn("h-6 w-6", isRejected ? "text-destructive" : "text-warning")} />}
          </div>
          <div><p className="font-bold text-foreground">{isApproved ? "Approved" : isRejected ? "Action required" : isPending ? "Pending Review" : "Documents in progress"}</p><p className="text-sm text-muted-foreground">{isApproved ? "Your documents have been approved." : isRejected ? "Update the rejected document, then submit again." : isPending ? "Estimated review time: 24–48 hours" : "Upload all required documents before submitting."}</p></div>
        </div>
        <button type="button" onClick={handleResend} disabled={sending} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Resend verification email</button>
      </div>

      {message && <p className={cn("rounded-lg px-3 py-2 text-sm font-medium", message.type === "success" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>{message.text}</p>}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card"><h2 className="font-bold text-foreground">Review Timeline</h2><ol className="mt-5 space-y-0">{timeline.map((item, index) => <li key={item.label} className="relative flex gap-4 pb-8 last:pb-0">{index < timeline.length - 1 && <span className={cn("absolute top-8 left-[15px] h-full w-0.5", item.done ? "bg-success" : "bg-border")} />}<div className={cn("z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2", item.done && "border-success bg-success text-primary-foreground", item.active && "border-warning bg-warning/15 text-warning", !item.done && !item.active && "border-border bg-card text-muted-foreground")}>{item.done ? <Check className="h-4 w-4" /> : item.active ? <Clock className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-border" />}</div><div><p className={cn("font-semibold", item.active ? "text-warning" : item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</p><p className="text-xs text-muted-foreground">{item.time}</p></div></li>)}</ol></div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card"><h2 className="font-bold text-foreground">Uploaded Documents</h2><p className="mt-1 text-xs text-muted-foreground">Startup Registration is optional. All other documents are required.</p><div className="mt-4 space-y-3">{documentDefinitions.map((definition) => {
        const document = verification.documents.find((item) => item.type === definition.type);
        const isUploading = uploadingType === definition.type;
        return <div key={definition.type} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft"><definition.icon className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{definition.name}{definition.required && <span className="text-destructive"> *</span>}</p><p className="truncate text-xs text-muted-foreground">{document?.name || "Not uploaded"}</p></div>{document?.status === "draft" && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-primary">Uploaded</span>}{document?.status === "pending" && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">Reviewing</span>}{document?.status === "approved" && <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">Approved</span>}{document?.status === "rejected" && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">Rejected</span>}<input ref={(element) => { fileInputs.current[definition.type] = element; }} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => handleFileChange(definition.type, event)} className="hidden" /><button type="button" onClick={() => fileInputs.current[definition.type]?.click()} disabled={!canEdit || loading || isUploading} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60">{isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}{document ? "Re-upload" : "Upload"}</button></div>;
      })}</div><button type="button" onClick={handleSubmit} disabled={!canEdit || !requiredDocumentsUploaded || submitting || loading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Submitting…" : "Submit for Verification"}</button>{!requiredDocumentsUploaded && canEdit && <p className="mt-2 text-xs text-muted-foreground">Upload all required documents to enable submission.</p>}</div>
    </div>
  );
}
