import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { roleLabel } from "../../lib/mock-data";
const roleStyles = {
    entrepreneur: "bg-primary/10 text-primary",
    investor: "bg-accent text-accent-foreground",
    client: "bg-secondary text-secondary-foreground",
};
export function RoleBadge({ role, className }) {
    return (<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", roleStyles[role], className)}>
      {roleLabel[role]}
    </span>);
}
export function VerifiedBadge({ className }) {
    return (<span className={cn("inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success", className)}>
      <BadgeCheck className="h-3.5 w-3.5"/> Verified
    </span>);
}
export function TrustScoreBadge({ score, className }) {
    return (<span className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground", className)}>
      <ShieldCheck className="h-3.5 w-3.5 text-brand"/> {score}
    </span>);
}
export function InitialsAvatar({ name, src, size = "md", online }) {
    const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
    const letters = name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("");
    return (<div className="relative shrink-0">
      <div className={cn("grid place-items-center overflow-hidden rounded-full bg-brand-gradient font-semibold text-primary-foreground", sizes[size])}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : letters}
      </div>
      {online !== undefined && (<span className={cn("absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-card", online ? "bg-brand" : "bg-muted-foreground/50")}/>)}
    </div>);
}
