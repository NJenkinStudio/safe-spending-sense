import { Check } from "lucide-react";

export interface StepMeta {
  id: string;
  label: string;
  optional?: boolean;
}

export function Stepper({ steps, currentIndex }: { steps: StepMeta[]; currentIndex: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Onboarding progress">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={[
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border transition-colors text-[11px] font-medium",
                done ? "bg-primary text-primary-foreground border-primary" : "",
                active ? "border-primary text-primary" : "",
                !done && !active ? "border-border text-muted-foreground" : "",
              ].join(" ")}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`hidden md:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
              {s.optional ? <span className="ml-1 text-[10px] text-muted-foreground">(optional)</span> : null}
            </span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}