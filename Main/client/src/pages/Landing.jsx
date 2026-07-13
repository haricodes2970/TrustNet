import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Handshake, LineChart, Lock, MessageSquare, ShieldCheck, Users, } from "lucide-react";
import heroImage from "../assets/hero-network.jpg";
import { Logo } from "../components/common/logo";
const stats = [
    { value: "12,000+", label: "Verified Entrepreneurs" },
    { value: "3,900+", label: "Successful Collaborations" },
    { value: "48,000+", label: "Business Connections" },
];
const features = [
    {
        icon: BadgeCheck,
        title: "Verified Identities",
        text: "Every member passes identity and business verification before joining.",
    },
    {
        icon: Lock,
        title: "Secure Messaging",
        text: "Private, encrypted conversations built for sensitive business discussions.",
    },
    {
        icon: Handshake,
        title: "Real Collaborations",
        text: "Match with investors, co-founders, and clients — not followers.",
    },
    {
        icon: LineChart,
        title: "Trust Score",
        text: "A transparent reputation system that rewards credibility and delivery.",
    },
];
export default function Landing() {
    return (<div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left */}
        <div className="bg-hero-gradient relative flex flex-col overflow-hidden px-6 py-8 sm:px-12 lg:px-16">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}/>
          <header className="relative flex items-center justify-between">
            <Logo light/>
            {/* <Link
          to="/login"
          className="rounded-xl border border-primary-foreground/25 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
        >
          Login
        </Link> */}
          </header>

          <div className="relative flex flex-1 flex-col justify-center py-16">
            <span className="animate-fade-in inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <ShieldCheck className="h-3.5 w-3.5"/> Verified-only professional network
            </span>
            <h1 className="animate-fade-in delay-100 mt-5 max-w-xl text-4xl leading-[1.1] font-extrabold tracking-tight text-primary-foreground sm:text-5xl lg:text-[3.4rem]">
              Where verified entrepreneurs build real collaborations.
            </h1>
            <p className="animate-fade-in delay-200 mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
              TrustNet replaces noisy social feeds with verified identities, secure messaging,
              startup communities, and meaningful business collaborations.
            </p>
            <div className="animate-fade-in delay-300 mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-deep shadow-glow transition-transform hover:scale-[1.03]">
                Get Started <ArrowRight className="h-4 w-4"/>
              </Link>
              <Link to="/login" className="inline-flex items-center rounded-xl border border-primary-foreground/25 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10">
                Login
              </Link>
            </div>

            <div className="mt-14 grid max-w-lg grid-cols-3 gap-6">
              {stats.map((s) => (<div key={s.label}>
                  <p className="text-2xl font-extrabold text-primary-foreground sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-primary-foreground/60 sm:text-sm">
                    {s.label}
                  </p>
                </div>))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="relative hidden items-center justify-center overflow-hidden bg-brand-mid lg:flex">
          <img src={heroImage} alt="Entrepreneurs and investors networking on TrustNet" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover opacity-90"/>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/35 via-transparent to-brand-deep/10"/>

          {/* Floating cards */}
          <div className="animate-float absolute top-16 right-12 w-64 rounded-2xl bg-card/95 p-4 shadow-elevated backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-primary-foreground">
                MW
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                  Marcus Webb <BadgeCheck className="h-4 w-4 shrink-0 text-brand"/>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Partner · Northlane Ventures
                </p>
              </div>
            </div>
            <button className="mt-3 w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground">
              Connect
            </button>
          </div>

          <div className="animate-float absolute bottom-32 left-10 w-60 rounded-2xl bg-card/95 p-4 shadow-elevated backdrop-blur [animation-delay:1.5s]">
            <div className="flex items-center gap-2 text-xs font-semibold text-success">
              <Handshake className="h-4 w-4"/> Collaboration accepted
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Loopwise AI × Horizon Growth Fund
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Series A · $4M raised</p>
          </div>

          <div className="animate-float absolute right-20 bottom-14 flex items-center gap-2.5 rounded-2xl bg-card/95 px-4 py-3 shadow-elevated backdrop-blur [animation-delay:2.6s]">
            <MessageSquare className="h-4 w-4 text-brand"/>
            <p className="text-xs font-medium text-foreground">3 new investor messages</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Built on trust, not noise
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to find investors, clients, and collaborators — with verification at
            the core.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (<div key={f.title} className="hover-lift rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft">
                <f.icon className="h-5.5 w-5.5 text-primary"/>
              </div>
              <h3 className="mt-4 font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="bg-hero-gradient mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-3xl px-8 py-16 text-center">
          <Users className="h-10 w-10 text-brand"/>
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight text-primary-foreground">
            Join 12,000+ verified founders and investors
          </h2>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-brand-deep shadow-glow transition-transform hover:scale-[1.03]">
            Create your account <ArrowRight className="h-4 w-4"/>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © 2026 TrustNet. Verified networking for builders.
          </p>
        </div>
      </footer>
    </div>);
}
