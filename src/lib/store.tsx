"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase/client";
import { readCache, writeCache } from "./cache";
import { enqueue, flush, pending } from "./outbox";
import { addDays, dayRange, klDate, klMonth, mealTypeFor, monthRange } from "./time";
import type { Category, Expense, Meal, Preset, Profile, StepsDay } from "./types";

type Snapshot = {
  profile: Profile | null;
  categories: Category[];
  presets: Preset[];
  expenses: Expense[]; // current KL month
  meals: Meal[]; // today
  steps: StepsDay[]; // last 7 days
  day: string;
};

type Toast = { id: number; text: string; undo?: () => void };

type Ctx = Snapshot & {
  loaded: boolean;
  online: boolean;
  reload: () => Promise<void>;
  addExpense: (e: Omit<Expense, "id" | "spent_at"> & { spent_at?: string }) => string;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  addMeals: (rows: Omit<Meal, "id">[]) => Promise<boolean>;
  repeatMeal: (m: Meal) => Promise<void>;
  updateMeal: (m: Meal) => Promise<void>;
  deleteMeal: (id: string) => void;
  setSteps: (date: string, steps: number) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  toast: (text: string, undo?: () => void) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
};

const empty: Snapshot = { profile: null, categories: [], presets: [], expenses: [], meals: [], steps: [], day: "" };
const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

