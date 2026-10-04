export type Level = "ok" | "warn" | "over";

/** Colour only changes at 80% and 100%. */
export function level(spent: number, budget: number): Level {
  if (budget <= 0) return "ok";
  const pct = spent / budget;
  return pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "ok";
}

/**
 * Month summary. `dayOfMonth` is today's KL day (1 based). Safe per day spreads what is
 * left across the remaining days including today. Amounts in cents.
 */
export function monthSummary(spentCents: number, budgetCents: number, dayOfMonth: number, days: number) {
  const left = budgetCents - spentCents;
  const remainingDays = Math.max(1, days - dayOfMonth + 1);
  return {
    spent: spentCents,
    budget: budgetCents,
    left,
    pct: budgetCents > 0 ? Math.min(1, spentCents / budgetCents) : 0,
    safePerDay: left > 0 ? Math.floor(left / remainingDays) : 0,
    remainingDays,
    level: level(spentCents, budgetCents),
  };
}

export function byCategory<T extends { amount_cents: number; category_id: string | null }>(rows: T[]) {
  const m = new Map<string | null, number>();
  for (const r of rows) m.set(r.category_id, (m.get(r.category_id) ?? 0) + r.amount_cents);
  return m;
}

/** Spend per day of month, index 0 = day 1. */
export function dailySeries(rows: { amount_cents: number; day: number }[], days: number): number[] {
  const out = new Array(days).fill(0);
  for (const r of rows) if (r.day >= 1 && r.day <= days) out[r.day - 1] += r.amount_cents;
  return out;
}
