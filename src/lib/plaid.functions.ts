import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAID_HOSTS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

function plaidBase() {
  const env = (process.env.PLAID_ENV || "sandbox").toLowerCase();
  return PLAID_HOSTS[env] ?? PLAID_HOSTS.sandbox;
}

async function plaid<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${plaidBase()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Plaid ${path} failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as T;
}

export const createLinkToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const data = await plaid<{ link_token: string; expiration: string }>(
      "/link/token/create",
      {
        user: { client_user_id: context.userId },
        client_name: "Cadence",
        products: ["auth"],
        country_codes: ["US"],
        language: "en",
      },
    );
    return { link_token: data.link_token };
  });

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: { current: number | null; available: number | null };
};

function mapType(sub: string | null, type: string): string {
  const s = (sub ?? "").toLowerCase();
  if (s === "checking") return "checking";
  if (s === "savings") return "savings";
  if (s === "credit card" || s === "credit_card") return "credit_card";
  if (type === "loan") return "loan";
  if (type === "credit") return "credit_card";
  if (type === "depository") return "checking";
  return "other";
}

export const exchangePublicToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        public_token: z.string().min(1),
        institution_name: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const exch = await plaid<{ access_token: string; item_id: string }>(
      "/item/public_token/exchange",
      { public_token: data.public_token },
    );

    const { data: itemRow, error: itemErr } = await supabase
      .from("plaid_items")
      .insert({
        user_id: userId,
        item_id: exch.item_id,
        access_token: exch.access_token,
        institution_name: data.institution_name ?? null,
      } as never)
      .select("id")
      .single();
    if (itemErr) throw new Error(itemErr.message);
    const itemUuid = (itemRow as { id: string }).id;

    const acc = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", {
      access_token: exch.access_token,
    });

    const today = new Date().toISOString().slice(0, 10);
    const rows = acc.accounts.map((a) => ({
      user_id: userId,
      name: a.name || a.official_name || "Bank account",
      account_type: mapType(a.subtype, a.type),
      current_balance: a.balances.current ?? a.balances.available ?? 0,
      minimum_balance: 0,
      color: "#7A9A7E",
      balance_as_of: today,
      plaid_item_id: itemUuid,
      plaid_account_id: a.account_id,
      institution_name: data.institution_name ?? null,
      last_synced_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error: accErr } = await supabase
        .from("accounts")
        .upsert(rows as never, { onConflict: "user_id,plaid_account_id" });
      if (accErr) throw new Error(accErr.message);
    }

    return { linked_accounts: rows.length };
  });

export const syncPlaidBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: items, error: itemsErr } = await supabase
      .from("plaid_items")
      .select("id, access_token")
      .eq("user_id", userId);
    if (itemsErr) throw new Error(itemsErr.message);

    const today = new Date().toISOString().slice(0, 10);
    let updated = 0;

    for (const item of (items ?? []) as Array<{ id: string; access_token: string }>) {
      const acc = await plaid<{ accounts: PlaidAccount[] }>("/accounts/balance/get", {
        access_token: item.access_token,
      });
      for (const a of acc.accounts) {
        const bal = a.balances.current ?? a.balances.available ?? 0;
        const { error } = await supabase
          .from("accounts")
          .update({
            current_balance: bal,
            balance_as_of: today,
            last_synced_at: new Date().toISOString(),
          } as never)
          .eq("user_id", userId)
          .eq("plaid_account_id", a.account_id);
        if (error) throw new Error(error.message);
        updated += 1;
      }
    }

    return { updated };
  });

export const unlinkPlaidItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plaid_item_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item, error: getErr } = await supabase
      .from("plaid_items")
      .select("access_token")
      .eq("id", data.plaid_item_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (item) {
      try {
        await plaid("/item/remove", {
          access_token: (item as { access_token: string }).access_token,
        });
      } catch {
        // best-effort; still remove locally
      }
    }
    const { error: delErr } = await supabase
      .from("plaid_items")
      .delete()
      .eq("id", data.plaid_item_id)
      .eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });