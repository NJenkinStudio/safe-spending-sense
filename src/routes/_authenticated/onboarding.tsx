import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAccounts } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Sparkles, Wallet, TrendingUp, Receipt, ArrowRight, SkipForward } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Cadence" },
      { name: "description", content: "Set up Cadence in a few short steps: add an account, income, and a bill." },
    ],
  }),
  component: Onboarding,
});

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { label: "Welcome", icon: Sparkles },
  { label: "Account", icon: Wallet },
  { label: "Income", icon: TrendingUp },
  { label: "Bill", icon: Receipt },
  { label: "Done", icon: Check },
];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [acct, setAcct] = useState({
    name: "Main checking",
    account_type: "checking",
    current_balance: "",
    minimum_balance: "0",
    color: "#7A9A7E",
  });

  const [income, setIncome] = useState({
    name: "Paycheck",
    amount: "",
    frequency: "biweekly",
    start_date: today,
  });

  const [bill, setBill] = useState({
    name: "Rent",
    amount: "",
    day_of_month: "1",
    start_date: today,
  });

  const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const loadDemo = async () => {
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      await seedDemoData(id);
      await qc.invalidateQueries();
      toast.success("Demo data loaded");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load demo");
    } finally {
      setBusy(false);
    }
  };

  const saveAccount = async () => {
    if (!acct.name.trim()) return toast.error("Give the account a name");
    if (acct.current_balance === "" || isNaN(Number(acct.current_balance)))
      return toast.error("Enter a current balance");
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: id,
          name: acct.name.trim(),
          account_type: acct.account_type,
          current_balance: Number(acct.current_balance),
          minimum_balance: Number(acct.minimum_balance || 0),
          color: acct.color,
          balance_as_of: today,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      setAccountId((data as { id: string }).id);
      await qc.invalidateQueries({ queryKey: ["accounts"] });
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save account");
    } finally {
      setBusy(false);
    }
  };

  const saveIncome = async () => {
    if (!accountId) return setStep(2);
    if (!income.amount || Number(income.amount) <= 0) return toast.error("Enter an amount above zero");
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase.from("financial_rules").insert({
        user_id: id,
        rule_type: "income",
        name: income.name.trim() || "Paycheck",
        destination_account_id: accountId,
        amount: Number(income.amount),
        frequency: income.frequency,
        start_date: income.start_date,
        essential: true,
        fixed_or_variable: "fixed",
        active: true,
        confidence_level: "confirmed",
      } as never);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["rules"] });
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save income");
    } finally {
      setBusy(false);
    }
  };

  const saveBill = async () => {
    if (!accountId) return setStep(3);
    if (!bill.amount || Number(bill.amount) <= 0) return toast.error("Enter an amount above zero");
    const dom = Number(bill.day_of_month);
    if (!Number.isInteger(dom) || dom < 1 || dom > 31) return toast.error("Day of month must be 1–31");
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase.from("financial_rules").insert({
        user_id: id,
        rule_type: "expense",
        name: bill.name.trim() || "Bill",
        source_account_id: accountId,
        amount: Number(bill.amount),
        frequency: "monthly",
        day_of_month: dom,
        start_date: bill.start_date,
        essential: true,
        fixed_or_variable: "fixed",
        active: true,
        confidence_level: "confirmed",
      } as never);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["rules"] });
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save bill");
    } finally {
      setBusy(false);
    }
  };

  // If user already has accounts and hits /onboarding directly, keep them here (they may want to skip).
  useEffect(() => {
    if (step === 0 && accountId === null && (accountsQ.data?.length ?? 0) > 0 && !accountsQ.isLoading) {
      // pre-select their first account so income/bill steps still work if they advance
      setAccountId(accountsQ.data![0].id);
    }
  }, [accountsQ.data, accountsQ.isLoading, step, accountId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper current={step} />

      {step === 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Cadence</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              In under two minutes we'll add your first account, one income, and one bill. You can add
              more anytime — this is just enough to make the forecast useful.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setStep(1)} className="flex-1">
              Set up my accounts <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={loadDemo} disabled={busy} className="flex-1">
              <Sparkles className="h-4 w-4 mr-2" />
              {busy ? "Loading demo…" : "Try demo data"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Demo data adds two example accounts with realistic income, bills, and payoffs so you can
            explore before entering your own numbers.
          </p>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Add your main account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the checking account most of your day-to-day money moves through.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Account name</Label>
              <Input value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={acct.account_type} onValueChange={(v) => setAcct({ ...acct, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["checking", "bills_checking", "savings", "cash", "credit_card", "loan", "other"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Current balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={acct.current_balance}
                  onChange={(e) => setAcct({ ...acct, current_balance: e.target.value })}
                />
              </div>
              <div>
                <Label>Safety minimum</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={acct.minimum_balance}
                  onChange={(e) => setAcct({ ...acct, minimum_balance: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll warn you when the forecast drops below your safety minimum.
            </p>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={saveAccount} disabled={busy}>
              {busy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Add a source of income</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Even a rough estimate is fine — you can refine it later.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={income.name} onChange={(e) => setIncome({ ...income, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount per payment</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={income.amount}
                  onChange={(e) => setIncome({ ...income, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>How often</Label>
                <Select value={income.frequency} onValueChange={(v) => setIncome({ ...income, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every two weeks</SelectItem>
                    <SelectItem value="semimonthly">Twice a month</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Next payday</Label>
              <Input
                type="date"
                value={income.start_date}
                onChange={(e) => setIncome({ ...income, start_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={saveIncome} disabled={busy}>
                {busy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Add a recurring bill</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the biggest fixed monthly bill you have. You can add the rest from the Bills page.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={bill.name} onChange={(e) => setBill({ ...bill, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bill.amount}
                  onChange={(e) => setBill({ ...bill, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Day of month due</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={bill.day_of_month}
                  onChange={(e) => setBill({ ...bill, day_of_month: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Starting</Label>
              <Input
                type="date"
                value={bill.start_date}
                onChange={(e) => setBill({ ...bill, start_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(4)}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={saveBill} disabled={busy}>
                {busy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">You're set up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadence is already forecasting from what you entered. Head to the dashboard to see it,
              or keep adding rules.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={() => navigate({ to: "/dashboard" })}>Go to dashboard</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/bills" })}>Add more bills</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/income" })}>Add more income</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="flex items-center gap-2 flex-1">
            <div
              className={[
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                done ? "bg-primary text-primary-foreground border-primary" : "",
                active ? "border-primary text-primary" : "",
                !done && !active ? "border-border text-muted-foreground" : "",
              ].join(" ")}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={`hidden sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}