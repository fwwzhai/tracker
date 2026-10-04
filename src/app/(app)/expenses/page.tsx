"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { supabase } from "@/lib/supabase/client";
import { byCategory, dailySeries, level, monthSummary } from "@/lib/budget";
import { fmtMoney, fmtMoneyShort } from "@/lib/money";
import { daysInMonth, klDate, klMonth, monthRange } from "@/lib/time";
import type { Expense } from "@/lib/types";
import { Bar } from "@/components/bar";
import { BarChart } from "@/components/bar-chart";
import { ExpenseRow } from "@/components/rows";
import { SwipeRow } from "@/components/swipe-row";
import { PresetRail } from "@/components/preset-rail";

function shift(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default function Expenses() {
  const store = useStore();
  const { open } = useUi();
  const current = klMonth();
  const [month, setMonth] = useState(current);
  const [past, setPast] = useState<{ month: string; rows: Expense[] } | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (month === current) return;
    const [s, e] = monthRange(month);
    supabase()
      .from("expenses")
      .select("*")
      .gte("spent_at", s)
      .lt("spent_at", e)
      .order("spent_at", { ascending: false })
      .then(({ data }) => setPast({ month, rows: data ?? [] }));
  }, [month, current]);

  const rows = useMemo(
    () => (month === current ? store.expenses : past?.month === month ? past.rows : []),
    [month, current, store.expenses, past],
  );
  const loading = month !== current && past?.month !== month;
  const days = daysInMonth(month);
  const today = month === current ? +klDate().slice(8) : days;
  const spent = rows.reduce((t, r) => t + r.amount_cents, 0);
  const budget = store.profile?.monthly_budget_cents ?? 0;
  const s = monthSummary(spent, budget, today, days);
  const cats = byCategory(rows);
  const series = dailySeries(rows.map((r) => ({ amount_cents: r.amount_cents, day: +klDate(new Date(r.spent_at)).slice(8) })), days);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const cat = store.categories.find((c) => c.id === r.category_id)?.name ?? "";
      return `${r.note ?? ""} ${cat} ${(r.amount_cents / 100).toFixed(2)}`.toLowerCase().includes(t);
    });
  }, [q, rows, store.categories]);

  const monthLabel = new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div>
      <header className="flex h-12 items-center justify-between">
        <button aria-label="Previous month" onClick={() => setMonth(shift(month, -1))} className="-ml-3 flex h-11 w-11 items-center justify-center text-muted">
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <p className="label">{monthLabel}</p>
        <button
          aria-label="Next month"
          disabled={month === current}
          onClick={() => setMonth(shift(month, 1))}
          className="-mr-3 flex h-11 w-11 items-center justify-center text-muted disabled:opacity-30"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </header>

      <section className="pt-2">
        <p className="label">{budget ? (s.left >= 0 ? "Left this month" : "Over budget") : "Spent this month"}</p>
        <p className={`num mt-1 text-6xl ${s.level === "over" ? "text-danger" : ""}`}>
          {fmtMoneyShort(budget ? Math.abs(s.left) : spent)}
        </p>
        {budget > 0 && (
          <>
            <Bar pct={s.pct} level={s.level} className="mt-3" />
            <p className="mt-2 flex justify-between text-sm text-muted">
              <span>{fmtMoney(spent)} of {fmtMoneyShort(budget)}</span>
              {month === current && <span>Safe per day <span className="num text-base text-ink">{fmtMoney(s.safePerDay)}</span></span>}
            </p>
          </>
        )}
        {!budget && (
          <Link href="/settings" className="mt-1 block text-sm text-muted">
            Set a monthly budget in Settings to see what is left.
          </Link>
        )}
      </section>

      {month === current && (
        <section className="mt-6">
          <PresetRail />
        </section>
      )}

      <section className="mt-6">
        <p className="label mb-2">Daily spend</p>
        <BarChart
          values={series}
          labels={series.map((_, i) => `${i + 1} ${monthLabel.split(" ")[0].slice(0, 3)}`)}
          format={(v) => fmtMoney(v)}
          reference={budget ? budget / days : undefined}
          highlight={month === current ? today - 1 : undefined}
          ariaLabel="Spend per day this month"
        />
      </section>

      <section className="mt-6">
        <p className="label mb-1">By category</p>
        {store.categories.map((c) => {
          const v = cats.get(c.id) ?? 0;
          const b = c.monthly_budget_cents ?? 0;
          if (!v && !b) return null;
          return (
            <div key={c.id} className="border-b border-line py-3">
              <div className="flex items-baseline justify-between">
                <span>{c.name}</span>
                <span className="num text-lg">
                  {fmtMoney(v)}
                  {b > 0 && <span className="font-sans text-sm text-muted"> / {fmtMoneyShort(b)}</span>}
                </span>
              </div>
              {b > 0 ? (
                <Bar pct={v / b} level={level(v, b)} className="mt-2" />
              ) : (
                <Bar pct={spent ? v / spent : 0} className="mt-2 opacity-50" />
              )}
            </div>
          );
        })}
        {!rows.length && !loading && <p className="py-4 text-muted">Nothing spent in {monthLabel.split(" ")[0]}. Tap + to log one.</p>}
      </section>

      <section className="mt-6">
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-3">
          <Search size={16} strokeWidth={1.75} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, categories, amounts" className="h-full flex-1 bg-transparent outline-none" />
        </label>
        <div className="mt-2">
          {filtered.map((e) => (
            <SwipeRow
              key={e.id}
              onTap={() => open({ kind: "expense", expense: e })}
              onDelete={() => {
                store.deleteExpense(e.id);
                store.toast("Expense deleted", () => store.updateExpense(e));
                if (month !== current) setPast((p) => p && { ...p, rows: p.rows.filter((x) => x.id !== e.id) });
              }}
            >
              <ExpenseRow e={e} categories={store.categories} showDate />
            </SwipeRow>
          ))}
          {q && !filtered.length && <p className="py-4 text-muted">No match for &ldquo;{q}&rdquo;.</p>}
        </div>
      </section>
    </div>
  );
}
