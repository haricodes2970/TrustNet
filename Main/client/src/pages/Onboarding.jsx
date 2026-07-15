import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Briefcase, Building2, Check, CheckCircle2, FileText, Globe, IdCard, Linkedin, Rocket, TrendingUp, UploadCloud, } from "lucide-react";
import { cn } from "../lib/utils";
import { Logo } from "../components/common/logo";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
const steps = ["Create Account", "Verify Email", "Choose Role", "Profile Setup", "Verification Upload", "Finish"];
export default function OnboardingPage() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [step, setStep] = useState(2); // Account + email already done
    const [role, setRole] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const handleRoleContinue = async () => {
        if (!role) return;
        setSaving(true);
        setSaveError("");
        try {
            const res = await api.put("/v1/profile", { role });
            setUser((u) => (u ? { ...u, role: res.data?.data?.role ?? role } : u));
            setStep(3);
        } catch (err) {
            setSaveError(err?.response?.data?.message || "Couldn't save your role. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        setSaving(true);
        setSaveError("");
        try {
            await api.put("/v1/profile", { onboardingCompleted: true });
            setUser((u) => (u ? { ...u, onboardingCompleted: true } : u));
        } catch (err) {
            // Even if this last save fails, don't trap the user on this screen —
            // they've already picked a role, which is the part that matters most.
        } finally {
            setSaving(false);
            navigate("/dashboard");
        }
    };

    return (<div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <ol className="flex items-center">
          {steps.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (<li key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                <div className="flex flex-col items-center">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-semibold transition-colors", done && "border-success bg-success text-primary-foreground", current && "border-brand bg-brand-soft text-primary shadow-glow", !done && !current && "border-border bg-card text-muted-foreground")}>
                    {done ? <Check className="h-4.5 w-4.5"/> : i + 1}
                  </div>
                  <span className={cn("mt-2 hidden text-[11px] font-medium whitespace-nowrap sm:block", current ? "text-primary" : done ? "text-success" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (<div className={cn("mx-2 mb-0 h-0.5 flex-1 sm:mb-6", i < step ? "bg-success" : "bg-border")}/>)}
              </li>);
        })}
        </ol>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {saveError && (<p className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{saveError}</p>)}
        {step === 2 && <RoleStep role={role} setRole={setRole} onNext={handleRoleContinue} saving={saving}/>}
        {step === 3 && <ProfileStep role={role ?? "entrepreneur"} onBack={() => setStep(2)} onNext={() => setStep(4)}/>}
        {step === 4 && <UploadStep onBack={() => setStep(3)} onNext={() => setStep(5)}/>}
        {step === 5 && <FinishStep onDone={handleFinish} saving={saving}/>}
      </main>
    </div>);
}
/* ---------- Step 3: Role ---------- */
const roles = [
    { id: "entrepreneur", icon: Rocket, title: "Entrepreneur", text: "Raise funding, find co-founders, and win clients for your startup." },
    { id: "investor", icon: TrendingUp, title: "Investor", text: "Discover verified, high-quality startups matching your thesis." },
    { id: "client", icon: Briefcase, title: "Client", text: "Find trusted startups and vendors to solve your business needs." },
];
function RoleStep({ role, setRole, onNext, saving }) {
    return (<div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">How will you use TrustNet?</h1>
      <p className="mt-2 text-muted-foreground">Choose your role — this personalizes your entire experience.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {roles.map((r) => (<button key={r.id} onClick={() => setRole(r.id)} className={cn("hover-lift rounded-2xl border-2 bg-card p-6 text-left transition-all", role === r.id ? "border-brand shadow-glow" : "border-border shadow-card")}>
            <div className={cn("grid h-12 w-12 place-items-center rounded-xl", role === r.id ? "bg-brand-gradient" : "bg-brand-soft")}>
              <r.icon className={cn("h-6 w-6", role === r.id ? "text-primary-foreground" : "text-primary")}/>
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">{r.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
            {role === r.id && (<span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4"/> Selected
              </span>)}
          </button>))}
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={onNext} disabled={!role || saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4"/>
        </button>
      </div>
    </div>);
}
/* ---------- Step 4: Profile ---------- */
function Input({ label, placeholder, type = "text" }) {
    return (<div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"/>
    </div>);
}
function SelectInput({ label, options }) {
    return (<div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <select className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40">
        {options.map((o) => (<option key={o}>{o}</option>))}
      </select>
    </div>);
}
function TextArea({ label, placeholder }) {
    return (<div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <textarea rows={3} placeholder={placeholder} className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"/>
    </div>);
}
function PhotoUpload() {
    return (<div className="flex items-center gap-4 sm:col-span-2">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-lg font-bold text-primary">SC</div>
      <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
        Upload Photo
      </button>
    </div>);
}
function ProfileStep({ role, onBack, onNext }) {
    return (<div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Complete your profile</h1>
      <p className="mt-2 text-muted-foreground">Tell the network who you are. Verified, complete profiles get 4× more connections.</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {role === "entrepreneur" && (<>
              <PhotoUpload />
              <Input label="Full Name" placeholder="Sarah Chen"/>
              <Input label="Startup Name" placeholder="Loopwise AI"/>
              <SelectInput label="Industry" options={["SaaS", "Fintech", "HealthTech", "Climate", "E-commerce", "AI / ML", "Other"]}/>
              <SelectInput label="Startup Stage" options={["Idea", "MVP", "Revenue", "Growth", "Scale"]}/>
              <Input label="Founded Year" placeholder="2024"/>
              <SelectInput label="Company Size" options={["1–5", "6–20", "21–50", "51–200", "200+"]}/>
              <Input label="Website" placeholder="https://loopwise.ai"/>
              <Input label="LinkedIn" placeholder="linkedin.com/in/sarahchen"/>
              <Input label="Location" placeholder="San Francisco, CA"/>
              <SelectInput label="Looking For" options={["Funding", "Clients", "Co-founder", "Employees"]}/>
              <Input label="Skills" placeholder="Product, ML, Fundraising"/>
              <Input label="Interests" placeholder="B2B SaaS, Applied AI"/>
              <TextArea label="Bio" placeholder="Building AI-powered workflow automation for finance teams…"/>
            </>)}
          {role === "investor" && (<>
              <PhotoUpload />
              <Input label="Full Name" placeholder="Marcus Webb"/>
              <Input label="Firm Name" placeholder="Northlane Ventures"/>
              <SelectInput label="Investment Type" options={["Angel", "VC", "Corporate"]}/>
              <SelectInput label="Investment Range" options={["$25k–100k", "$100k–500k", "$500k–1M", "$1M–5M", "$5M+"]}/>
              <Input label="Preferred Industries" placeholder="Fintech, SaaS, AI"/>
              <Input label="Location" placeholder="New York, NY"/>
              <Input label="Website" placeholder="https://northlane.vc"/>
              <Input label="LinkedIn" placeholder="linkedin.com/in/marcuswebb"/>
              <TextArea label="Bio" placeholder="Early-stage investor focused on B2B software…"/>
            </>)}
          {role === "client" && (<>
              <Input label="Company Name" placeholder="Meridian Retail Group"/>
              <SelectInput label="Industry" options={["Retail", "Logistics", "Finance", "Healthcare", "Manufacturing", "Other"]}/>
              <Input label="Location" placeholder="Miami, FL"/>
              <Input label="Business Email" placeholder="ops@meridianretail.com" type="email"/>
              <Input label="Website" placeholder="https://meridianretail.com"/>
              <SelectInput label="Budget" options={["Under $10k", "$10k–50k", "$50k–250k", "$250k+"]}/>
              <TextArea label="Requirements" placeholder="Looking for a logistics automation partner…"/>
              <TextArea label="Bio" placeholder="Multi-brand retail group operating across 40 locations…"/>
            </>)}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4"/> Back
        </button>
        <button onClick={onNext} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
          Continue <ArrowRight className="h-4 w-4"/>
        </button>
      </div>
    </div>);
}
/* ---------- Step 5: Verification Upload ---------- */
const docs = [
    { id: "gov", icon: IdCard, title: "Government ID", text: "Passport, driver's license, or national ID" },
    { id: "reg", icon: Building2, title: "Company Registration", text: "Certificate of incorporation or equivalent" },
    { id: "web", icon: Globe, title: "Business Website", text: "Link to your official company website" },
    { id: "li", icon: Linkedin, title: "LinkedIn", text: "Your public LinkedIn profile URL" },
    { id: "startup", icon: FileText, title: "Startup Registration", text: "Startup registration documents, if applicable" },
];
function UploadStep({ onBack, onNext }) {
    const [uploaded, setUploaded] = useState({});
    const [fileNames, setFileNames] = useState({});
    const [notRegistered, setNotRegistered] = useState(false);
    const fileInputs = useRef({});

    const simulateUpload = (id, file) => {
        setFileNames((n) => ({ ...n, [id]: file.name }));
        setUploaded((u) => ({ ...u, [id]: 0 }));
        let p = 0;
        const timer = setInterval(() => {
            p += 20;
            setUploaded((u) => ({ ...u, [id]: Math.min(p, 100) }));
            if (p >= 100)
                clearInterval(timer);
        }, 180);
    };

    const handleFileChosen = (id, e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file later
        if (file) simulateUpload(id, file);
    };

    return (<div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Verify your identity</h1>
      <p className="mt-2 text-muted-foreground">Upload documents so we can verify you. This keeps TrustNet trusted for everyone.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {docs.map((d) => {
            const progress = uploaded[d.id];
            const disabled = d.id === "startup" && notRegistered;
            return (<div key={d.id} className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", disabled && "opacity-50")}>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft">
                  <d.icon className="h-5 w-5 text-primary"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.text}</p>
                </div>
                {progress === 100 && <CheckCircle2 className="h-5 w-5 shrink-0 text-success"/>}
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={(el) => { fileInputs.current[d.id] = el; }}
                onChange={(e) => handleFileChosen(d.id, e)}
                className="hidden"
              />
              {progress !== undefined && progress < 100 ? (<div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }}/>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Uploading {fileNames[d.id]}… {progress}%</p>
                </div>) : progress === 100 ? (<p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-success">{fileNames[d.id] || "document"} uploaded</p>) : (<button type="button" onClick={() => !disabled && fileInputs.current[d.id]?.click()} disabled={disabled} className="mt-4 flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-primary disabled:cursor-not-allowed">
                  <UploadCloud className="h-5 w-5"/>
                  Drag &amp; drop or click to upload
                </button>)}
            </div>);
        })}
      </div>

      <label className="mt-5 flex items-center gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" checked={notRegistered} onChange={(e) => setNotRegistered(e.target.checked)} className="h-4 w-4 rounded border-border accent-primary"/>
        My startup is not registered yet
      </label>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4"/> Back
        </button>
        <button onClick={onNext} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
          Submit for Review <ArrowRight className="h-4 w-4"/>
        </button>
      </div>
    </div>);
}
/* ---------- Step 6: Finish ---------- */
function FinishStep({ onDone, saving }) {
    return (<div className="animate-scale-in mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-elevated">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-soft">
        <CheckCircle2 className="animate-scale-in h-11 w-11 text-success"/>
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Verification Submitted</h1>
      <div className="mt-6 space-y-3 rounded-xl bg-muted p-5 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">Pending Review</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Time</span>
          <span className="font-semibold text-foreground">24–48 Hours</span>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        You can explore TrustNet while we review your documents. Some features unlock after approval.
      </p>
      <button onClick={onDone} disabled={saving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Finishing…" : "Go To Dashboard"} <ArrowRight className="h-4 w-4"/>
      </button>
    </div>);
}
