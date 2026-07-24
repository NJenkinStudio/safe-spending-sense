import { Card } from "@/components/ui/card";
import { NavControls } from "../nav-controls";
import { Check } from "lucide-react";
import type { OnboardingResponses } from "@/lib/onboarding/types";
import { buildSummaryBullets } from "@/lib/onboarding/summary";

export function SummaryStep({
  name,
  responses,
  goalName,
  onBack,
  onNext,
}: {
  name: string;
  responses: OnboardingResponses;
  goalName: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const bullets = buildSummaryBullets(responses, goalName);
  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Here's what we heard, {name}</h2>
        <p className="text-sm text-muted-foreground mt-1">A quick confirmation before we set things up.</p>
      </div>
      <ul className="space-y-2">
        {bullets.map((b: string, i: number) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: b }} />
          </li>
        ))}
      </ul>
      <NavControls onBack={onBack} onNext={onNext} nextLabel="Looks right" />
    </Card>
  );
}