import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavControls } from "../nav-controls";
import type { PlanningGoalDraft } from "@/lib/onboarding/types";

const CATEGORIES = [
  "Emergency Fund", "Vehicle", "Travel", "Technology", "Home", "Education", "Entertainment", "Other",
];

const EXAMPLES = "e.g. New laptop, Family vacation, Car repair fund, Gaming PC, New phone, Concert trip, Emergency fund";

export function PlanningGoalStep({
  goal,
  onChange,
  onBack,
  onNext,
  onSkip,
  busy,
}: {
  goal: PlanningGoalDraft;
  onChange: (g: PlanningGoalDraft) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  busy?: boolean;
}) {
  const valid = goal.name.trim() && Number(goal.target_amount) > 0;
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Your first planning goal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This gives Cadence something meaningful to plan toward. You can change or remove it later.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Goal name</Label>
          <Input
            placeholder={EXAMPLES}
            value={goal.name}
            onChange={(e) => onChange({ ...goal, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Target price</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={goal.target_amount}
              onChange={(e) => onChange({ ...goal, target_amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Already saved <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="number"
              step="0.01"
              value={goal.amount_already_saved}
              onChange={(e) => onChange({ ...goal, amount_already_saved: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Desired date <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="date"
              value={goal.desired_date}
              onChange={(e) => onChange({ ...goal, desired_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={goal.category} onValueChange={(v) => onChange({ ...goal, category: v })}>
              <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <NavControls onBack={onBack} onSkip={onSkip} onNext={onNext} disabled={!valid} busy={busy} />
    </Card>
  );
}