import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CalendarDays, LineChart, Shield, Sprout } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadence — Forecast your cash flow" },
      {
        name: "description",
        content:
          "See your future balances, catch underfunded weeks early, and decide safely if you can afford a purchase — on real calendar dates.",
      },
      { property: "og:title", content: "Cadence — Forecast your cash flow" },
      {
        property: "og:description",
        content:
          "A forward-looking personal finance tool built on calendar dates, recurring rules, and safety constraints.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Sprout className="h-4 w-4" />
          </div>
          <span className="font-semibold">Cadence</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </header>
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Cadence doesn't tell you no. Cadence gives you a rhythm that keeps your money on your time.
          </p>
          <h1 className="mt-3 text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
            Know what your balance will look like <span className="text-primary">on any future date.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Cadence models your income, transfers, and bills as recurring rules on real calendar dates — then quietly
            tells you whether you can safely afford what's next.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth">
              <Button size="lg">Get started</Button>
            </Link>
          </div>
        </div>
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: LineChart,
              title: "12-month projection",
              body: "See account balances day by day. Catch the underfunded week before it happens.",
            },
            {
              icon: CalendarDays,
              title: "Real dates, not categories",
              body: "Weekly paychecks, biweekly financed items, first-of-month deposits — all modeled on the calendar.",
            },
            {
              icon: Shield,
              title: "Safety-first decisions",
              body: "Set minimum balances and know when a purchase is safe — or when to wait.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
