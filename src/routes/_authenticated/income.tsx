import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAccounts, fetchRules } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RuleForm } from "@/components/rule-form";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { RuleType, FinancialRule } from "@/lib/forecast/types";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income & Transfers — Cadence" }, { name: "description", content: "Recurring paychecks, deposits, and transfers between accounts." }] }),
  component: IncomePage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function IncomePage() {
  const qc = useQueryClient();
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const [open, setOpen] = useState<null | RuleType>(null);
  const [editing, setEditing] = useState<FinancialRule | null>(null);
  const del = async (id: string) => {
    if (!confirm("Delete rule?")) return;
    await supabase.from("financial_rules").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["rules"] });
    toast.success("Deleted");
  };

  const rules = (rulesQ.data ?? []).filter((r) => r.rule_type === "income" || r.rule_type === "transfer");
  const accts = accountsQ.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income & Transfers</h1>
          <p className="text-sm text-muted-foreground">Money flowing in and moving between accounts.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open === "income"} onOpenChange={(v) => setOpen(v ? "income" : null)}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Income</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New income rule</DialogTitle></DialogHeader>
              <RuleForm ruleType="income" accounts={accts} onSaved={() => { setOpen(null); qc.invalidateQueries({ queryKey: ["rules"] }); }} />
            </DialogContent>
          </Dialog>
          <Dialog open={open === "transfer"} onOpenChange={(v) => setOpen(v ? "transfer" : null)}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Transfer</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New transfer rule</DialogTitle></DialogHeader>
              <RuleForm ruleType="transfer" accounts={accts} onSaved={() => { setOpen(null); qc.invalidateQueries({ queryKey: ["rules"] }); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="divide-y divide-border">
        {rules.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No income or transfer rules yet.</div>}
        {rules.map((r) => {
          const src = accts.find((a) => a.id === r.source_account_id);
          const dst = accts.find((a) => a.id === r.destination_account_id);
          return (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.rule_type === "income" ? `→ ${dst?.name ?? "?"}` : `${src?.name ?? "?"} → ${dst?.name ?? "?"}`}
                  {" · "}{r.frequency.replace("_", " ")}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`font-medium ${r.rule_type === "income" ? "text-success" : ""}`}>{fmt(Number(r.amount))}</div>
                  <div className="text-[11px] text-muted-foreground">{r.rule_type}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </Card>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {editing?.rule_type} rule</DialogTitle></DialogHeader>
          {editing && (
            <RuleForm
              ruleType={editing.rule_type as RuleType}
              accounts={accts}
              initial={editing}
              onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["rules"] }); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}