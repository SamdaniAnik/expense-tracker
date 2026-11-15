import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop web: side navigation */}
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className="app-main mx-auto w-full max-w-6xl flex-1 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10"
          style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
        {/* Mobile app: bottom tab bar (hidden on large screens via CSS) */}
        <BottomNav />
      </div>
    </div>
  );
}
