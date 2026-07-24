import { Link } from "react-router-dom";
import { Logo } from "../../components/common/logo";
import { API_BASE_URL } from "../../services/api";
export function AuthShell({ title, subtitle, children, footer }) {
    return (<div className="bg-hero-gradient flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8">
        <Logo light/>
      </Link>
      <div className="animate-scale-in w-full max-w-md rounded-2xl bg-card p-8 shadow-elevated">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-primary-foreground/80">{footer}</div>}
    </div>);
}
export function SocialButtons() {
    return (<div className="space-y-2.5">
      <a href={`${API_BASE_URL}/auth/google`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continue with Google
      </a>
      <a href={`${API_BASE_URL}/auth/linkedin`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>
        </svg>
        Continue with LinkedIn
      </a>
    </div>);
}
export function OrDivider() {
    return (<div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border"/>
      <span className="text-xs font-medium text-muted-foreground uppercase">or</span>
      <div className="h-px flex-1 bg-border"/>
    </div>);
}
