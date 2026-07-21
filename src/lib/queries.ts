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