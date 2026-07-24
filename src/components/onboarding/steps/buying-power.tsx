import { Card } from "@/components/ui/card";
import { NavControls } from "../nav-controls";
import { TrendingUp, Shield, Wallet } from "lucide-react";
import type { BuyingPowerSummary } from "@/lib/onboarding/buying-power";

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function BuyingPowerRevealStep({
  summary,
  name,
  onBack,
  onNext,
}: {
  summary: BuyingPowerSummary | null;
  name: string;
  onBack: () => void;
  onNext: () => void;
}) {
  if (!summary) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Calculating your Buying Power…</div>
      </Card>
    );
  }

  const negative = summary.isNegative;

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Your first Buying Power view, {name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is what Cadence sees today, based on what you've set up so far. Everything is editable —
          this is a starting point, not a verdict.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cell icon={<Wallet className="h-5 w-5" />} label="Account balance" value={fmt(summary.currentBalance)} />
        <Cell icon={<Shield className="h-5 w-5 text-warning" />} label="Reserved" value={fmt(summary.reserved + summary.minimumBalance)} sub={`incl. ${fmt(summary.minimumBalance)} minimum`} />
        <Cell
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label="Buying Power"
          value={fmt(summary.buyingPower)}
          highlight={negative ? "danger" : "primary"}
        />
      </div>

      {negative ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          Your forecast dips below your safety minimum. That's useful information — Cadence will help you
          see exactly which day and why, and what you could adjust.
        </div>
      ) : (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          You have {fmt(summary.buyingPower)} in Buying Power. That's what's actually available to spend
          today without breaking your plan.
        </div>
      )}

      <NavControls onBack={onBack} onNext={onNext} nextLabel="Take me to my dashboard" />
    </Card>
  );
}

function Cell({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: "primary" | "danger";
}) {
  const cls =
    highlight === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : highlight === "primary"
      ? "border-primary/40 bg-primary/5"
      : "";
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      {icon}
      <div className="mt-2 text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}