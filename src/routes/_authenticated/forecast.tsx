import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { runForecast } from "@/lib/forecast/engine";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/forecast")({
  head: () => ({ meta: [{ title: "Forecast — Cadence" }, { name: "description", content: "Twelve-month cash flow projection across all your accounts." }] }),
  component: ForecastPage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function ForecastPage() {
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });
  const [range, setRange] = useState<30 | 90 | 180 | 365>(365);

  const forecast = useMemo(() => {
    if (!accountsQ.data || !rulesQ.data || !changesQ.data) return null;
    return runForecast({
      accounts: accountsQ.data,
      rules: rulesQ.data,
      changes: changesQ.data,
      start: new Date(),
      end: range === 365 ? addMonths(new Date(), 12) : addDays(new Date(), range),
    });
  }, [accountsQ.data, rulesQ.data, changesQ.data, range]);

  const accounts = accountsQ.data ?? [];
  const chartData = (forecast?.daily ?? []).filter((_, i) => i % Math.max(1, Math.floor((forecast?.daily.length ?? 1) / 120)) === 0).map((d) => {
    const row: Record<string, string | number> = { date: d.date };
    for (const a of accounts) row[a.name] = d.balances[a.id] ?? 0;
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
          <p className="text-sm text-muted-foreground">Balances over time — hover for the exact date.</p>
        </div>
        <div className="flex gap-1 text-xs">
          {([30, 90, 180, 365] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full border ${range === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {r === 365 ? "12 mo" : `${r} d`}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM d")} minTickGap={40} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis tickFormatter={(v) => fmt(Number(v))} stroke="var(--muted-foreground)" fontSize={11} width={80} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => format(parseISO(String(d)), "PPP")}
                formatter={(v: number) => fmt(Number(v))}
              />
              <Legend />
              {accounts.map((a) => (
                <Line key={a.id} type="monotone" dataKey={a.name} stroke={a.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium mb-3">Monthly cash flow</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider">
              <tr><th className="text-left py-2">Month</th><th className="text-right">Inflow</th><th className="text-right">Outflow</th><th className="text-right">Net</th></tr>
            </thead>
            <tbody>
              {(forecast?.monthly ?? []).map((m) => (
                <tr key={m.month} className="border-t border-border/60">
                  <td className="py-2">{format(parseISO(m.month + "-01"), "MMMM yyyy")}</td>
                  <td className="text-right text-success">{fmt(m.inflow)}</td>
                  <td className="text-right">{fmt(m.outflow)}</td>
                  <td className={`text-right font-medium ${m.net < 0 ? "text-destructive" : ""}`}>{fmt(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}