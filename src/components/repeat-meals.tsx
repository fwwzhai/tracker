"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { addDays, dayRange, klDate, mealTypeFor } from "@/lib/time";
import type { Meal } from "@/lib/types";

/** "Same as before" for the current meal slot: what you usually eat at this time, one tap to log. */
export function RepeatMeals() {
  const { meals, repeatMeal, loaded } = useStore();
  const [past, setPast] = useState<Meal[]>([]);
  const type = mealTypeFor();
  const today = klDate();

  useEffect(() => {
    if (!loaded) return;
    supabase()
      .from("meals")
      .select("*")
      .eq("meal_type", type)
      .gte("eaten_at", dayRange(addDays(today, -21))[0])
      .lt("eaten_at", dayRange(today)[0])
      .order("eaten_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setPast(data ?? []));
  }, [loaded, type, today]);

  const loggedNow = new Set(meals.filter((m) => m.meal_type === type).map((m) => m.name));
  // most frequent first
  const freq = new Map<string, { m: Meal; n: number }>();
  for (const m of past) freq.set(m.name, { m: freq.get(m.name)?.m ?? m, n: (freq.get(m.name)?.n ?? 0) + 1 });
  const options = [...freq.values()].filter((x) => !loggedNow.has(x.m.name)).sort((a, b) => b.n - a.n).slice(0, 3);
  if (!options.length) return null;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" aria-label={`Usual ${type}`}>
      {options.map(({ m }) => (
        <button
          key={m.id}
          onClick={() => repeatMeal(m)}
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-accent px-4 text-sm text-accent transition-transform duration-150 active:scale-95"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          <span className="max-w-44 truncate">{m.name}</span>
          <span className="num">{m.kcal}</span>
        </button>
      ))}
    </div>
  );
}