/** Overlay queued (not yet synced) expense ops on top of server rows. */
function withPending(rows: Expense[]): Expense[] {
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const op of pending()) {
    if (op.kind === "upsert") map.set(op.row.id, { ...op.row, pending: true });
    else map.delete(op.id);
  }
  return [...map.values()].sort((a, b) => b.spent_at.localeCompare(a.spent_at));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(empty);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const commit = useCallback((next: Snapshot | ((s: Snapshot) => Snapshot)) => {
    setSnap((prev) => {
      const s = typeof next === "function" ? next(prev) : next;
      writeCache("snapshot", s);
      return s;
    });
  }, []);

  const reload = useCallback(async () => {
    const sb = supabase();
    const day = klDate();
    const [ms, me] = monthRange(klMonth());
    const [ds, de] = dayRange(day);
    try {
      await flush();
      const lastRecurring = readCache<string>("recurring-day");
      if (lastRecurring !== day) {
        const { error } = await sb.rpc("apply_recurring");
        if (!error) writeCache("recurring-day", day);
      }
      const [p, c, pr, e, m, st] = await Promise.all([
        sb.from("profiles").select("*").single(),
        sb.from("categories").select("*").order("sort"),
        sb.from("presets").select("*").order("sort"),
        sb.from("expenses").select("*").gte("spent_at", ms).lt("spent_at", me).order("spent_at", { ascending: false }),
        sb.from("meals").select("*").gte("eaten_at", ds).lt("eaten_at", de).order("eaten_at", { ascending: false }),
        sb.from("steps_daily").select("date,steps,source").gte("date", addDays(day, -6)).order("date"),
      ]);
      const failed = [p, c, pr, e, m, st].find((r) => r.error);
      if (failed) throw failed.error;
      commit({
        profile: p.data,
        categories: c.data ?? [],
        presets: pr.data ?? [],
        expenses: withPending(e.data ?? []),
        meals: m.data ?? [],
        steps: st.data ?? [],
        day,
      });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoaded(true);
    }
  }, [commit]);

  useEffect(() => {
    const cached = readCache<Snapshot>("snapshot");
    // A cached snapshot from yesterday must not show yesterday's meals as today.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on mount
    if (cached) setSnap(cached.day === klDate() ? { ...cached, expenses: withPending(cached.expenses) } : { ...cached, meals: [] });
    reload();
    const back = () => reload();
    const away = () => setOnline(false);
    const visible = () => document.visibilityState === "visible" && reload();
    window.addEventListener("online", back);
    window.addEventListener("offline", away);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", back);
      window.removeEventListener("offline", away);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [reload]);

  const toast = useCallback((text: string, undo?: () => void) => {
    const id = ++toastId.current;
    setToasts([{ id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const syncExpenses = useCallback(async () => {
    const ok = await flush();
    setOnline(ok);
    if (ok) commit((s) => ({ ...s, expenses: withPending(s.expenses.map((e) => ({ ...e, pending: false }))) }));
  }, [commit]);

  const addExpense: Ctx["addExpense"] = useCallback(
    (e) => {
      const row: Expense = {
        id: crypto.randomUUID(),
        spent_at: e.spent_at ?? new Date().toISOString(),
        amount_cents: e.amount_cents,
        category_id: e.category_id,
        note: e.note || null,
      };
      enqueue({ kind: "upsert", row });
      commit((s) => ({ ...s, expenses: withPending(s.expenses) }));
      syncExpenses();
      return row.id;
    },
    [commit, syncExpenses],
  );

  const updateExpense: Ctx["updateExpense"] = useCallback(
    (e) => {
      const { pending: _p, ...row } = e;
      void _p;
      enqueue({ kind: "upsert", row });
      commit((s) => ({ ...s, expenses: withPending(s.expenses) }));
      syncExpenses();
    },
    [commit, syncExpenses],
  );

  const deleteExpense: Ctx["deleteExpense"] = useCallback(
    (id) => {
      enqueue({ kind: "delete", id });
      commit((s) => ({ ...s, expenses: withPending(s.expenses.filter((x) => x.id !== id)) }));
      syncExpenses();
    },
    [commit, syncExpenses],
  );

  const addMeals: Ctx["addMeals"] = useCallback(
    async (rows) => {
      const { data, error } = await supabase().from("meals").insert(rows).select();
      if (error || !data) return false;
      commit((s) => ({
        ...s,
        meals: [...data, ...s.meals].filter((m) => m.eaten_at >= dayRange(s.day || klDate())[0]),
      }));
      return true;
    },
    [commit],
  );

  const repeatMeal: Ctx["repeatMeal"] = useCallback(
    async (m) => {
      // One tap "same as before": copy the meal to now, no AI call. Undo deletes it again.
      const { id: _id, ...rest } = m;
      void _id;
      const row = { ...rest, eaten_at: new Date().toISOString(), meal_type: mealTypeFor(), thumb_url: null };
      const { data, error } = await supabase().from("meals").insert(row).select().single();
      if (error || !data) return toast("Could not log it. Check your connection.");
      commit((s) => ({ ...s, meals: [data, ...s.meals] }));
      toast(`${m.name} logged`, () => {
        commit((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== data.id) }));
        supabase().from("meals").delete().eq("id", data.id).then(() => {});
      });
    },
    [commit, toast],
  );

  const updateMeal: Ctx["updateMeal"] = useCallback(
    async (m) => {
      commit((s) => ({ ...s, meals: s.meals.map((x) => (x.id === m.id ? m : x)) }));
      const { id, ...rest } = m;
      await supabase().from("meals").update(rest).eq("id", id);
    },
    [commit],
  );

  const deleteMeal: Ctx["deleteMeal"] = useCallback(
    (id) => {
      let removed: Meal | undefined;
      commit((s) => {
        removed = s.meals.find((x) => x.id === id);
        return { ...s, meals: s.meals.filter((x) => x.id !== id) };
      });
      // delete after the undo window so undo is a plain local restore
      const timer = setTimeout(() => supabase().from("meals").delete().eq("id", id).then(() => {}), 4200);
      toast("Meal deleted", () => {
        clearTimeout(timer);
        if (removed) commit((s) => ({ ...s, meals: [removed!, ...s.meals].sort((a, b) => b.eaten_at.localeCompare(a.eaten_at)) }));
      });
    },
    [commit, toast],
  );

  const setSteps: Ctx["setSteps"] = useCallback(
    async (date, steps) => {
      // Manual entry is a correction, so it overwrites rather than taking the max.
      const row = { date, steps, source: "manual" };
      commit((s) => ({ ...s, steps: [...s.steps.filter((x) => x.date !== date), row].sort((a, b) => a.date.localeCompare(b.date)) }));
      await supabase().from("steps_daily").upsert(row);
    },
    [commit],
  );

  const updateProfile: Ctx["updateProfile"] = useCallback(
    async (patch) => {
      commit((s) => ({ ...s, profile: s.profile ? { ...s.profile, ...patch } : s.profile }));
      const { data: u } = await supabase().auth.getUser();
      if (!u.user) return false;
      const { error } = await supabase().from("profiles").update(patch).eq("id", u.user.id);
      return !error;
    },
    [commit],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...snap,
      loaded,
      online,
      reload,
      addExpense,
      updateExpense,
      deleteExpense,
      addMeals,
      repeatMeal,
      updateMeal,
      deleteMeal,
      setSteps,
      updateProfile,
      toast,
      toasts,
      dismissToast,
    }),
    [snap, loaded, online, reload, addExpense, updateExpense, deleteExpense, addMeals, repeatMeal, updateMeal, deleteMeal, setSteps, updateProfile, toast, toasts, dismissToast],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
