import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAccounts } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — Cadence" }, { name: "description", content: "Manage your financial accounts and their safety minimums." }] }),
  component: AccountsPage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

function AccountsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: "", account_type: "checking", current_balance: "0", minimum_balance: "0", color: "#7A9A7E", balance_as_of: today });

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("accounts").insert({
      user_id: u.user.id,
      name: form.name,
      account_type: form.account_type,
      current_balance: Number(form.current_balance),
      minimum_balance: Number(form.minimum_balance),
      color: form.color,
      balance_as_of: form.balance_as_of,
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    setOpen(false);
    setForm({ name: "", account_type: "checking", current_balance: "0", minimum_balance: "0", color: "#7A9A7E", balance_as_of: today });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this account? Any rules pointing to it will lose their reference.")) return;
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">The balances Cadence forecasts against.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["checking", "bills_checking", "savings", "cash", "credit_card", "loan", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Current balance</Label><Input type="number" step="0.01" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: e.target.value })} /></div>
                <div><Label>Minimum</Label><Input type="number" step="0.01" value={form.minimum_balance} onChange={(e) => setForm({ ...form, minimum_balance: e.target.value })} /></div>
              </div>
              <div><Label>Balance as of</Label><Input type="date" value={form.balance_as_of} onChange={(e) => setForm({ ...form, balance_as_of: e.target.value })} /></div>
              <div><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
              <Button className="w-full" onClick={save}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{a.account_type.replace("_", " ")}</div>
                <div className="mt-1 font-medium">{a.name}</div>
              </div>
              <div className="h-3 w-3 rounded-full" style={{ background: a.color }} />
            </div>
            <div className="mt-4 text-2xl font-semibold" style={{ color: a.color }}>{fmt(Number(a.current_balance))}</div>
            <div className="mt-1 text-xs text-muted-foreground">Minimum {fmt(Number(a.minimum_balance))}</div>
            <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={() => del(a.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}