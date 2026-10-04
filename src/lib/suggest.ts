import { klHour } from "./time";
import type { Category, Expense } from "./types";

/**
 * Category to pre-select on the expense keypad: the one most used around this time of day
 * (within 2 hours, any day this month), else the most recent, else the first category.
 */
export function suggestCategory(expenses: Expense[], categories: Category[], now: Date = new Date()): string | null {
  const valid = new Set(categories.map((c) => c.id));
  const h = klHour(now);
  const near = (e: Expense) => {
    const d = Math.abs(klHour(new Date(e.spent_at)) - h);
    return Math.min(d, 24 - d) <= 2;
  };
  const counts = new Map<string, number>();
  for (const e of expenses) if (e.category_id && valid.has(e.category_id) && near(e)) counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top) return top;
  const last = expenses.find((e) => e.category_id && valid.has(e.category_id));
  return last?.category_id ?? categories[0]?.id ?? null;
}
