import { Card } from "@/components/ui/card";
import { NavControls } from "../nav-controls";
import { Sparkles } from "lucide-react";
import type { OnboardingResponses } from "@/lib/onboarding/types";
import { buildSummary } from "@/lib/onboarding/summary";
import { TRACK_COPY } from "@/lib/onboarding/tracks";
import { resolveTrack } from "@/lib/onboarding/tracks";

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
  const bullets = buildSummary(responses, goalName);
  const track = resolveTrack(responses);
  const trackCopy = TRACK_COPY[track];
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold">Here's what we heard, {name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadence will personalize your setup based on how you already work with money.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="text-sm rounded-md border border-border/60 bg-muted/30 p-3">
            {b}
          </li>
        ))}
      </ul>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">Next: {trackCopy.title}</div>
        <p className="text-sm mt-1 text-muted-foreground">{trackCopy.blurb}</p>
      </div>
      <NavControls onBack={onBack} onNext={onNext} nextLabel="Start my setup" />
    </Card>
  );
}