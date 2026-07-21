import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameMonth, parseISO, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { runForecast } from "@/lib/forecast/engine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventKind } from "@/lib/forecast/types";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Cadence" }, { name: "description", content: "Every projected income, transfer, and bill on a monthly calendar." }] }),
  component: CalendarPage,
});

const kindColor: Record<EventKind, string> = {
  income: "bg-success/15 text-success",
  transfer_in: "bg-sage/15 text-sage",
  transfer_out: "bg-sage/10 text-muted-foreground",
  expense_essential: "bg-primary/10 text-primary",
  expense_discretionary: "bg-warning/15 text-warning",
  one_time: "bg-gold/15 text-gold",
};

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function CalendarPage() {
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const forecast = useMemo(() => {
    if (!accountsQ.data || !rulesQ.data || !changesQ.data) return null;
    return runForecast({
      accounts: accountsQ.data,
      rules: rulesQ.data,
      changes: changesQ.data,
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  }, [accountsQ.data, rulesQ.data, changesQ.data, month]);

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof forecast extends null ? never : NonNullable<typeof forecast>["events"]>();
    for (const e of forecast?.events ?? []) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [forecast]);

  const dayDetail = selected ? forecast?.daily.find((d) => d.date === selected) : null;
  const accounts = accountsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Every projected event on the calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-40 text-center font-medium">{format(month, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-3">
          <div className="grid grid-cols-7 text-xs text-muted-foreground mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const events = eventsByDate.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`min-h-24 p-1.5 rounded-md text-left border ${selected === key ? "border-primary" : "border-transparent"} ${inMonth ? "bg-card" : "bg-muted/40"} hover:border-border`}
                >
                  <div className={`text-xs ${inMonth ? "text-foreground" : "text-muted-foreground"}`}>{format(d, "d")}</div>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 ${kindColor[e.kind]}`}>
                        {e.ruleName}
                      </div>
                    ))}
                    {events.length > 3 && <div className="text-[10px] text-muted-foreground">+{events.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          {dayDetail ? (
            <>
              <div className="font-medium">{format(parseISO(dayDetail.date), "PPPP")}</div>
              <div className="mt-3 space-y-1 text-sm">
                {accounts.map((a) => (
                  <div key={a.id} className="flex justify-between">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span>{dayDetail.balances[a.id]?.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Events</div>
                {dayDetail.events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No events today.</div>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {dayDetail.events.map((e, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{e.ruleName}</span>
                        <span className={e.amount > 0 ? "text-success" : ""}>{fmt(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Select a day to see events and running balances.</div>
          )}
        </Card>
      </div>
    </div>
  );
}