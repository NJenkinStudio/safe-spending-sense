import { addMonths, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return format(d, "yyyy-MM-dd");
}

export async function seedDemoData(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const firstNextMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), "yyyy-MM-dd");
  const twoMonths = format(addMonths(new Date(), 2), "yyyy-MM-dd");

  const { data: accounts, error: aErr } = await supabase
    .from("accounts")
    .insert([
      { user_id: userId, name: "Main Account (demo)", account_type: "checking", current_balance: 0, minimum_balance: 100, color: "#7A9A7E", is_demo: true },
      { user_id: userId, name: "Bills Account (demo)", account_type: "bills_checking", current_balance: 251.31, minimum_balance: 500, color: "#B8985C", is_demo: true },
    ])
    .select();
  if (aErr) throw aErr;
  const main = accounts!.find((a) => a.name.startsWith("Main"))!;
  const bills = accounts!.find((a) => a.name.startsWith("Bills"))!;
  const friday = nextFriday();

  const rules = ([
    { user_id: userId, rule_type: "income", name: "Weekly Paycheck", destination_account_id: main.id, amount: 840, frequency: "weekly", start_date: friday, day_of_week: 5, confidence_level: "confirmed" },
    { user_id: userId, rule_type: "transfer", name: "Weekly Bills Transfer", source_account_id: main.id, destination_account_id: bills.id, amount: 500, frequency: "weekly", start_date: friday, day_of_week: 5 },
    { user_id: userId, rule_type: "income", name: "Monthly Bills Deposit", destination_account_id: bills.id, amount: 900, frequency: "monthly", start_date: firstNextMonth, day_of_month: 1, occurrence_limit: 12 },
    { user_id: userId, rule_type: "expense", name: "Dyson", source_account_id: bills.id, amount: 92.75, frequency: "biweekly", start_date: friday, essential: true, occurrence_limit: 2, category: "financed" },
    { user_id: userId, rule_type: "expense", name: "Acima", source_account_id: bills.id, amount: 110.43, frequency: "weekly", start_date: friday, day_of_week: 5, essential: true, occurrence_limit: 35, category: "financed", notes: "18 of 53 completed" },
    { user_id: userId, rule_type: "expense", name: "Insurance", source_account_id: bills.id, amount: 354.95, frequency: "monthly", start_date: firstNextMonth, day_of_month: 1, essential: true, category: "insurance" },
    { user_id: userId, rule_type: "expense", name: "YMCA", source_account_id: bills.id, amount: 60, frequency: "monthly", start_date: twoMonths, day_of_month: 1, essential: false, category: "membership" },
    { user_id: userId, rule_type: "expense", name: "Rent", source_account_id: bills.id, amount: 1200, frequency: "monthly", start_date: firstNextMonth, day_of_month: 1, essential: true, category: "housing" },
    { user_id: userId, rule_type: "expense", name: "Internet", source_account_id: bills.id, amount: 75, frequency: "monthly", start_date: firstNextMonth, day_of_month: 5, essential: true, category: "utilities" },
    { user_id: userId, rule_type: "expense", name: "Electric", source_account_id: bills.id, amount: 120, frequency: "monthly", start_date: firstNextMonth, day_of_month: 10, essential: true, fixed_or_variable: "variable", category: "utilities" },
    { user_id: userId, rule_type: "expense", name: "Streaming", source_account_id: bills.id, amount: 18.99, frequency: "monthly", start_date: today, day_of_month: 15, essential: false, category: "subscription" },
  ] as Array<Record<string, unknown>>).map((r) => ({ ...r, is_demo: true }));
  const { data: insertedRules, error: rErr } = await supabase
    .from("financial_rules")
    .insert(rules as never)
    .select();
  if (rErr) throw rErr;

  const insurance = insertedRules!.find((r) => r.name === "Insurance");
  if (insurance) {
    const changeDate = format(addMonths(new Date(firstNextMonth), 5), "yyyy-MM-dd");
    await supabase.from("rule_changes").insert({
      user_id: userId,
      financial_rule_id: insurance.id,
      effective_date: changeDate,
      field_name: "amount",
      old_value: "354.95",
      new_value: "305",
      notes: "Policy reduction after 5 payments",
      is_demo: true,
    });
  }
}

/**
 * Remove every record that was inserted by `seedDemoData` for this user.
 * Real (non-demo) records are untouched.
 */
export async function removeDemoData(userId: string) {
  // rule_changes first (FK ordering not strictly required with cascade, but safe)
  await supabase.from("rule_changes").delete().eq("user_id", userId).eq("is_demo", true);
  await supabase.from("financial_rules").delete().eq("user_id", userId).eq("is_demo", true);
  await supabase.from("accounts").delete().eq("user_id", userId).eq("is_demo", true);
}