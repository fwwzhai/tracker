import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayRange, daysInMonth, klDate, klHour, klMonth, monthRange } from "./time";

/** Compact numeric context for the coach. Totals only, never raw logs, to keep tokens low. */
export async function buildSummary(sb: SupabaseClient): Promise<string> {
  const today = klDate();
  const weekStart = dayRange(addDays(today, -6))[0];
  const [ms, me] = monthRange(klMonth());
  const [p, meals, steps, spend] = await Promise.all([
    sb.from("profiles").select("kcal_goal,protein_g,carb_g,fat_g,goal,weight_kg,steps_goal,monthly_budget_cents").single(),
    sb.from("meals").select("eaten_at,meal_type,kcal,protein,carbs,fat").gte("eaten_at", weekStart),
    sb.from("steps_daily").select("date,steps").gte("date", addDays(today, -6)),
    sb.from("expenses").select("spent_at,amount_cents").gte("spent_at", ms).lt("spent_at", me),
  ]);
  const prof = p.data;
  const byDay = new Map<string, { kcal: number; protein: number; carbs: number; fat: number; types: Set<string> }>();
  for (const m of meals.data ?? []) {
    const d = klDate(new Date(m.eaten_at));
    const t = byDay.get(d) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, types: new Set<string>() };
    t.kcal += m.kcal; t.protein += +m.protein; t.carbs += +m.carbs; t.fat += +m.fat; t.types.add(m.meal_type);
    byDay.set(d, t);
  }
  const t = byDay.get(today);
  const past = [...byDay.entries()].filter(([d]) => d !== today).map(([, v]) => v);
  const avg = (k: "kcal" | "protein") => (past.length ? Math.round(past.reduce((a, v) => a + v[k], 0) / past.length) : null);
  const stepRows = steps.data ?? [];
  const todaySteps = stepRows.find((s) => s.date === today)?.steps ?? 0;
  const stepAvg = stepRows.length ? Math.round(stepRows.reduce((a, s) => a + s.steps, 0) / stepRows.length) : null;
  const spent = (spend.data ?? []).reduce((a, e) => a + e.amount_cents, 0);
  const spentToday = (spend.data ?? []).filter((e) => klDate(new Date(e.spent_at)) === today).reduce((a, e) => a + e.amount_cents, 0);
  const budget = prof?.monthly_budget_cents ?? 0;
  const daysLeft = daysInMonth(klMonth()) - +today.slice(8) + 1;
  const rm = (c: number) => `RM${(c / 100).toFixed(0)}`;

  return [
    `Local time ${klHour()}:00 Malaysia. Goal: ${prof?.goal ?? "maintain"}, ${prof?.weight_kg ?? "?"}kg.`,
    `Targets/day: ${prof?.kcal_goal ?? "?"} kcal, protein ${prof?.protein_g}g, carbs ${prof?.carb_g}g, fat ${prof?.fat_g}g, ${prof?.steps_goal} steps.`,
    `Today: ${t ? `${t.kcal} kcal, P${Math.round(t.protein)} C${Math.round(t.carbs)} F${Math.round(t.fat)}, meals logged: ${[...t.types].join(", ")}` : "nothing logged"}; ${todaySteps} steps.`,
    `Past ${past.length} logged days avg: ${avg("kcal") ?? "?"} kcal, protein ${avg("protein") ?? "?"}g. 7 day steps avg ${stepAvg ?? "?"}.`,
    budget
      ? `Money: spent ${rm(spent)} of ${rm(budget)} this month, ${rm(spentToday)} today, ${daysLeft} days left, safe ${rm(Math.max(0, (budget - spent) / daysLeft))}/day.`
      : `Money: spent ${rm(spent)} this month, ${rm(spentToday)} today, no budget set.`,
  ].join("\n");
}

export const COACH_STYLE = `You are a calm, practical coach for one person in Malaysia tracking food, spending and steps.
Be specific with numbers from the summary. Suggest local, easy options (e.g. telur rebus, ayam panggang, tauhu, sayur).
No medical claims, no moralising, no emoji, no lists unless asked.`;
