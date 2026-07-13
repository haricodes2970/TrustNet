import { Search } from "lucide-react";
import { cn } from "../lib/utils";
export default function MessagesPage() {
    return (<div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl gap-0 p-4 sm:p-6">
      <div className={cn("flex w-full flex-col rounded-l-2xl border border-border bg-card md:w-80", "max-md:rounded-2xl")}>
        <div className="border-b border-border p-4">
          <h1 className="font-bold text-foreground">Messages</h1>
          <div className="relative mt-3">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <input placeholder="Search messages…" className="w-full rounded-xl border border-border bg-input py-2 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"/>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-foreground">No conversations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Real messages will appear here once the backend is connected.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col rounded-r-2xl border border-l-0 border-border bg-background md:flex">
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <p className="text-lg font-semibold text-foreground">Your inbox is empty</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Conversations and message history will load here when the backend is ready.
            </p>
          </div>
        </div>
      </div>
    </div>);
}
