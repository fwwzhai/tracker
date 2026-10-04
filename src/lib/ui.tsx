"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Expense, Meal } from "./types";

export type SheetState =
  | { kind: "quick" }
  | { kind: "expense"; expense?: Expense }
  | { kind: "meal"; file?: File; text?: boolean }
  | { kind: "meal-edit"; meal: Meal }
  | { kind: "weight" }
  | null;

const UiCtx = createContext<{ sheet: SheetState; open: (s: SheetState) => void; close: () => void } | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const close = useCallback(() => setSheet(null), []);
  const value = useMemo(() => ({ sheet, open: setSheet, close }), [sheet, close]);
  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}

export function useUi() {
  const c = useContext(UiCtx);
  if (!c) throw new Error("useUi outside UiProvider");
  return c;
}
