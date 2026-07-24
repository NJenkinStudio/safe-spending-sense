import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NavControls } from "../nav-controls";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/forecast/types";
import type { SetupTrack } from "@/lib/onboarding/types";
import { ACCOUNT_COLOR_PALETTE, DEFAULT_ACCOUNT_COLOR } from "@/lib/onboarding/colors";

type SubStep = "accounts" | "income" | "bills";

const ACCOUNT_TYPES = ["checking", "bills_checking", "savings", "cash", "credit_card", "loan", "other"];

interface AccountDraft {
  key: string;
  name: string;
  account_type: string;
  current_balance: string;
  minimum_balance: string;
  color: string;
  include_in_forecast: boolean;
  /** Required accounts cannot be removed (Primary, and Bills on the split track). */
  required?: "primary" | "bills";
}

let draftId = 0;
const nextKey = () => `acct-${++draftId}`;

export function SetupStep({
  track,
  accounts,
  onRefresh,
  onBack,
  onNext,
}: {
  track: SetupTrack;
  accounts: Account[];
  onRefresh: () => Promise<void> | void;
  onBack: () => void;
  onNext: () => void;
}) {
  const needsSecondAccount = track === "bills-and-operating";
  const [sub, setSub] = useState<SubStep>("accounts");
  const today = new Date().toISOString().slice(0, 10);

  // Locally retain the accounts we just inserted so subsequent income/bill
  // saves don't depend on a possibly-stale accounts prop.
  const [createdPrimary, setCreatedPrimary] = useState<{ id: string; account_type: string } | null>(null);
  const [createdBills, setCreatedBills] = useState<{ id: string; account_type: string } | null>(null);

  const [drafts, setDrafts] = useState<AccountDraft[]>(() => {
    const base: AccountDraft[] = [
      {
        key: nextKey(),
        name: "Main checking",
        account_type: "checking",
        current_balance: "",
        minimum_balance: "0",
        color: ACCOUNT_COLOR_PALETTE[0].value,
        include_in_forecast: true,
        required: "primary",
      },
    ];
    if (needsSecondAccount) {
      base.push({
        key: nextKey(),
        name: "Bills account",
        account_type: "bills_checking",
        current_balance: "",
        minimum_balance: "0",
        color: ACCOUNT_COLOR_PALETTE[1].value,
        include_in_forecast: true,
        required: "bills",
      });
    }
    return base;
  });

  const [income, setIncome] = useState({
    name: "Paycheck",
    amount: "",
    frequency: track === "variable-income" ? "monthly" : "biweekly",
    start_date: today,
  });

  const [bill, setBill] = useState({
    name: "Rent",
    amount: "",
    day_of_month: "1",
  });

  const [busy, setBusy] = useState(false);

  const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const addAccount = () => {
    const nextColor = ACCOUNT_COLOR_PALETTE[drafts.length % ACCOUNT_COLOR_PALETTE.length].value;
    setDrafts((d) => [
      ...d,
      {
        key: nextKey(),
        name: "",
        account_type: "savings",
        current_balance: "",
        minimum_balance: "0",
        color: nextColor,
        include_in_forecast: true,
      },
    ]);
  };

  const updateDraft = (key: string, patch: Partial<AccountDraft>) => {
    setDrafts((d) => d.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const removeDraft = (key: string) => {
    setDrafts((d) => d.filter((a) => a.key === key || a.required));
  };

  const saveAccounts = async () => {
    const primary = drafts.find((d) => d.required === "primary")!;
    if (!primary.name.trim() || !primary.current_balance) return toast.error("Fill in your primary account");
    for (const d of drafts) {
      if (!d.name.trim()) return toast.error("Every account needs a name");
    }
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const rows = drafts.map((d) => ({
        user_id: id,
        name: d.name.trim(),
        account_type: d.account_type,
        current_balance: Number(d.current_balance || 0),
        minimum_balance: Number(d.minimum_balance || 0),
        color: d.color || DEFAULT_ACCOUNT_COLOR,
        include_in_forecast: d.include_in_forecast,
        balance_as_of: today,
      })) as Record<string, unknown>[];
      const { data: inserted, error } = await supabase
        .from("accounts")
        .insert(rows as never)
        .select("id, name, account_type");
      if (error) throw error;
      const primaryRow = (inserted ?? []).find((r) => r.name === primary.name.trim());
      const billsDraft = drafts.find((d) => d.required === "bills");
      const billsRow = billsDraft ? (inserted ?? []).find((r) => r.name === billsDraft.name.trim()) : null;
      if (primaryRow) setCreatedPrimary({ id: primaryRow.id, account_type: primaryRow.account_type });
      if (billsRow) setCreatedBills({ id: billsRow.id, account_type: billsRow.account_type });
      await onRefresh();
      setSub("income");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save account");
    } finally {
      setBusy(false);
    }
  };

  const saveIncome = async () => {
    const acct =
      createdPrimary ??
      accounts[0] ??
      null;
    if (!acct) return toast.error("Add an account first");
    if (!income.amount) return toast.error("Enter an income amount");
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase.from("financial_rules").insert({
        user_id: id,
        rule_type: "income",
        name: income.name.trim() || "Paycheck",
        destination_account_id: acct.id,
        amount: Number(income.amount),
        frequency: income.frequency,
        start_date: income.start_date,
        essential: true,
        active: true,
        confidence_level: track === "variable-income" ? "estimated" : "confirmed",
      } as never);
      if (error) throw error;
      setSub("bills");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save income");
    } finally {
      setBusy(false);
    }
  };

  const saveBill = async () => {
    const billAcct =
      createdBills ??
      accounts.find((a) => a.account_type === "bills_checking") ??
      createdPrimary ??
      accounts[0] ??
      null;
    if (!billAcct) return toast.error("Add an account first");
    if (!bill.amount) return toast.error("Enter a bill amount");
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
        source_account_id: billAcct.id,
        amount: Number(bill.amount),
        frequency: "monthly",
        day_of_month: dom,
        start_date: today,
        essential: true,
        active: true,
        confidence_level: "confirmed",
      } as never);
      if (error) throw error;
      onNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save bill");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          {sub === "accounts" && "Set up your accounts"}
          {sub === "income" && "Add your primary income"}
          {sub === "bills" && "Add your biggest recurring bill"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {sub === "accounts" && "Pick a color for each — it'll follow the account across Cadence."}
          {sub === "income" && "A rough amount is fine. Refine anytime."}
          {sub === "bills" && "One is enough to get going. Add the rest from the Bills page."}
        </p>
      </div>

      {sub === "accounts" && (
        <div className="space-y-4">
          {drafts.map((d) => (
            <AccountFields
              key={d.key}
              value={d}
              onChange={(patch) => updateDraft(d.key, patch)}
              onRemove={d.required ? undefined : () => removeDraft(d.key)}
            />
          ))}
          <Button variant="outline" type="button" onClick={addAccount} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add another account
          </Button>
          <NavControls onBack={onBack} onNext={saveAccounts} busy={busy} />
        </div>
      )}

      {sub === "income" && (
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={income.name} onChange={(e) => setIncome({ ...income, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount per payment</Label><Input type="number" step="0.01" value={income.amount} onChange={(e) => setIncome({ ...income, amount: e.target.value })} /></div>
            <div>
              <Label>Frequency</Label>
              <Select value={income.frequency} onValueChange={(v) => setIncome({ ...income, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="semimonthly">Twice a month</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Next payday</Label><Input type="date" value={income.start_date} onChange={(e) => setIncome({ ...income, start_date: e.target.value })} /></div>
          <div className="flex justify-between pt-2 gap-2">
            <Button variant="ghost" onClick={() => setSub("accounts")}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSub("bills")}>Skip</Button>
              <Button onClick={saveIncome} disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
            </div>
          </div>
        </div>
      )}

      {sub === "bills" && (
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={bill.name} onChange={(e) => setBill({ ...bill, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" step="0.01" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value })} /></div>
            <div><Label>Day of month</Label><Input type="number" min="1" max="31" value={bill.day_of_month} onChange={(e) => setBill({ ...bill, day_of_month: e.target.value })} /></div>
          </div>
          <div className="flex justify-between pt-2 gap-2">
            <Button variant="ghost" onClick={() => setSub("income")}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onNext}>Skip</Button>
              <Button onClick={saveBill} disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AccountFields({
  value,
  onChange,
  onRemove,
}: {
  value: AccountDraft;
  onChange: (patch: Partial<AccountDraft>) => void;
  onRemove?: () => void;
}) {
  const label =
    value.required === "primary" ? "Primary account" :
    value.required === "bills" ? "Bills account" :
    "Additional account";
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ background: value.color }} />
          <div className="text-sm font-medium">{label}</div>
        </div>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={value.name} onChange={(e) => onChange({ name: e.target.value })} /></div>
        <div>
          <Label>Type</Label>
          <Select value={value.account_type} onValueChange={(v) => onChange({ account_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Starting balance</Label><Input type="number" step="0.01" value={value.current_balance} onChange={(e) => onChange({ current_balance: e.target.value })} /></div>
        <div><Label>Safety minimum</Label><Input type="number" step="0.01" value={value.minimum_balance} onChange={(e) => onChange({ minimum_balance: e.target.value })} /></div>
      </div>
      <div>
        <Label className="mb-1 block">Color</Label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLOR_PALETTE.map((c) => {
            const selected = value.color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                onClick={() => onChange({ color: c.value })}
                className={`h-7 w-7 rounded-full border-2 transition ${selected ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: c.value }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label className="text-sm font-normal text-muted-foreground">Include in forecast</Label>
        <Switch
          checked={value.include_in_forecast}
          onCheckedChange={(v) => onChange({ include_in_forecast: !!v })}
        />
      </div>
    </div>
  );
}