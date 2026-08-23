# Quick Actions: one-time money moves

Today every entry in Cadence is a recurring rule. This adds lightweight one-time actions — "I spent $20 on food", "got paid", "moved money" — with an optional funding transfer in the same flow.

## What you get

A row of quick-action tiles on the Dashboard and at the top of Income & Transfers:

- **Spent money** — amount, account, optional category/note, date (defaults to today)
- **Got money** — one-time income into an account
- **Moved money** — transfer between two accounts

Each opens a small dialog, not the full rule form.

### The spend flow with funding

Inside "Spent money" there is a **Fund it first** toggle. Turn it on, pick a source account (e.g. Bills), and one submit records both legs: Bills → Operations, then the $20 spend from Operations. Off by default, so the common case stays two fields.

### Balance behaviour

- Entry dated **today or in the past**: the account's current balance is adjusted immediately (and `balance_as_of` moves to that date), so what you see matches reality.
- Entry dated **in the future**: no balance change; it is recorded as a dated one-time entry the forecast applies on that day.

Either way the entry is stored, so the calendar, forecast and timeline show it.

### Seeing them

One-time entries appear in a "Recent activity" list under the tiles on Income & Transfers, newest first, each deletable. Deleting a past entry reverses its balance adjustment.

## Technical notes

- Reuse the existing `financial_rules` table with `frequency: "one_time"` and `rule_type` of `income` / `expense` / `transfer` — no schema change, so the forecast engine already handles them (`engine.ts` one-time and transfer branches).
- New `src/components/quick-actions.tsx`: tile row + dialog, plus `src/lib/quick-actions.ts` holding the write logic (insert rule rows, conditional balance adjustment, funding-transfer pairing) so both pages share one implementation.
- Balance adjustment writes `current_balance` and `balance_as_of` on the affected accounts in the same submit; failures surface via toast and nothing is half-written (transfer + spend inserted together, rolled back on error).
- Mounted in `src/routes/_authenticated/dashboard.tsx` and `src/routes/_authenticated/income.tsx`; recent-activity list lives in the income route.
- Invalidate the `accounts` and `rules` query keys after each action so dashboard, forecast, and calendar refresh.
- No changes to the forecast engine, rule form, bills, or onboarding.
