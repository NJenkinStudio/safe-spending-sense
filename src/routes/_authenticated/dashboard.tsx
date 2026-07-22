import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { runForecast } from "@/lib/forecast/engine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { AlertCircle, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cadence" },
      { name: "description", content: "Your current balances, next events, and 12-month projection." },
    ],
  }),
  component: Dashboard,
});

const fmtCurrency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function Dashboard() {
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });

  const forecast = useMemo(() => {
    if (!accountsQ.data || !rulesQ.data || !changesQ.data) return null;
    return runForecast({
      accounts: accountsQ.data,
      rules: rulesQ.data,
      changes: changesQ.data,
      start: new Date(),
      end: addMonths(new Date(), 12),
    });
  }, [accountsQ.data, rulesQ.data, changesQ.data]);

  if (accountsQ.isLoading || rulesQ.isLoading) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  const accounts = accountsQ.data ?? [];
  if (!accounts.length) {
    return <Navigate to="/onboarding" />;
  }

  const upcoming = (forecast?.events ?? []).slice(0, 10);
  const chartData = (forecast?.daily ?? []).filter((_, i) => i % 3 === 0).map((d) => {
    const row: Record<string, string | number> = { date: d.date };
    for (const a of accounts) row[a.name] = d.balances[a.id] ?? 0;
    return row;
  });

  const lowest = forecast ? accounts.map((a) => ({ a, low: forecast.lowestByAccount[a.id] })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Where your money is going over the next twelve months.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {accounts.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{a.name}</div>
            <div className="mt-1 text-2xl font-semibold" style={{ color: a.color }}>{fmtCurrency(Number(a.current_balance))}</div>
            <div className="mt-2 text-xs text-muted-foreground">Minimum {fmtCurrency(Number(a.minimum_balance))}</div>
          </Card>
        ))}
        {forecast && (
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">12-month ending total</div>
            <div className="mt-1 text-2xl font-semibold text-primary">
              {fmtCurrency(Object.values(forecast.endingBalances).reduce((s, v) => s + v, 0))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Across all accounts</div>
          </Card>
        )}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">12-month forecast</h2>
            <p className="text-xs text-muted-foreground">Projected balances by account</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {accounts.map((a) => (
                  <linearGradient key={a.id} id={`g-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={a.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={a.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM")} minTickGap={40} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 100) / 10}k`} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => format(parseISO(String(d)), "PP")}
                formatter={(v: number) => fmtCurrency(Number(v))}
              />
              {accounts.map((a) => (
                <Area key={a.id} type="monotone" dataKey={a.name} stroke={a.color} fill={`url(#g-${a.id})`} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-medium mb-1">Lowest projected balances</h2>
          <p className="text-xs text-muted-foreground mb-4">The tightest point over the next year</p>
          <ul className="space-y-3">
            {lowest.map(({ a, low }) => {
              const belowMin = low.balance < Number(a.minimum_balance);
              const negative = low.balance < 0;
              return (
                <li key={a.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">on {format(parseISO(low.date), "PP")}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${negative ? "text-destructive" : belowMin ? "text-warning" : ""}`}>
                      {fmtCurrency(low.balance)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {negative ? "Underfunded" : belowMin ? "Below minimum" : "Safe"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-1">Next ten events</h2>
          <p className="text-xs text-muted-foreground mb-4">Everything projected over the coming weeks</p>
          <ul className="space-y-2">
            {upcoming.map((ev, i) => {
              const a = accounts.find((x) => x.id === ev.accountId);
              return (
                <li key={i} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xs text-muted-foreground w-16 shrink-0">{format(parseISO(ev.date), "MMM d")}</div>
                    <div className="truncate">
                      <div className="truncate">{ev.ruleName}</div>
                      <div className="text-[11px] text-muted-foreground">{a?.name}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${ev.amount > 0 ? "text-success" : "text-foreground"}`}>
                    {ev.amount > 0 ? "+" : ""}{fmtCurrency(ev.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {forecast && accounts.some((a) => forecast.lowestByAccount[a.id].balance < Number(a.minimum_balance)) && (
        <Card className="p-5 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Heads up</div>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {accounts.map((a) => {
                  const low = forecast.lowestByAccount[a.id];
                  if (low.balance >= Number(a.minimum_balance)) return null;
                  return (
                    <li key={a.id}>
                      {a.name} falls to {fmtCurrency(low.balance)} on {format(parseISO(low.date), "PPP")}
                      {" "}(minimum {fmtCurrency(Number(a.minimum_balance))}).
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="text-right">
        <a href="/forecast" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          Full forecast <ArrowUpRight className="h-4 w-4 ml-1" />
        </a>
      </div>
    </div>
  );
}