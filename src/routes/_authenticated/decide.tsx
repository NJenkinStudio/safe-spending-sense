import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { runForecast } from "@/lib/forecast/engine";
import type { FinancialRule } from "@/lib/forecast/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/decide")({
  head: () => ({
    meta: [
      { title: "Can I afford it? — Cadence" },
      { name: "description", content: "See exactly how a purchase would ripple through your next twelve months." },
    ],
  }),
  component: DecidePage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function DecidePage() {
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("100");
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(today);
  const [splitMonths, setSplitMonths] = useState("1");
  const [name, setName] = useState("Purchase");

  const accounts = accountsQ.data ?? [];
  const rules = rulesQ.data ?? [];
  const changes = changesQ.data ?? [];
  const acct = accounts.find((a) => a.id === accountId) ?? accounts[0];

  const baseline = useMemo(() => {
    if (!accounts.length) return null;
    return runForecast({ accounts, rules, changes, start: new Date(), end: addMonths(new Date(), 12) });
  }, [accounts, rules, changes]);

  const withPurchase = useMemo(() => {
    if (!accounts.length || !acct) return null;
    const amt = Number(amount) || 0;
    const months = Math.max(1, Math.floor(Number(splitMonths) || 1));
    const perMonth = amt / months;
    const extra: FinancialRule[] = [
      {
        id: "__scenario_purchase",
        rule_type: months === 1 ? "one_time" : "expense",
        name,
        source_account_id: acct.id,
        destination_account_id: null,
        amount: perMonth,
        frequency: months === 1 ? "one_time" : "monthly",
        interval_count: 1,
        day_of_week: null,
        day_of_month: null,
        start_date: date,
        end_date: months === 1 ? null : format(addMonths(parseISO(date), months - 1), "yyyy-MM-dd"),
        occurrence_limit: months === 1 ? 1 : months,
        occurrences_completed: 0,
        category: "purchase",
        essential: false,
        fixed_or_variable: "fixed",
        active: true,
        confidence_level: "confirmed",
        notes: null,
      },
    ];
    return runForecast({
      accounts,
      rules: [...rules, ...extra],
      changes,
      start: new Date(),
      end: addMonths(new Date(), 12),
    });
  }, [accounts, rules, changes, acct, amount, date, splitMonths, name]);

  const verdict = useMemo(() => {
    if (!withPurchase || !acct) return null;
    const low = withPurchase.lowestByAccount[acct.id];
    const min = Number(acct.minimum_balance);
    if (low.balance < 0) return { level: "unsafe" as const, label: "Would go negative", low };
    if (low.balance < min) return { level: "warn" as const, label: "Would dip below your minimum", low };
    return { level: "safe" as const, label: "Safe to buy", low };
  }, [withPurchase, acct]);

  const delta = useMemo(() => {
    if (!baseline || !withPurchase) return null;
    const b = Object.values(baseline.endingBalances).reduce((s, v) => s + v, 0);
    const w = Object.values(withPurchase.endingBalances).reduce((s, v) => s + v, 0);
    return w - b;
  }, [baseline, withPurchase]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Can I afford it?</h1>
        <p className="text-sm text-muted-foreground">Model a purchase against your forecast before you commit.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="p-5 space-y-3">
          <div>
            <Label>What is it?</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Concert tickets" />
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Pay from</Label>
            <Select value={acct?.id ?? ""} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Split over (months)</Label>
              <Input type="number" min="1" max="60" value={splitMonths} onChange={(e) => setSplitMonths(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Splitting spreads the cost as equal monthly payments — useful for financed purchases or budgeting a big buy.
          </p>
        </Card>

        <div className="space-y-4">
          {verdict && acct && (
            <Card className={`p-5 border-2 ${
              verdict.level === "safe" ? "border-success/40 bg-success/5" :
              verdict.level === "warn" ? "border-warning/40 bg-warning/5" :
              "border-destructive/40 bg-destructive/5"
            }`}>
              <div className="flex items-start gap-3">
                {verdict.level === "safe" && <ShieldCheck className="h-6 w-6 text-success shrink-0" />}
                {verdict.level === "warn" && <ShieldAlert className="h-6 w-6 text-warning shrink-0" />}
                {verdict.level === "unsafe" && <ShieldX className="h-6 w-6 text-destructive shrink-0" />}
                <div>
                  <div className="font-medium">{verdict.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    After this purchase, {acct.name} would bottom out at{" "}
                    <span className="font-medium text-foreground">{fmt(verdict.low.balance)}</span>{" "}
                    on {format(parseISO(verdict.low.date), "PPP")}.
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Your minimum for this account is {fmt(Number(acct.minimum_balance))}.
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Purchase total</div>
              <div className="mt-1 text-xl font-semibold">{fmt(Number(amount) || 0)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">12-month impact</div>
              <div className={`mt-1 text-xl font-semibold ${delta && delta < 0 ? "text-destructive" : ""}`}>
                {delta != null ? fmt(delta) : "—"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Lowest after</div>
              <div className="mt-1 text-xl font-semibold">
                {verdict ? fmt(verdict.low.balance) : "—"}
              </div>
            </Card>
          </div>

          {baseline && withPurchase && acct && (
            <Card className="p-5">
              <h2 className="font-medium mb-3">Before vs after — {acct.name}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-2">Month</th>
                      <th className="text-right">Before</th>
                      <th className="text-right">After</th>
                      <th className="text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyEnds(baseline.daily, acct.id).map((row) => {
                      const after = monthlyEnds(withPurchase.daily, acct.id).find((r) => r.month === row.month);
                      const d = after ? after.balance - row.balance : 0;
                      return (
                        <tr key={row.month} className="border-t border-border/60">
                          <td className="py-2">{format(parseISO(row.month + "-01"), "MMM yyyy")}</td>
                          <td className="text-right">{fmt(row.balance)}</td>
                          <td className="text-right">{after ? fmt(after.balance) : "—"}</td>
                          <td className={`text-right ${d < 0 ? "text-destructive" : d > 0 ? "text-success" : "text-muted-foreground"}`}>
                            {d === 0 ? "—" : (d > 0 ? "+" : "") + fmt(d)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function monthlyEnds(daily: { date: string; balances: Record<string, number> }[], accountId: string) {
  const byMonth = new Map<string, { date: string; balance: number }>();
  for (const d of daily) {
    const m = d.date.slice(0, 7);
    const cur = byMonth.get(m);
    if (!cur || d.date > cur.date) byMonth.set(m, { date: d.date, balance: d.balances[accountId] ?? 0 });
  }
  return Array.from(byMonth.entries()).sort().map(([month, v]) => ({ month, balance: v.balance }));
}