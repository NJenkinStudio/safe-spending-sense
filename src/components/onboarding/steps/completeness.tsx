import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "../choice-card";
import { NavControls } from "../nav-controls";
import type { OnboardingResponses } from "@/lib/onboarding/types";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function CompletenessStep({
  responses,
  onChange,
  onBack,
  onNext,
}: {
  responses: OnboardingResponses;
  onChange: (r: OnboardingResponses) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Almost done</h2>
        <p className="text-sm text-muted-foreground mt-1">Two quick checks. You can refine later.</p>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Have you added all of your bills?</div>
        <ChoiceCards
          options={YES_NO}
          value={responses.all_bills_added}
          onChange={(v) => onChange({ ...responses, all_bills_added: v as string })}
        />
        {responses.all_bills_added === "no" && (
          <div className="mt-3">
            <Label>Approximately how many are still missing? <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="number"
              min="0"
              value={responses.estimated_bills_remaining ?? ""}
              onChange={(e) => onChange({ ...responses, estimated_bills_remaining: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Have you added all of your income?</div>
        <ChoiceCards
          options={YES_NO}
          value={responses.all_income_sources_added}
          onChange={(v) => onChange({ ...responses, all_income_sources_added: v as string })}
        />
        {responses.all_income_sources_added === "no" && (
          <div className="mt-3">
            <Label>Approximately how many are still missing? <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="number"
              min="0"
              value={responses.estimated_income_sources_remaining ?? ""}
              onChange={(e) => onChange({ ...responses, estimated_income_sources_remaining: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        )}
      </div>

      <NavControls
        onBack={onBack}
        onNext={onNext}
        disabled={!responses.all_bills_added || !responses.all_income_sources_added}
      />
    </Card>
  );
}