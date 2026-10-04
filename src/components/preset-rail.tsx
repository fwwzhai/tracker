"use client";

import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { fmtMoney } from "@/lib/money";

/** One tap expense presets. Adds instantly, undo via toast. */
export function PresetRail() {
  const { presets, addExpense, deleteExpense, toast } = useStore();
  const { open } = useUi();
  if (!presets.length) {
    return (
      <button onClick={() => open({ kind: "expense" })} className="h-11 text-left text-sm text-muted">
        No presets yet. Add an expense and tap the pin to make it one tap.
      </button>
    );
  }
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Quick expenses">
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            const id = addExpense({ amount_cents: p.amount_cents, category_id: p.category_id, note: p.label });
            toast(`${p.label} ${fmtMoney(p.amount_cents)}`, () => deleteExpense(id));
          }}
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm transition-transform duration-150 active:scale-95"
        >
          <span>{p.label}</span>
          <span className="num text-muted">{(p.amount_cents / 100).toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}
