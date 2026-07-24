import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData, removeDemoData } from "@/lib/seed";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { countDemoRecords } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Cadence" }, { name: "description", content: "Account settings and demo tools." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const demoQ = useQuery({ queryKey: ["demo_count"], queryFn: countDemoRecords });
  const loadDemo = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    try {
      await seedDemoData(data.user.id);
      toast.success("Sample workspace added");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  const removeDemo = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    if (!confirm("Remove all sample workspace records? Your real data will not be touched.")) return;
    try {
      await removeDemoData(data.user.id);
      toast.success("Sample workspace removed");
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
          <div className="font-medium">Sample workspace</div>
          <p className="text-sm text-muted-foreground">
            Sample records are labeled and kept separate from your real data. You currently have{" "}
            <span className="text-foreground font-medium">{demoQ.data ?? 0}</span> sample records.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={loadDemo}>Load sample workspace</Button>
          <Button variant="outline" onClick={removeDemo} disabled={!demoQ.data}>Remove sample only</Button>
          <Button variant="destructive" onClick={wipe}>Clear all data</Button>
        </div>
      </Card>
    </div>
  );
}