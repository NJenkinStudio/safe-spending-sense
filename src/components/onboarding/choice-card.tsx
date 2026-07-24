import { Check } from "lucide-react";
import type { ReactNode } from "react";

export interface ChoiceOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

/** Selectable card group. Supports single- or multi-select. */
export function ChoiceCards<T extends string>({
  options,
  value,
  onChange,
  multi,
  columns = 1,
}: {
  options: ChoiceOption<T>[];
  value: T | T[] | "";
  onChange: (next: T | T[]) => void;
  multi?: boolean;
  columns?: 1 | 2;
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = (v: T) => {
    if (multi) {
      const next = new Set(selected as Set<T>);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      onChange(Array.from(next));
    } else {
      onChange(v);
    }
  };
  return (
    <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((o) => {
        const isSelected = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={[
              "text-left rounded-lg border p-3 transition-colors",
              "hover:border-primary/50 hover:bg-primary/5",
              isSelected ? "border-primary bg-primary/10" : "border-border",
            ].join(" ")}
            aria-pressed={isSelected}
          >
            <div className="flex items-start gap-3">
              {o.icon ? <div className="mt-0.5 text-primary shrink-0">{o.icon}</div> : null}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{o.label}</div>
                {o.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>
                )}
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}