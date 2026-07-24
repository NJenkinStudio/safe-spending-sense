import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceCards, type ChoiceOption } from "../choice-card";
import { NavControls } from "../nav-controls";
import type { OnboardingResponses } from "@/lib/onboarding/types";

const Q: {
  key: keyof OnboardingResponses;
  title: string;
  helper?: string;
  options: ChoiceOption[];
  multi?: boolean;
}[] = [
  {
    key: "money_management_style",
    title: "How do you currently manage your money?",
    options: [
      { value: "written-budget", label: "I follow a written or digital budget" },
      { value: "another-app", label: "I use another budgeting or finance app" },
      { value: "mental", label: "I mostly keep track mentally" },
      { value: "check-balance", label: "I check my bank balance to make decisions" },
      { value: "react-to-bills", label: "I usually react to bills as they arrive" },
      { value: "still-figuring", label: "I'm still figuring out a system" },
    ],
  },
  {
    key: "account_structure",
    title: "How many financial accounts do you regularly use?",
    helper: "For example: one account for everyday expenses, one for bills, one for savings.",
    options: [
      { value: "one", label: "One main account" },
      { value: "separate", label: "Separate spending and bills accounts" },
      { value: "multiple", label: "Multiple accounts for different purposes" },
      { value: "unsure", label: "I'm not sure yet" },
    ],
  },
  {
    key: "income_predictability",
    title: "How predictable is your income?",
    options: [
      { value: "consistent", label: "It's consistently the same" },
      { value: "mostly", label: "It's mostly consistent" },
      { value: "changes", label: "It changes frequently" },
      { value: "multiple", label: "I receive income from multiple sources" },
      { value: "none", label: "I don't currently have regular income" },
    ],
  },
  {
    key: "spending_confidence",
    title: "How often do you know exactly what's safe to spend?",
    options: [
      { value: "always", label: "Always" },
      { value: "usually", label: "Usually" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "Rarely" },
      { value: "almost-never", label: "Almost never" },
    ],
  },
  {
    key: "bill_preparation_style",
    title: "When bills are due, what usually happens?",
    options: [
      { value: "set-aside", label: "The money is already set aside" },
      { value: "adjust", label: "I adjust my spending as needed" },
      { value: "next-paycheck", label: "I rely on the next paycheck" },
      { value: "surprise", label: "Bills sometimes surprise me" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    key: "primary_financial_goals",
    title: "What would you like Cadence to help you with?",
    helper: "Select all that apply.",
    multi: true,
    options: [
      { value: "safe-spend", label: "Know what I can safely spend" },
      { value: "protect-bills", label: "Stop accidentally spending bill money" },
      { value: "forecast-paychecks", label: "Forecast future paychecks" },
      { value: "multi-accounts", label: "Manage multiple accounts" },
      { value: "irregular-expenses", label: "Prepare for irregular expenses" },
      { value: "budget-system", label: "Build a consistent budgeting system" },
      { value: "recover", label: "Recover after unexpected expenses" },
      {
        value: "plan-goals",
        label: "Plan future purchases and savings goals",
        description:
          "Understand when you can safely afford something, and how today's decisions affect that timeline.",
      },
    ],
  },
];

export function FinancialHabitsStep({
  responses,
  onChange,
  onBack,
  onNext,
  busy,
}: {
  responses: OnboardingResponses;
  onChange: (r: OnboardingResponses) => void;
  onBack: () => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const [subStep, setSubStep] = useState(0);
  const q = Q[subStep];
  const val = responses[q.key];

  const set = (v: string | string[]) => {
    onChange({ ...responses, [q.key]: v } as OnboardingResponses);
  };

  const next = () => {
    if (subStep < Q.length - 1) setSubStep(subStep + 1);
    else onNext();
  };
  const back = () => {
    if (subStep > 0) setSubStep(subStep - 1);
    else onBack();
  };

  const disabled = q.multi ? !(Array.isArray(val) && val.length > 0) : !val;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Question {subStep + 1} of {Q.length}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold">{q.title}</h2>
        {q.helper && <p className="mt-1 text-sm text-muted-foreground">{q.helper}</p>}
      </div>
      <ChoiceCards
        options={q.options}
        value={val as string | string[]}
        onChange={set as (v: string | string[]) => void}
        multi={q.multi}
        columns={q.options.length > 4 ? 2 : 1}
      />

      {q.key === "money_management_style" && responses.money_management_style === "another-app" && (
        <div>
          <Label>Which app? <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            placeholder="YNAB, Monarch, Copilot…"
            value={responses.current_budgeting_app}
            onChange={(e) => onChange({ ...responses, current_budgeting_app: e.target.value })}
          />
        </div>
      )}

      <NavControls onBack={back} onNext={next} disabled={disabled} busy={busy} />
    </Card>
  );
}