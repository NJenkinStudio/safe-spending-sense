import { Card } from "@/components/ui/card";
import { NavControls } from "../nav-controls";
import { TrendingUp, Shield, Wallet } from "lucide-react";
import type { BuyingPowerSummary } from "@/lib/onboarding/buying-power";

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export interface OnboardingPlanningGoal {
  name: string;
  target_amount: number | string;
  amount_already_saved: number | string | null;
}

export function BuyingPowerRevealStep({
  summary,
  name,
  planningGoal,
  onBack,
  onNext,
}: {
  summary: BuyingPowerSummary | null;
  name: string;
  planningGoal?: OnboardingPlanningGoal | null;
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

  const goalBlock = (() => {
    if (!planningGoal) return null;
    const target = Number(planningGoal.target_amount) || 0;
    const saved = Number(planningGoal.amount_already_saved ?? 0) || 0;
    const remaining = Math.max(0, target - saved);
    const contribution = 100;
    const progressBefore = target > 0 ? Math.min(1, saved / target) : 0;
    const progressAfter = target > 0 ? Math.min(1, (saved + contribution) / target) : 0;
    return { target, saved, remaining, contribution, progressBefore, progressAfter };
  })();

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

      {planningGoal && goalBlock && (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Planning goal</div>
            <div className="text-lg font-semibold mt-1">{planningGoal.name}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Target</div>
              <div className="font-medium">{fmt(goalBlock.target)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Already saved</div>
              <div className="font-medium">{fmt(goalBlock.saved)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="font-medium">{fmt(goalBlock.remaining)}</div>
            </div>
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="font-medium">If you put {fmt(goalBlock.contribution)} toward this goal today</div>
            <ul className="mt-1 text-muted-foreground space-y-0.5">
              <li>
                Buying Power: {fmt(summary.buyingPower)} → {fmt(summary.buyingPower - goalBlock.contribution)}
              </li>
              <li>
                Goal progress: {(goalBlock.progressBefore * 100).toFixed(1)}% → {(goalBlock.progressAfter * 100).toFixed(1)}%
                {" "}({fmt(goalBlock.saved)} → {fmt(goalBlock.saved + goalBlock.contribution)} of {fmt(goalBlock.target)})
              </li>
            </ul>
          </div>
        </div>
      )}

      <NavControls onBack={onBack} onNext={onNext} nextLabel="Take me to my dashboard" busy={false} />
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