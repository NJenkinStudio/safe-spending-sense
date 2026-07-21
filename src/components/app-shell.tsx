import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, ArrowLeftRight, Receipt, LineChart, CalendarDays, Settings, LogOut, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/forecast", label: "Forecast", icon: LineChart },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/income", label: "Income & Transfers", icon: ArrowLeftRight },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex md:w-60 flex-col border-r border-border bg-sidebar p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">Cadence</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Forward finance</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {nav.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start text-muted-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-sidebar">
          <div className="font-semibold">Cadence</div>
          <div className="flex gap-1 overflow-x-auto">
            {nav.slice(0, 5).map((n) => (
              <Link key={n.to} to={n.to} className="text-xs px-2 py-1 rounded text-muted-foreground">
                {n.label.split(" ")[0]}
              </Link>
            ))}
          </div>
        </div>
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}