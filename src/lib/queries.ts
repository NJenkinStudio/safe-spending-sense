import { supabase } from "@/integrations/supabase/client";
import type { Account, FinancialRule, RuleChange } from "./forecast/types";

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from("accounts").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as Account[];
}

export async function fetchRules(): Promise<FinancialRule[]> {
  const { data, error } = await supabase.from("financial_rules").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as FinancialRule[];
}

export async function fetchRuleChanges(): Promise<RuleChange[]> {
  const { data, error } = await supabase.from("rule_changes").select("*");
  if (error) throw error;
  return (data ?? []) as unknown as RuleChange[];
}

export async function fetchProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOnboardingResponses() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("onboarding_responses")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPlanningGoals() {
  const { data, error } = await supabase.from("planning_goals").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function countDemoRecords() {
  const [accts, rules] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("is_demo", true),
    supabase.from("financial_rules").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  return (accts.count ?? 0) + (rules.count ?? 0);
}