import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shield, Bell, BarChart3, CalendarDays } from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="text-lg font-bold tracking-tight text-teal-400">ShiftPilot</span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-300 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs text-teal-400">
          <Shield className="h-3.5 w-3.5" />
          No platform passwords. No auto-grabbing. Ever.
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Plan your gig-driver day without giving any app your password.
        </h1>
        <p className="mt-6 text-lg text-slate-400 leading-relaxed">
          ShiftPilot is your personal shift calendar, opportunity journal, and earnings tracker. You stay in control — ShiftPilot helps you plan.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-xl bg-teal-400 px-8 py-3 text-base font-semibold text-slate-900 hover:bg-teal-300 transition-colors"
          >
            Start planning for free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/10 px-8 py-3 text-base text-slate-300 hover:bg-white/5 transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-2xl px-6 pb-10">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-300/80 leading-relaxed">
          <strong className="text-amber-300">Important:</strong> ShiftPilot is a personal planning tool. It does not connect to, log into, or act on Amazon Flex, Uber Eats, DoorDash, Instacart, or any other gig platform on your behalf. You take all actions on those platforms yourself. ShiftPilot only stores what you manually enter.
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-8 text-center">
          What ShiftPilot does
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: CalendarDays,
              title: "Availability calendar",
              desc: "Mark the windows when you want to work. Set recurring patterns for weekday mornings, weekends, or custom schedules.",
            },
            {
              icon: Bell,
              title: "Timely reminders",
              desc: 'Get a notification when a window you marked is coming up. ShiftPilot says "time to check your app" — you do the rest.',
            },
            {
              icon: BarChart3,
              title: "Earnings tracking",
              desc: "Log what you earned, where, and when. See weekly trends and identify your best stations and time slots.",
            },
            {
              icon: Shield,
              title: "Opportunity journal",
              desc: "Record blocks you grabbed, passed, or missed. Analyze patterns to make better decisions next time.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/5 bg-[#13171c] p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10">
                <Icon className="h-5 w-5 text-teal-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-slate-600">
        ShiftPilot does not affiliate with, endorse, or integrate with any gig platform.
        Amazon Flex, Uber, DoorDash, and Instacart are trademarks of their respective owners.
      </footer>
    </div>
  );
}
