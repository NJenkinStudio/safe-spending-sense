import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Account, FinancialRule, RuleType, Frequency } from "@/lib/forecast/types";
import { format } from "date-fns";

interface Props {
  ruleType: RuleType;
  accounts: Account[];
  initial?: Partial<FinancialRule>;
  onSaved: () => void;
}

const freqs: { value: Frequency; label: string }[] = [
  { value: "one_time", label: "One time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice monthly (1st & 15th)" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom (every N days)" },
];

export function RuleForm({ ruleType, accounts, initial, onSaved }: Props) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    amount: String(initial?.amount ?? ""),
    frequency: (initial?.frequency ?? "monthly") as Frequency,
    interval_count: String(initial?.interval_count ?? 1),
    start_date: initial?.start_date ?? format(new Date(), "yyyy-MM-dd"),
    end_date: initial?.end_date ?? "",
    occurrence_limit: initial?.occurrence_limit ? String(initial.occurrence_limit) : "",
    source_account_id: initial?.source_account_id ?? "",
    destination_account_id: initial?.destination_account_id ?? "",
    essential: initial?.essential ?? (ruleType === "expense"),
    category: initial?.category ?? "",
    notes: initial?.notes ?? "",
    day_of_month: String(initial?.day_of_month ?? ""),
    active: initial?.active ?? true,
  });

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      rule_type: ruleType,
      name: f.name,
      amount: Number(f.amount),
      frequency: f.frequency,
      interval_count: Number(f.interval_count) || 1,
      start_date: f.start_date,
      end_date: f.end_date || null,
      occurrence_limit: f.occurrence_limit ? Number(f.occurrence_limit) : null,
      source_account_id: (ruleType === "expense" || ruleType === "transfer" || ruleType === "one_time") ? (f.source_account_id || null) : null,
      destination_account_id: (ruleType === "income" || ruleType === "transfer") ? (f.destination_account_id || null) : null,
      essential: f.essential,
      category: f.category || null,
      notes: f.notes || null,
      day_of_month: f.day_of_month ? Number(f.day_of_month) : null,
      active: f.active,
    };
    const { error } = initial?.id
      ? await supabase.from("financial_rules").update(payload).eq("id", initial.id)
      : await supabase.from("financial_rules").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  const needsSource = ruleType === "expense" || ruleType === "transfer" || ruleType === "one_time";
  const needsDest = ruleType === "income" || ruleType === "transfer";

  return (
    <div className="space-y-3">
      <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Amount</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div>
          <Label>Frequency</Label>
          <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v as Frequency })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{freqs.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {f.frequency === "custom" && (
        <div><Label>Every N days</Label><Input type="number" value={f.interval_count} onChange={(e) => setF({ ...f, interval_count: e.target.value })} /></div>
      )}
      {needsSource && (
        <div>
          <Label>{ruleType === "transfer" ? "From account" : "Payment account"}</Label>
          <Select value={f.source_account_id} onValueChange={(v) => setF({ ...f, source_account_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {needsDest && (
        <div>
          <Label>{ruleType === "transfer" ? "To account" : "Destination account"}</Label>
          <Select value={f.destination_account_id} onValueChange={(v) => setF({ ...f, destination_account_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Start date</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
        <div><Label>End date (optional)</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Remaining payments (optional)</Label><Input type="number" value={f.occurrence_limit} onChange={(e) => setF({ ...f, occurrence_limit: e.target.value })} /></div>
        <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
      </div>
      {ruleType === "expense" && (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-medium">Essential</div>
            <div className="text-xs text-muted-foreground">Uncheck for discretionary spending</div>
          </div>
          <Switch checked={f.essential} onCheckedChange={(v) => setF({ ...f, essential: v })} />
        </div>
      )}
      <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <Button className="w-full" onClick={save}>Save</Button>
    </div>
  );
}