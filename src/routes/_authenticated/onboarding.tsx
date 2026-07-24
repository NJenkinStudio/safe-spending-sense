import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData } from "@/lib/seed";
import { fetchAccounts, fetchOnboardingResponses, fetchProfile, fetchRuleChanges, fetchRules } from "@/lib/queries";
import { Stepper, type StepMeta } from "@/components/onboarding/stepper";
import { AboutYouStep } from "@/components/onboarding/steps/about-you";
import { WhatIsCadenceStep } from "@/components/onboarding/steps/what-is-cadence";
import { FinancialHabitsStep } from "@/components/onboarding/steps/financial-habits";
import { PlanningGoalStep } from "@/components/onboarding/steps/planning-goal";
import { SummaryStep } from "@/components/onboarding/steps/summary";
import { SetupStep } from "@/components/onboarding/steps/setup";
import { CompletenessStep } from "@/components/onboarding/steps/completeness";
import { BuyingPowerRevealStep } from "@/components/onboarding/steps/buying-power";
import { WelcomeStep } from "@/components/onboarding/steps/welcome";
import {
  EMPTY_GOAL,
  EMPTY_PROFILE,
  EMPTY_RESPONSES,
  type OnboardingProfile,
  type OnboardingResponses,
  type PlanningGoalDraft,
} from "@/lib/onboarding/types";
import { resolveTrack } from "@/lib/onboarding/tracks";
import { computeBuyingPower, type BuyingPowerSummary } from "@/lib/onboarding/buying-power";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Cadence" },
      { name: "description", content: "Personalized Cadence setup — a few short questions, then your first Buying Power view." },
    ],
  }),
  component: Onboarding,
});

