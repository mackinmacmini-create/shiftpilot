import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield, Users, FileText, Settings } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <nav className="border-b border-white/5 px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Admin</span>
        </div>
        <div className="flex gap-4">
          {[
            { href: "/admin", label: "Overview", icon: Shield },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/audit", label: "Audit", icon: FileText },
            { href: "/admin/config", label: "Config", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
        <Link href="/dashboard" className="ml-auto text-xs text-slate-600 hover:text-slate-400">
          Back to app
        </Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
