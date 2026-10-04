"use client";

import { CloudOff, Repeat } from "lucide-react";
import { fmtMoney } from "@/lib/money";
import { fmtTime } from "@/lib/time";
import type { Category, Expense, Meal } from "@/lib/types";

export function ExpenseRow({ e, categories, showDate }: { e: Expense; categories: Category[]; showDate?: boolean }) {
  const cat = categories.find((c) => c.id === e.category_id)?.name ?? "Other";
  const when = showDate
    ? new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short" }).format(new Date(e.spent_at))
    : fmtTime(e.spent_at);
  return (
    <div className="anim-row flex min-h-14 items-center gap-3 border-b border-line py-2">
      <span className="w-14 shrink-0 text-xs text-muted">{when}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate">{e.note || cat}</p>
        <p className="flex min-h-4 items-center gap-1 text-xs text-muted">
          {e.note ? cat : null}
          {e.recurring_id && <Repeat size={12} strokeWidth={1.75} aria-label="Recurring" />}
          {e.pending && <CloudOff size={12} strokeWidth={1.75} aria-label="Waiting to sync" />}
        </p>
      </div>
      <span className="num text-lg">{fmtMoney(e.amount_cents)}</span>
    </div>
  );
}

export function MealRow({ m }: { m: Meal }) {
  return (
    <div className="anim-row flex min-h-14 items-center gap-3 border-b border-line py-2">
      <span className="w-14 shrink-0 text-xs text-muted">{fmtTime(m.eaten_at)}</span>
      {m.thumb_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny inline data URL thumbnail
        <img src={m.thumb_url} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate">{m.name}</p>
        <p className="text-xs capitalize text-muted">
          {m.meal_type} · P {Math.round(m.protein)} C {Math.round(m.carbs)} F {Math.round(m.fat)}
        </p>
      </div>
      <span className="num text-lg">
        {m.kcal}
        <span className="ml-1 font-sans text-xs text-muted">kcal</span>
      </span>
    </div>
  );
}
