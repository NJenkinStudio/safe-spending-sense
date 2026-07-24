import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Wallet, Shield, TrendingUp } from "lucide-react";

export function WhatIsCadenceStep({
  name,
  onBegin,
  onExplore,
  onBack,
  busy,
}: {
  name: string;
  onBegin: () => void;
  onExplore: () => void;
  onBack: () => void;
  busy?: boolean;
}) {
  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Welcome, {name}. Here's what Cadence does.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A bank balance tells you how much money is currently in an account. Cadence tells you how much
          of it you can actually spend after protecting upcoming bills, transfers, and goals.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Account balance</div>
          <p className="text-xs text-muted-foreground mt-1">What the bank shows you today.</p>
        </div>
        <div className="rounded-lg border p-4">
          <Shield className="h-5 w-5 text-warning" />
          <div className="mt-2 text-sm font-medium">Reserved money</div>
          <p className="text-xs text-muted-foreground mt-1">Already assigned to future bills, transfers, and minimums.</p>
        </div>
        <div className="rounded-lg border p-4 bg-primary/5 border-primary/40">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div className="mt-2 text-sm font-medium">Buying Power</div>
          <p className="text-xs text-muted-foreground mt-1">What's actually available to spend today.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Buying Power is not the same as your account balance — it's what remains after your plan is considered.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={onBegin} className="flex-1" disabled={busy}>
          Begin building my Cadence
        </Button>
        <Button variant="outline" onClick={onExplore} className="flex-1" disabled={busy}>
          <Sparkles className="h-4 w-4 mr-2" />
          {busy ? "Loading demo…" : "Explore first with sample data"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Exploring loads a labeled sample workspace. You can remove it from Settings anytime — it's kept
        separate from any real accounts you add.
      </p>
      <div>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onBack}>
          ← Back
        </button>
      </div>
    </Card>
  );
}