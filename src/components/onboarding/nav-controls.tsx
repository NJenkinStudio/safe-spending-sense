import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavControls({
  onBack,
  onNext,
  onSkip,
  nextLabel = "Continue",
  disabled,
  busy,
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex justify-between pt-2 gap-2">
      <div>
        {onBack && (
          <Button variant="ghost" onClick={onBack} type="button">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} type="button">
            <SkipForward className="h-4 w-4 mr-2" /> Skip for now
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} disabled={disabled || busy} type="button">
            {busy ? "Saving…" : nextLabel} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}