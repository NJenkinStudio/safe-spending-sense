import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavControls } from "../nav-controls";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/forecast/types";
import type { SetupTrack } from "@/lib/onboarding/types";
import { TRACK_COPY } from "@/lib/onboarding/tracks";

type SubStep = "accounts" | "income" | "bills";

const ACCOUNT_TYPES = ["checking", "bills_checking", "savings", "cash", "credit_card", "loan", "other"];

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

  const [primary, setPrimary] = useState({
    name: "Main checking",
    account_type: "checking",
    current_balance: "",
    minimum_balance: "0",
  });
  const [secondary, setSecondary] = useState({
    name: "Bills account",
    account_type: "bills_checking",
    current_balance: "",
    minimum_balance: "0",
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

  const saveAccounts = async () => {
    if (!primary.name || !primary.current_balance) return toast.error("Fill in the primary account");
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      const rows: Record<string, unknown>[] = [
        {
          user_id: id,
          name: primary.name.trim(),
          account_type: primary.account_type,
          current_balance: Number(primary.current_balance),
          minimum_balance: Number(primary.minimum_balance || 0),
          balance_as_of: today,
        },
      ];
      if (needsSecondAccount) {
        rows.push({
          user_id: id,
          name: secondary.name.trim(),
          account_type: secondary.account_type,
          current_balance: Number(secondary.current_balance || 0),
          minimum_balance: Number(secondary.minimum_balance || 0),
          balance_as_of: today,
        });
      }
      const { data: inserted, error } = await supabase
        .from("accounts")
        .insert(rows as never)
        .select("id, name, account_type");
      if (error) throw error;
      const primaryRow = (inserted ?? []).find((r) => r.name === primary.name.trim());
      const billsRow = needsSecondAccount
        ? (inserted ?? []).find((r) => r.name === secondary.name.trim())
        : null;
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
      (createdBills ?? null) ??
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

  const copy = TRACK_COPY[track];

  return (
    <Card className="p-6 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-primary font-medium">{copy.title}</div>
        <h2 className="text-xl font-semibold mt-1">
          {sub === "accounts" && "Add your account(s)"}
          {sub === "income" && "Add your primary income"}
          {sub === "bills" && "Add your biggest recurring bill"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {sub === "accounts" && copy.blurb}
          {sub === "income" &&
            (track === "variable-income"
              ? "Cadence will treat this as an estimate so surprises hurt less."
              : "A rough amount is fine — you can refine it anytime.")}
          {sub === "bills" && "We only need one to get you going. You can add the rest from the Bills page."}
        </p>
      </div>

      {sub === "accounts" && (
        <div className="space-y-4">
          <AccountFields label="Primary account" value={primary} onChange={setPrimary} />
          {needsSecondAccount && <AccountFields label="Bills account" value={secondary} onChange={setSecondary} />}
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
  label,
  value,
  onChange,
}: {
  label: string;
  value: { name: string; account_type: string; current_balance: string; minimum_balance: string };
  onChange: (v: { name: string; account_type: string; current_balance: string; minimum_balance: string }) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name</Label><Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
        <div>
          <Label>Type</Label>
          <Select value={value.account_type} onValueChange={(v) => onChange({ ...value, account_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Current balance</Label><Input type="number" step="0.01" value={value.current_balance} onChange={(e) => onChange({ ...value, current_balance: e.target.value })} /></div>
        <div><Label>Safety minimum</Label><Input type="number" step="0.01" value={value.minimum_balance} onChange={(e) => onChange({ ...value, minimum_balance: e.target.value })} /></div>
      </div>
    </div>
  );
}