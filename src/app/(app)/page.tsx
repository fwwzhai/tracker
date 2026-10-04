"use client";

import Link from "next/link";
import { Camera, CloudOff, Receipt, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { monthSummary } from "@/lib/budget";
import { stepsKcal } from "@/lib/calories";
import { fmtMoney, fmtMoneyShort } from "@/lib/money";
import { daysInMonth, fmtDay, klDate, klMonth } from "@/lib/time";
import { Bar } from "@/components/bar";
import { Ring } from "@/components/ring";
import { ExpenseRow, MealRow } from "@/components/rows";
import { SwipeRow } from "@/components/swipe-row";
import { PresetRail } from "@/components/preset-rail";
import { CoachCard } from "@/components/coach-card";
import { RepeatMeals } from "@/components/repeat-meals";

export default function Home() {
  const s = useStore();
  const { open } = useUi();
  const today = klDate();
  const p = s.profile;

  const goal = p?.kcal_goal ?? 0;
  const eaten = s.meals.reduce((t, m) => t + m.kcal, 0);
  const steps = s.steps.find((x) => x.date === today)?.steps ?? 0;
  const burned = stepsKcal(steps, p?.steps_factor ?? 0.04);
  const left = goal - eaten + burned;

  const month = klMonth();
  const spent = s.expenses.reduce((t, e) => t + e.amount_cents, 0);
  const budget = p?.monthly_budget_cents ?? 0;
  const money = monthSummary(spent, budget, +today.slice(8), daysInMonth(month));
  const stepsGoal = p?.steps_goal ?? 8000;

  const timeline = [
    ...s.meals.map((m) => ({ kind: "meal" as const, at: m.eaten_at, m })),
    ...s.expenses.filter((e) => klDate(new Date(e.spent_at)) === today).map((e) => ({ kind: "expense" as const, at: e.spent_at, e })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="pb-32">
      <header className="flex h-11 items-center justify-between">
        <p className="label flex items-center gap-2">
          {fmtDay(today)}
          {!s.online && <CloudOff size={13} strokeWidth={1.75} aria-label="Offline" />}
        </p>
        <Link href="/settings" aria-label="Settings" className="-mr-3 flex h-11 w-11 items-center justify-center text-muted">
          <Settings size={20} strokeWidth={1.75} />
        </Link>
      </header>

      <section className="flex items-center justify-between gap-4 pt-2">
        <div className="min-w-0">
          <p className="label">{left >= 0 ? "Calories left" : "Calories over"}</p>
          <p className={`num text-7xl leading-none ${left < 0 ? "text-danger" : ""}`}>{goal ? Math.abs(left).toLocaleString("en-MY") : "—"}</p>
          <p className="mt-3 text-[13px] text-muted">
            <span className="text-ink">{eaten}</span> eaten · <span className="text-ink">{goal}</span> goal · <span className="text-ink">+{burned}</span> steps est.
          </p>
        </div>
        <div className="relative shrink-0">
          <Ring pct={goal ? eaten / (goal + burned) : 0} size={96} over={left < 0} />
          <span className="num absolute inset-0 flex items-center justify-center text-lg text-muted">
            {goal ? Math.round((eaten / (goal + burned)) * 100) : 0}%
          </span>
        </div>
      </section>

      <Link href="/expenses" className="mt-6 block border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <p className="label">{budget ? (money.left >= 0 ? "Budget left this month" : "Over budget") : "Spent this month"}</p>
          {budget > 0 && (
            <p className="text-sm text-muted">
              <span className="num text-base text-ink">{fmtMoney(money.safePerDay)}</span> a day
            </p>
          )}
        </div>
        <p className={`num mt-1 text-4xl ${money.level === "over" ? "text-danger" : ""}`}>
          {fmtMoneyShort(budget ? Math.abs(money.left) : spent)}
        </p>
        {budget > 0 && <Bar pct={money.pct} level={money.level} className="mt-2" />}
      </Link>

      <Link href="/steps" className="mt-4 block border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <p className="label">Steps today</p>
          <p className="text-sm text-muted">
            goal <span className="num text-base text-ink">{stepsGoal.toLocaleString("en-MY")}</span>
          </p>
        </div>
        <p className="num mt-1 text-4xl">{steps.toLocaleString("en-MY")}</p>
        <Bar pct={stepsGoal ? steps / stepsGoal : 0} className="mt-2" />
      </Link>

      <CoachCard />

      <section className="mt-6">
        <p className="label mb-1">Today</p>
        {timeline.length === 0 && s.loaded && (
          <p className="py-4 text-muted">
            Nothing logged yet. Tap + and snap your first meal, or use a preset below for a quick expense.
          </p>
        )}
        {timeline.map((t) =>
          t.kind === "meal" ? (
            <SwipeRow key={t.m.id} onTap={() => open({ kind: "meal-edit", meal: t.m })} onDelete={() => s.deleteMeal(t.m.id)}>
              <MealRow m={t.m} />
            </SwipeRow>
          ) : (
            <SwipeRow
              key={t.e.id}
              onTap={() => open({ kind: "expense", expense: t.e })}
              onDelete={() => {
                s.deleteExpense(t.e.id);
                s.toast("Expense deleted", () => s.updateExpense(t.e));
              }}
            >
              <ExpenseRow e={t.e} categories={s.categories} />
            </SwipeRow>
          ),
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-bg pb-2 pt-2">
        <div className="mx-auto max-w-md px-4">
          <RepeatMeals />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-ink transition-transform duration-150 active:scale-[0.98]">
              <Camera size={20} strokeWidth={1.75} /> Meal photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) open({ kind: "meal", file });
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => open({ kind: "expense" })}
              className="flex h-12 items-center justify-center gap-2 rounded-md border border-ink font-medium transition-transform duration-150 active:scale-[0.98]"
            >
              <Receipt size={20} strokeWidth={1.75} /> Expense
            </button>
          </div>
          <PresetRail />
        </div>
      </div>
    </div>
  );
}
