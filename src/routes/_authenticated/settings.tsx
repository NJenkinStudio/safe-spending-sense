import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/seed";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Cadence" }, { name: "description", content: "Account settings and demo tools." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const loadDemo = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    try {
      await seedDemoData(data.user.id);
      toast.success("Demo data added");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  const wipe = async () => {
    if (!confirm("Delete all your rules, changes, and accounts? This cannot be undone.")) return;
    await supabase.from("rule_changes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("financial_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    qc.invalidateQueries();
    toast.success("Cleared");
  };
  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Card className="p-5 space-y-3">
        <div>
          <div className="font-medium">Demo data</div>
          <p className="text-sm text-muted-foreground">Populate your workspace with the two-account example.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDemo}>Load demo data</Button>
          <Button variant="outline" onClick={wipe}>Clear all data</Button>
        </div>
      </Card>
    </div>
  );
}