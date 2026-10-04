"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "./sheet";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";
import type { MealType } from "@/lib/time";
import type { Meal } from "@/lib/types";

export function MealEdit() {
  const { sheet, close } = useUi();
  const open = sheet?.kind === "meal-edit";
  return (
    <Sheet open={open} onClose={close} title="Edit meal">
      {open && <Form key={sheet.meal.id} meal={sheet.meal} onDone={close} />}
    </Sheet>
  );
}

const field = "h-11 w-full rounded-md border border-line bg-surface px-3 outline-none focus:border-accent";

function Form({ meal, onDone }: { meal: Meal; onDone: () => void }) {
  const { updateMeal, deleteMeal } = useStore();
  const [m, setM] = useState(meal);
  // Portion rescales from the values at portion 1, locally.
  const setPortion = (p: number) => {
    const f = p / m.portion;
    setM({ ...m, portion: p, kcal: Math.round(m.kcal * f), protein: +(m.protein * f).toFixed(1), carbs: +(m.carbs * f).toFixed(1), fat: +(m.fat * f).toFixed(1) });
  };
  return (
    <div className="space-y-4 pb-2">
      <input className={`${field} text-lg`} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} aria-label="Name" />
      <div className="grid grid-cols-4 gap-2">
        {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
          <label key={k} className="space-y-1">
            <span className="label">{k}</span>
            <input className={`${field} num`} inputMode="decimal" value={m[k]} onChange={(e) => setM({ ...m, [k]: +e.target.value || 0 })} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="label w-16">Portion</span>
        <input type="range" min={0.5} max={2} step={0.25} value={m.portion} onChange={(e) => setPortion(+e.target.value)} className="h-11 flex-1 accent-[var(--accent)]" />
        <span className="num w-10 text-right">{m.portion}x</span>
      </div>
      <div className="flex gap-2">
        {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
          <button key={t} onClick={() => setM({ ...m, meal_type: t })} className={`h-11 flex-1 rounded-full border text-sm capitalize ${m.meal_type === t ? "border-ink bg-ink text-bg" : "border-line"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <button
          aria-label="Delete meal"
          onClick={() => {
            deleteMeal(meal.id);
            onDone();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-md border border-line text-danger"
        >
          <Trash2 size={20} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => {
            updateMeal(m);
            onDone();
          }}
          className="h-12 flex-1 rounded-md bg-accent font-medium text-accent-ink"
        >
          Save
        </button>
      </div>
    </div>
  );
}
