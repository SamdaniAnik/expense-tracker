import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import QuickAddFab from "@/components/QuickAddFab";
import { getProfile } from "@/lib/profiles";
import { adminEmails } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (profile?.banned) {
    redirect("/login");
  }
  const isAdmin =
    profile?.role === "admin" ||
    adminEmails().includes((profile?.email ?? "").toLowerCase());

  return (
    <div className="min-h-dvh lg:flex">
      <SideNav isAdmin={isAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className="app-main mx-auto w-full max-w-6xl flex-1 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10"
          style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
        <QuickAddFab />
        <BottomNav />
      </div>
    </div>
  );
}