const STEP_LIST: StepMeta[] = [
  { id: "about", label: "About you" },
  { id: "what", label: "How Cadence works" },
  { id: "habits", label: "Your habits" },
  { id: "goal", label: "Planning goal", optional: true },
  { id: "summary", label: "Personalization" },
  { id: "setup", label: "Setup" },
  { id: "completeness", label: "Completeness" },
  { id: "buying-power", label: "Buying Power" },
  { id: "welcome", label: "Welcome" },
];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const responsesQ = useQuery({ queryKey: ["onboarding_responses"], queryFn: fetchOnboardingResponses });
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const changesQ = useQuery({ queryKey: ["rule_changes"], queryFn: fetchRuleChanges });

  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile>(EMPTY_PROFILE);
  const [responses, setResponses] = useState<OnboardingResponses>(EMPTY_RESPONSES);
  const [goal, setGoal] = useState<PlanningGoalDraft>(EMPTY_GOAL);

  // Hydrate from server on first load
  useEffect(() => {
    const _p = profileQ.data;
    if (_p) {
      setProfile((prev) => ({
        ...prev,
        first_name: _p.first_name ?? "",
        last_name: _p.last_name ?? "",
        preferred_name: _p.preferred_name ?? "",
        age_range: _p.age_range ?? "",
        occupation: _p.occupation ?? "",
        employment_status: _p.employment_status ?? "",
        household_status: _p.household_status ?? "",
        preferred_currency: _p.preferred_currency ?? "USD",
      }));
    }
    const _r = responsesQ.data;
    if (_r) {
      setResponses((prev) => ({
        ...prev,
        money_management_style: _r.money_management_style ?? "",
        current_budgeting_app: _r.current_budgeting_app ?? "",
        account_structure: _r.account_structure ?? "",
        income_predictability: _r.income_predictability ?? "",
        spending_confidence: _r.spending_confidence ?? "",
        bill_preparation_style: _r.bill_preparation_style ?? "",
        primary_financial_goals: _r.primary_financial_goals ?? [],
        planning_goal_enabled: _r.planning_goal_enabled ?? false,
        all_bills_added: _r.all_bills_added ?? "",
        estimated_bills_remaining: _r.estimated_bills_remaining ?? null,
        all_income_sources_added: _r.all_income_sources_added ?? "",
        estimated_income_sources_remaining: _r.estimated_income_sources_remaining ?? null,
        all_accounts_added: _r.all_accounts_added ?? "",
        account_setup_completeness: _r.account_setup_completeness ?? "",
      }));
      if (_r.current_step) setStepIndex(_r.current_step);
    }
  }, [profileQ.data, responsesQ.data]);

  const uid = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const persistProfile = async () => {
    const id = await uid();
    if (!id) return;
    await supabase.from("profiles").update({
      first_name: profile.first_name || null,
      last_name: profile.last_name || null,
      preferred_name: profile.preferred_name || null,
      age_range: profile.age_range || null,
      occupation: profile.occupation || null,
      employment_status: profile.employment_status || null,
      household_status: profile.household_status || null,
      preferred_currency: profile.preferred_currency || "USD",
      display_name: (profile.preferred_name || profile.first_name || "").trim() || null,
    }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const persistResponses = async (nextIndex: number) => {
    const id = await uid();
    if (!id) return;
    await supabase.from("onboarding_responses").upsert({
      user_id: id,
      current_step: nextIndex,
      money_management_style: responses.money_management_style || null,
      current_budgeting_app: responses.current_budgeting_app || null,
      account_structure: responses.account_structure || null,
      income_predictability: responses.income_predictability || null,
      spending_confidence: responses.spending_confidence || null,
      bill_preparation_style: responses.bill_preparation_style || null,
      primary_financial_goals: responses.primary_financial_goals,
      planning_goal_enabled: responses.planning_goal_enabled,
      all_bills_added: responses.all_bills_added || null,
      estimated_bills_remaining: responses.estimated_bills_remaining,
      all_income_sources_added: responses.all_income_sources_added || null,
      estimated_income_sources_remaining: responses.estimated_income_sources_remaining,
      all_accounts_added: responses.all_accounts_added || null,
      account_setup_completeness: responses.account_setup_completeness || null,
    } as never, { onConflict: "user_id" });
  };

  const advance = async (delta = 1) => {
    const next = Math.min(Math.max(0, stepIndex + delta), STEP_LIST.length - 1);
    setBusy(true);
    try {
      await persistResponses(next);
      setStepIndex(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  const saveGoal = async () => {
    const id = await uid();
    if (!id) return;
    if (!goal.name.trim() || !Number(goal.target_amount)) return;
    await supabase.from("planning_goals").insert({
      user_id: id,
      name: goal.name.trim(),
      target_amount: Number(goal.target_amount),
      amount_already_saved: Number(goal.amount_already_saved || 0),
      desired_date: goal.desired_date || null,
      category: goal.category || null,
    } as never);
    setResponses((r) => ({ ...r, planning_goal_enabled: true }));
  };

  const loadDemo = async () => {
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error("Not signed in");
      await seedDemoData(id);
      await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", id);
      await qc.invalidateQueries();
      toast.success("Sample workspace loaded. You can remove it anytime from Settings.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sample");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const id = await uid();
    if (id) {
      await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["profile"] });
    }
    navigate({ to: "/dashboard" });
  };

  const displayName = profile.preferred_name || profile.first_name || "there";

  const buyingPower: BuyingPowerSummary | null = useMemo(() => {
    if (!accountsQ.data || !rulesQ.data) return null;
    if (accountsQ.data.length === 0) return null;
    return computeBuyingPower({
      accounts: accountsQ.data,
      rules: rulesQ.data,
      changes: changesQ.data ?? [],
    });
  }, [accountsQ.data, rulesQ.data, changesQ.data]);

  const refreshData = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["accounts"] }),
      qc.invalidateQueries({ queryKey: ["rules"] }),
    ]);
  };

  const currentId = STEP_LIST[stepIndex].id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={STEP_LIST} currentIndex={stepIndex} />

      {currentId === "about" && (
        <AboutYouStep
          profile={profile}
          onChange={setProfile}
          busy={busy}
          onNext={async () => {
            await persistProfile();
            await advance(1);
          }}
        />
      )}

      {currentId === "what-is-cadence" && (
        <WhatIsCadenceStep
          name={displayName}
          busy={busy}
          onBegin={() => advance(1)}
          onExplore={loadDemo}
          onBack={() => advance(-1)}
        />
      )}

      {currentId === "habits" && (
        <FinancialHabitsStep
          responses={responses}
          onChange={setResponses}
          onBack={() => advance(-1)}
          onNext={() => advance(1)}
          busy={busy}
        />
      )}

      {currentId === "goal" && (
        <PlanningGoalStep
          goal={goal}
          onChange={setGoal}
          onBack={() => advance(-1)}
          onSkip={() => advance(1)}
          busy={busy}
          onNext={async () => {
            await saveGoal();
            await advance(1);
          }}
        />
      )}

      {currentId === "summary" && (
        <SummaryStep
          name={displayName}
          responses={responses}
          goalName={goal.name || null}
          onBack={() => advance(-1)}
          onNext={() => advance(1)}
        />
      )}

      {currentId === "setup" && (
        <SetupStep
          track={resolveTrack(responses)}
          accounts={accountsQ.data ?? []}
          onRefresh={refreshData}
          onBack={() => advance(-1)}
          onNext={() => advance(1)}
        />
      )}

      {currentId === "completeness" && (
        <CompletenessStep
          responses={responses}
          onChange={setResponses}
          onBack={() => advance(-1)}
          onNext={() => advance(1)}
        />
      )}

      {currentId === "buying-power" && (
        <BuyingPowerRevealStep
          summary={buyingPower}
          name={displayName}
          onBack={() => advance(-1)}
          onNext={() => advance(1)}
        />
      )}

      {currentId === "welcome" && <WelcomeStep name={displayName} onFinish={finish} />}
    </div>
  );
}