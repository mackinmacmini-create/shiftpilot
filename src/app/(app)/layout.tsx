import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { SafetyBanner } from "@/components/SafetyBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0d10]">
      <main className="flex-1 page-content">
        {children}
      </main>
      <SafetyBanner />
      <BottomNav />
    </div>
  );
}
