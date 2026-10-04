"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import { Sheet } from "./sheet";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { scaleItem, sumItems, type MealItem, type MealResult } from "@/lib/meal";
import { addDays, dayRange, klDate, mealTypeFor, type MealType } from "@/lib/time";
import type { Meal } from "@/lib/types";

const TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
type Row = { item: MealItem; factor: number };

export function MealSheet() {
  const { sheet, close } = useUi();
  const open = sheet?.kind === "meal";
  return (
    <Sheet open={open} onClose={close} title="Meal" tall>
      {open && <Flow key={sheet.file ? sheet.file.name + sheet.file.size : "text"} file={sheet.file} onDone={close} />}
    </Sheet>
  );
}

function confidenceWord(c: number) {
  return c >= 0.75 ? "confident" : c >= 0.45 ? "likely" : "rough guess";
}

function Flow({ file, onDone }: { file?: File; onDone: () => void }) {
  const { addMeals, toast } = useStore();
  const { open: reopen } = useUi();
  const [photo, setPhoto] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [source, setSource] = useState<"photo" | "text" | "manual">(file ? "photo" : "text");
  const [type, setType] = useState<MealType>(mealTypeFor());
  const [recent, setRecent] = useState<Meal[]>([]);
  const started = useRef(false);

  async function analyze(body: object, endpoint: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data: MealResult & { error?: string | null } = await res.json();
      if (!res.ok || data.error) setError(data.error || "Something went wrong.");
      else setRows(data.items.map((item) => ({ item, factor: 1 })));
    } catch {
      setError("You look offline. Meals need a connection for the estimate.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!file || started.current) return;
    started.current = true;
    (async () => {
      try {
        const [big, small] = await Promise.all([resizeImage(file, 768, 0.7), resizeImage(file, 200, 0.6)]);
        setPhoto(big);
        setThumb(small);
        analyze({ image: big.split(",")[1] }, "/api/meal/photo");
      } catch {
        setError("Could not read that image.");
      }
    })();
  }, [file]);

  useEffect(() => {
    if (file) return;
    // "Same as before": distinct recent meals, no API call to relog.
    supabase()
      .from("meals")
      .select("*")
      .gte("eaten_at", dayRange(addDays(klDate(), -14))[0])
      .order("eaten_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        const seen = new Set<string>();
        setRecent((data ?? []).filter((m) => !seen.has(m.name) && seen.add(m.name)).slice(0, 8));
      });
  }, [file]);

  const scaled = rows?.map((r) => scaleItem(r.item, r.factor)) ?? [];
  const total = sumItems(scaled);

  async function save() {
    if (!scaled.length) return;
    setBusy(true);
    const ok = await addMeals([
      {
        eaten_at: new Date().toISOString(),
        meal_type: type,
        name: scaled.map((i) => i.name).join(" + "),
        kcal: total.kcal,
        protein: total.protein,
        carbs: total.carbs,
        fat: total.fat,
        portion: 1,
        source,
        thumb_url: thumb,
        raw_json: { items: rows },
      },
    ]);
    setBusy(false);
    if (!ok) return setError("Could not save. Check your connection and try again.");
    toast(`${total.kcal} kcal logged`);
    onDone();
  }

  function relog(m: Meal) {
    const items = (m.raw_json as { items?: Row[] } | null)?.items;
    setSource("manual");
    setRows(
      items?.length
        ? items
        : [{ item: { name: m.name, portion: "as before", kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, confidence: 1 }, factor: 1 }],
    );
  }

  return (
    <div className="flex min-h-full flex-col pb-2">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview data URL
        <img src={photo} alt="Your meal" className="mb-4 h-44 w-full rounded-md object-cover" />
      )}

      {!file && !rows && (
        <div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="2 roti canai and teh tarik"
            className="w-full resize-none rounded-md border border-line bg-surface p-3 text-lg outline-none focus:border-accent"
          />
          <button
            onClick={() => analyze({ text }, "/api/meal/text")}
            disabled={busy || !text.trim()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-ink disabled:opacity-40"
          >
            {busy && <Loader2 size={18} className="animate-spin" />} Estimate
          </button>
          {recent.length > 0 && (
            <div className="mt-6">
              <p className="label mb-2">Same as before</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((m) => (
                  <button key={m.id} onClick={() => relog(m)} className="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm">
                    <RotateCcw size={14} strokeWidth={1.75} className="text-muted" />
                    <span className="max-w-48 truncate">{m.name}</span>
                    <span className="num text-muted">{m.kcal}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {file && busy && !rows && (
        <p className="flex items-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" /> Reading your plate
        </p>
      )}

      {error && (
        <div className="mt-2">
          <p className="text-danger">{error}</p>
          {file && (
            <label className="mt-3 flex h-11 cursor-pointer items-center gap-2 text-accent">
              <Camera size={18} strokeWidth={1.75} /> Try another photo
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && reopen({ kind: "meal", file: e.target.files[0] })} />
            </label>
          )}
        </div>
      )}

      {rows && (
        <>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="label">Total</p>
              <p className="num text-5xl">
                {total.kcal}
                <span className="ml-1 font-sans text-base text-muted">kcal</span>
              </p>
            </div>
            <p className="text-right text-sm text-muted">
              P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g · F {Math.round(total.fat)}g
            </p>
          </div>

          <ul className="mt-4">
            {rows.map((r, i) => {
              const s = scaled[i];
              return (
                <li key={i} className="border-b border-line py-3">
                  <div className="flex items-start gap-2">
                    <input
                      value={r.item.name}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, item: { ...x.item, name: e.target.value } } : x)))}
                      className="min-w-0 flex-1 bg-transparent text-lg outline-none"
                      aria-label="Dish name"
                    />
                    <span className="num text-lg">{s.kcal}</span>
                    <button
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      aria-label={`Remove ${r.item.name}`}
                      className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted"
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                  <p className="text-xs text-muted">
                    {r.item.portion} · {confidenceWord(r.item.confidence)} · P {s.protein} C {s.carbs} F {s.fat}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.25}
                      value={r.factor}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, factor: +e.target.value } : x)))}
                      className="h-11 flex-1 accent-[var(--accent)]"
                      aria-label="Portion"
                    />
                    <span className="num w-10 text-right">{r.factor}x</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-6">
            <div className="mb-3 flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`h-11 flex-1 rounded-full border text-sm capitalize transition-colors duration-150 ${type === t ? "border-ink bg-ink text-bg" : "border-line"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={save}
              disabled={busy || !rows.length}
              className="h-12 w-full rounded-md bg-accent font-medium text-accent-ink disabled:opacity-40"
            >
              Save {total.kcal} kcal
            </button>
          </div>
        </>
      )}
    </div>
  );
}
