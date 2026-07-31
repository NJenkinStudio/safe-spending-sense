import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchAccounts, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RuleForm } from "@/components/rule-form";
import { Plus, Trash2, Calendar as CalIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { payoffDate } from "@/lib/forecast/engine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FinancialRule } from "@/lib/forecast/types";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({ meta: [{ title: "Bills — Cadence" }, { name: "description", content: "Recurring bills, subscriptions, and financed obligations." }] }),
  component: BillsPage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function BillsPage() {
  const qc = useQueryClient();
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["changes"], queryFn: fetchRuleChanges });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRule | null>(null);
  const [filter, setFilter] = useState<"all" | "essential" | "discretionary" | "financed">("all");
  const [changeFor, setChangeFor] = useState<string | null>(null);
  const [changeForm, setChangeForm] = useState({ effective_date: "", field_name: "amount", new_value: "" });

  const del = async (id: string) => {
    if (!confirm("Delete bill?")) return;
    await supabase.from("financial_rules").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["rules"] });
    toast.success("Deleted");
  };

  const saveChange = async () => {
    if (!changeFor) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("rule_changes").insert({
      user_id: u.user.id,
      financial_rule_id: changeFor,
      effective_date: changeForm.effective_date,
      field_name: changeForm.field_name,
      new_value: changeForm.new_value,
    });
    if (error) return toast.error(error.message);
    toast.success("Change scheduled");
    setChangeFor(null);
    qc.invalidateQueries({ queryKey: ["changes"] });
  };

  const rules = useMemo(() => {
    const all = (rulesQ.data ?? []).filter((r) => r.rule_type === "expense");
    if (filter === "essential") return all.filter((r) => r.essential);
    if (filter === "discretionary") return all.filter((r) => !r.essential);
    if (filter === "financed") return all.filter((r) => r.occurrence_limit);
    return all;
  }, [rulesQ.data, filter]);

  const accts = accountsQ.data ?? [];
  const changes = changesQ.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground">Recurring expenses, subscriptions, and financed items.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New bill</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New bill</DialogTitle></DialogHeader>
            <RuleForm ruleType="expense" accounts={accts} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["rules"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 text-xs">
        {(["all", "essential", "discretionary", "financed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="divide-y divide-border">
        {rules.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No bills match this filter.</div>}
        {rules.map((r) => {
          const src = accts.find((a) => a.id === r.source_account_id);
          const payoff = payoffDate(r);
          const remaining = r.occurrence_limit ? r.occurrence_limit - (r.occurrences_completed ?? 0) : null;
          const ruleChanges = changes.filter((c) => c.financial_rule_id === r.id);
          return (
            <div key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.essential ? <Badge variant="secondary">Essential</Badge> : <Badge variant="outline">Discretionary</Badge>}
                    {r.occurrence_limit && <Badge className="bg-gold text-primary-foreground">Financed</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {src?.name ?? "—"} · {r.frequency.replace("_", " ")}
                    {payoff && ` · payoff ${format(parseISO(payoff), "PP")}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">{fmt(Number(r.amount))}</div>
                    {remaining !== null && <div className="text-[11px] text-muted-foreground">{remaining} left</div>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setChangeFor(r.id); setChangeForm({ effective_date: format(new Date(), "yyyy-MM-dd"), field_name: "amount", new_value: String(r.amount) }); }}>
                    <CalIcon className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {ruleChanges.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground pl-1">
                  {ruleChanges.map((c) => (
                    <div key={c.id}>
                      On {format(parseISO(c.effective_date), "PP")}: {c.field_name} → {c.new_value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Dialog open={!!changeFor} onOpenChange={(v) => !v && setChangeFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule a change</DialogTitle></DialogHeader>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule a change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Effective date</Label><Input type="date" value={changeForm.effective_date} onChange={(e) => setChangeForm({ ...changeForm, effective_date: e.target.value })} /></div>
            <div><Label>Field</Label>
              <select className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm" value={changeForm.field_name} onChange={(e) => setChangeForm({ ...changeForm, field_name: e.target.value })}>
                <option value="amount">amount</option>
                <option value="active">active (true/false)</option>
              </select>
            </div>
            <div><Label>New value</Label><Input value={changeForm.new_value} onChange={(e) => setChangeForm({ ...changeForm, new_value: e.target.value })} /></div>
            <Button className="w-full" onClick={saveChange}>Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}