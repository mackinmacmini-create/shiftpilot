import { ShieldCheck } from "lucide-react";

/**
 * Persistent safety banner shown on every authenticated page footer.
 * Reminds users that ShiftPilot NEVER acts on any gig platform on their behalf.
 */
export function SafetyBanner() {
  return (
    <div className="border-t border-white/5 bg-[#0b0d10] px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
        <span>
          ShiftPilot never logs into, scrapes, or acts on your gig apps. You take all actions yourself.
        </span>
      </div>
    </div>
  );
}
