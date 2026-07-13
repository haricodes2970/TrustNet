import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
export function Logo({ className, light = false }) {
    return (<div className={cn("flex items-center gap-2", className)}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient">
        <ShieldCheck className="h-5 w-5 text-primary-foreground"/>
      </div>
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-sidebar-foreground" : "text-foreground")}>
        TrustNet
      </span>
    </div>);
}
