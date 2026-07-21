import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { runForecast } from "@/lib/forecast/engine";
import type { FinancialRule } from "@/lib/forecast/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios — Cadence" },
      { name: "description", content: "Try what-if changes to your income, bills, or one-off events and compare them to your current plan." },
    ],
  }),
  component: ScenariosPage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

type Tweak =
  | { id: string; kind: "disable"; ruleId: string }
  | { id: string; kind: "amount"; ruleId: string; newAmount: number }
  | {
      id: string;
      kind: "add";
      name: string;
      type: "income" | "expense" | "one_time";
      accountId: string;
      amount: number;
      frequency: "one_time" | "weekly" | "biweekly" | "monthly";
      startDate: string;
    };

function ScenariosPage() {
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });

  const accounts = accountsQ.data ?? [];
  const rules = rulesQ.data ?? [];
  const changes = changesQ.data ?? [];

  const [tweaks, setTweaks] = useState<Tweak[]>([]);
  const [scenarioName, setScenarioName] = useState("What if…");

  const addTweak = (t: Tweak) => setTweaks((prev) => [...prev, t]);
  const removeTweak = (id: string) => setTweaks((prev) => prev.filter((t) => t.id !== id));

  const scenarioRules: FinancialRule[] = useMemo(() => {
    let out = rules.map((r) => ({ ...r }));
    for (const t of tweaks) {
      if (t.kind === "disable") out = out.map((r) => (r.id === t.ruleId ? { ...r, active: false } : r));
      if (t.kind === "amount") out = out.map((r) => (r.id === t.ruleId ? { ...r, amount: t.newAmount } : r));
      if (t.kind === "add") {
        out.push({
          id: `__scenario_${t.id}`,
          rule_type: t.type,
          name: t.name,
          source_account_id: t.type === "income" ? null : t.accountId,
          destination_account_id: t.type === "income" ? t.accountId : null,
          amount: t.amount,
          frequency: t.frequency,
          interval_count: 1,
          day_of_week: null,
          day_of_month: null,
          start_date: t.startDate,
          end_date: null,
          occurrence_limit: t.frequency === "one_time" ? 1 : null,
          occurrences_completed: 0,
          category: null,
          essential: false,
          fixed_or_variable: "fixed",
          active: true,
          confidence_level: "planned",
          notes: null,
        });
      }
    }
    return out;
  }, [rules, tweaks]);

  const baseline = useMemo(() => {
    if (!accounts.length) return null;
    return runForecast({ accounts, rules, changes, start: new Date(), end: addMonths(new Date(), 12) });
  }, [accounts, rules, changes]);

  const scenario = useMemo(() => {
    if (!accounts.length) return null;
    return runForecast({ accounts, rules: scenarioRules, changes, start: new Date(), end: addMonths(new Date(), 12) });
  }, [accounts, scenarioRules, changes]);

  const chartData = useMemo(() => {
    if (!baseline || !scenario) return [];
    const step = Math.max(1, Math.floor(baseline.daily.length / 120));
    return baseline.daily
      .filter((_, i) => i % step === 0)
      .map((d, i) => {
        const s = scenario.daily[i * step] ?? scenario.daily[scenario.daily.length - 1];
        return { date: d.date, Baseline: d.total, Scenario: s.total };
      });
  }, [baseline, scenario]);

  const summary = useMemo(() => {
    if (!baseline || !scenario) return null;
    const b = Object.values(baseline.endingBalances).reduce((s, v) => s + v, 0);
    const s = Object.values(scenario.endingBalances).reduce((sum, v) => sum + v, 0);
    return { baseline: b, scenario: s, delta: s - b };
  }, [baseline, scenario]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scenarios</h1>
          <p className="text-sm text-muted-foreground">Try what-if changes and compare them side by side with your current plan.</p>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs">Scenario name</Label>
          <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <TweakBuilder rules={rules} accounts={accounts} onAdd={addTweak} />
          <Card className="p-4">
            <h3 className="font-medium text-sm mb-3">Active changes ({tweaks.length})</h3>
            {tweaks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No changes yet — add one above to see its impact.</p>
            ) : (
              <ul className="space-y-2">
                {tweaks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0">{describeTweak(t, rules, accounts)}</div>
                    <Button size="sm" variant="ghost" onClick={() => removeTweak(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {summary && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Baseline in 12 mo</div>
                <div className="mt-1 text-xl font-semibold">{fmt(summary.baseline)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{scenarioName || "Scenario"} in 12 mo</div>
                <div className="mt-1 text-xl font-semibold text-primary">{fmt(summary.scenario)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Difference</div>
                <div className={`mt-1 text-xl font-semibold ${summary.delta < 0 ? "text-destructive" : summary.delta > 0 ? "text-success" : ""}`}>
                  {(summary.delta > 0 ? "+" : "") + fmt(summary.delta)}
                </div>
              </Card>
            </div>
          )}

          <Card className="p-5">
            <h2 className="font-medium mb-3">Total balance — baseline vs scenario</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM")} minTickGap={40} stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 100) / 10}k`} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(d) => format(parseISO(String(d)), "PP")}
                    formatter={(v: number) => fmt(Number(v))}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Baseline" stroke="var(--muted-foreground)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Scenario" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {baseline && scenario && (
            <Card className="p-5">
              <h2 className="font-medium mb-3">Per-account lowest points</h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left py-2">Account</th>
                    <th className="text-right">Baseline low</th>
                    <th className="text-right">Scenario low</th>
                    <th className="text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const b = baseline.lowestByAccount[a.id];
                    const s = scenario.lowestByAccount[a.id];
                    const d = s.balance - b.balance;
                    return (
                      <tr key={a.id} className="border-t border-border/60">
                        <td className="py-2">{a.name}</td>
                        <td className="text-right">{fmt(b.balance)}</td>
                        <td className="text-right">{fmt(s.balance)}</td>
                        <td className={`text-right ${d < 0 ? "text-destructive" : d > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {d === 0 ? "—" : (d > 0 ? "+" : "") + fmt(d)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function describeTweak(t: Tweak, rules: FinancialRule[], accounts: { id: string; name: string }[]) {
  if (t.kind === "disable") {
    const r = rules.find((x) => x.id === t.ruleId);
    return <span>Disable <span className="font-medium">{r?.name ?? "rule"}</span></span>;
  }
  if (t.kind === "amount") {
    const r = rules.find((x) => x.id === t.ruleId);
    return <span>Change <span className="font-medium">{r?.name ?? "rule"}</span> to {fmt(t.newAmount)}</span>;
  }
  const a = accounts.find((x) => x.id === t.accountId);
  return <span>Add {t.type} <span className="font-medium">{t.name}</span> — {fmt(t.amount)} {t.frequency}, {a?.name}</span>;
}

function TweakBuilder({
  rules,
  accounts,
  onAdd,
}: {
  rules: FinancialRule[];
  accounts: { id: string; name: string }[];
  onAdd: (t: Tweak) => void;
}) {
  const [mode, setMode] = useState<"add" | "amount" | "disable">("add");
  const today = new Date().toISOString().slice(0, 10);

  // add
  const [name, setName] = useState("Bonus");
  const [type, setType] = useState<"income" | "expense" | "one_time">("one_time");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("500");
  const [freq, setFreq] = useState<"one_time" | "weekly" | "biweekly" | "monthly">("one_time");
  const [startDate, setStartDate] = useState(today);

  // modify / disable
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? "");
  const [newAmount, setNewAmount] = useState("0");

  const acctId = accountId || accounts[0]?.id;
  const rId = ruleId || rules[0]?.id;

  const submit = () => {
    const id = crypto.randomUUID();
    if (mode === "add" && acctId) {
      onAdd({ id, kind: "add", name, type, accountId: acctId, amount: Number(amount) || 0, frequency: freq, startDate });
    } else if (mode === "amount" && rId) {
      onAdd({ id, kind: "amount", ruleId: rId, newAmount: Number(newAmount) || 0 });
    } else if (mode === "disable" && rId) {
      onAdd({ id, kind: "disable", ruleId: rId });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Add a what-if</h3>
      </div>
      <div className="flex gap-1 text-xs">
        {(["add", "amount", "disable"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full border ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            {m === "add" ? "New item" : m === "amount" ? "Change amount" : "Turn off"}
          </button>
        ))}
      </div>

      {mode === "add" && (
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account</Label>
              <Select value={acctId ?? ""} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div>
              <Label>Frequency</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Starts</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        </div>
      )}

      {(mode === "amount" || mode === "disable") && (
        <div className="space-y-3">
          <div>
            <Label>Rule</Label>
            <Select value={rId ?? ""} onValueChange={setRuleId}>
              <SelectTrigger><SelectValue placeholder="Pick a rule" /></SelectTrigger>
              <SelectContent>{rules.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {mode === "amount" && (
            <div><Label>New amount</Label><Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} /></div>
          )}
        </div>
      )}

      <Button className="w-full" onClick={submit}><Plus className="h-4 w-4 mr-2" />Add change</Button>
    </Card>
  );
}