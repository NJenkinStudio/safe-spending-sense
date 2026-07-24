import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChoiceCards } from "../choice-card";
import { NavControls } from "../nav-controls";
import type { OnboardingResponses } from "@/lib/onboarding/types";

const OPTS = [
  { value: "all", label: "Yes, I've added everything" },
  { value: "most", label: "Most of them" },
  { value: "some", label: "Just a few — I'll add more later" },
  { value: "unsure", label: "I'm not sure" },
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
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">How complete is your setup?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cadence works from what you tell it. Rough answers are fine — you can refine anytime.
        </p>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Have you added all your bills and subscriptions?</div>
        <ChoiceCards
          options={OPTS}
          value={responses.all_bills_added}
          onChange={(v) => onChange({ ...responses, all_bills_added: v as string })}
        />
        {responses.all_bills_added && responses.all_bills_added !== "all" && (
          <div className="mt-2">
            <Label>Roughly how many bills are still missing? <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
        <div className="text-sm font-medium mb-2">Have you added all your sources of income?</div>
        <ChoiceCards
          options={OPTS}
          value={responses.all_income_sources_added}
          onChange={(v) => onChange({ ...responses, all_income_sources_added: v as string })}
        />
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Have you connected or added all your accounts?</div>
        <ChoiceCards
          options={OPTS}
          value={responses.all_accounts_added}
          onChange={(v) => onChange({ ...responses, all_accounts_added: v as string })}
        />
      </div>

      <NavControls onBack={onBack} onNext={onNext} disabled={!responses.all_bills_added || !responses.all_income_sources_added || !responses.all_accounts_added} />
    </Card>
  );
}