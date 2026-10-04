"use client";

import { useEffect, useState } from "react";
import { Delete, Pin, Trash2 } from "lucide-react";
import { Sheet } from "./sheet";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";
import { fmtMoney } from "@/lib/money";
import { supabase } from "@/lib/supabase/client";
import { suggestCategory } from "@/lib/suggest";
import type { Expense } from "@/lib/types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

/** Amount typed as a string of digits with at most 2 decimals. */
function press(cur: string, k: string): string {
  if (k === "del") return cur.slice(0, -1);
  if (k === "." && cur.includes(".")) return cur;
  if (cur.includes(".") && cur.split(".")[1].length >= 2) return cur;
  if (cur === "0" && k !== ".") return k;
  if (cur.replace(".", "").length >= 7) return cur;
  return (cur === "" && k === "." ? "0" : cur) + k;
}

export function ExpenseSheet() {
  const { sheet, close } = useUi();
  const open = sheet?.kind === "expense";
  return (
    <Sheet open={open} onClose={close} title={sheet?.kind === "expense" && sheet.expense ? "Edit expense" : "Expense"}>
      {open && <Form key={sheet.expense?.id ?? "new"} editing={sheet.expense} onDone={close} />}
    </Sheet>
  );
}

function Form({ editing, onDone }: { editing?: Expense; onDone: () => void }) {
  const { categories, presets, expenses, addExpense, updateExpense, deleteExpense, toast, reload } = useStore();
  const [amount, setAmount] = useState(editing ? (editing.amount_cents / 100).toFixed(2).replace(/\.00$/, "") : "");
  const [cat, setCat] = useState<string | null>(editing?.category_id ?? suggestCategory(expenses, categories));
  const [note, setNote] = useState(editing?.note ?? "");
  const [pin, setPin] = useState(false);
  const cents = Math.round(parseFloat(amount || "0") * 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (/^[0-9.]$/.test(e.key)) setAmount((a) => press(a, e.key));
      if (e.key === "Backspace") setAmount((a) => press(a, "del"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function save() {
    if (cents <= 0) return;
    if (editing) {
      updateExpense({ ...editing, amount_cents: cents, category_id: cat, note: note.trim() || null });
      toast("Expense updated");
    } else {
      const id = addExpense({ amount_cents: cents, category_id: cat, note: note.trim() || null });
      toast(`${fmtMoney(cents)} added`, () => deleteExpense(id));
      if (pin && presets.length < 6) {
        const label = note.trim() || categories.find((c) => c.id === cat)?.name || "Preset";
        await supabase().from("presets").insert({ label, amount_cents: cents, category_id: cat, sort: presets.length });
        reload();
      }
    }
    onDone();
  }

  return (
    <div className="flex flex-col pb-2">
      <div className="flex items-baseline justify-center gap-2 py-4">
        <span className="text-xl text-muted">RM</span>
        <span className={`num text-6xl ${amount ? "" : "text-muted"}`}>{amount || "0"}</span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3" role="radiogroup" aria-label="Category">
        {categories.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`h-11 shrink-0 rounded-full border px-4 text-sm transition-colors duration-150 ${
              cat === c.id ? "border-ink bg-ink text-bg" : "border-line text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-11 rounded-md border border-line bg-surface px-3 text-base outline-none focus:border-accent"
      />

      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setAmount((a) => press(a, k))}
            aria-label={k === "del" ? "Delete digit" : k}
            className="num flex h-14 items-center justify-center bg-bg text-2xl active:bg-surface"
          >
            {k === "del" ? <Delete size={22} strokeWidth={1.75} /> : k}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {editing ? (
          <button
            onClick={() => {
              deleteExpense(editing.id);
              toast("Expense deleted", () => updateExpense(editing));
              onDone();
            }}
            aria-label="Delete expense"
            className="flex h-12 w-12 items-center justify-center rounded-md border border-line text-danger"
          >
            <Trash2 size={20} strokeWidth={1.75} />
          </button>
        ) : (
          presets.length < 6 && (
            <button
              onClick={() => setPin((p) => !p)}
              aria-pressed={pin}
              aria-label="Also save as a one tap preset"
              title="Save as preset"
              className={`flex h-12 w-12 items-center justify-center rounded-md border ${pin ? "border-accent text-accent" : "border-line text-muted"}`}
            >
              <Pin size={20} strokeWidth={1.75} />
            </button>
          )
        )}
        <button
          onClick={save}
          disabled={cents <= 0}
          className="h-12 flex-1 rounded-md bg-accent font-medium text-accent-ink transition-opacity duration-150 disabled:opacity-40"
        >
          {editing ? "Save" : cents > 0 ? `Add ${fmtMoney(cents)}` : "Add"}
        </button>
      </div>
    </div>
  );
}
