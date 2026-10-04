// Shared meal schema for both AI providers, plus local parsing and portion maths.

export type MealItem = {
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
};

export type MealResult = {
  items: MealItem[];
  total: { kcal: number; protein: number; carbs: number; fat: number };
  error: string | null;
};

/** JSON schema used for structured output on Gemini and OpenAI. */
export const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          kcal: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          confidence: { type: "number" },
        },
        required: ["name", "portion", "kcal", "protein", "carbs", "fat", "confidence"],
      },
    },
    total: {
      type: "object",
      additionalProperties: false,
      properties: {
        kcal: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["kcal", "protein", "carbs", "fat"],
    },
    error: { type: "string" }, // "" when it is food; plain string keeps both providers happy
  },
  required: ["items", "total", "error"],
} as const;

const num = (v: unknown, max: number): number => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function sumItems(items: Pick<MealItem, "kcal" | "protein" | "carbs" | "fat">[]) {
  return items.reduce(
    (t, i) => ({
      kcal: Math.round(t.kcal + i.kcal),
      protein: r1(t.protein + i.protein),
      carbs: r1(t.carbs + i.carbs),
      fat: r1(t.fat + i.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Parse whatever the model returned (string or object) into a safe MealResult.
 * Clamps silly values, drops nameless items, and recomputes the total from items
 * so the UI never trusts the model's arithmetic.
 */
export function parseMeal(raw: unknown): MealResult {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      data = JSON.parse(s);
    } catch {
      return { items: [], total: sumItems([]), error: "Could not read the analysis. Try again." };
    }
  }
  const d = (data ?? {}) as Record<string, unknown>;
  const items: MealItem[] = (Array.isArray(d.items) ? d.items : [])
    .map((x: Record<string, unknown>) => ({
      name: String(x?.name ?? "").trim().slice(0, 80),
      portion: String(x?.portion ?? "").trim().slice(0, 40),
      kcal: Math.round(num(x?.kcal, 5000)),
      protein: r1(num(x?.protein, 500)),
      carbs: r1(num(x?.carbs, 1000)),
      fat: r1(num(x?.fat, 500)),
      confidence: Math.min(1, num(x?.confidence, 100) > 1 ? num(x?.confidence, 100) / 100 : num(x?.confidence, 1)),
    }))
    .filter((i) => i.name);
  const error = typeof d.error === "string" && d.error.trim() ? d.error.trim() : null;
  if (!items.length && !error) return { items, total: sumItems([]), error: "No food found in that." };
  return { items, total: sumItems(items), error: items.length ? null : error };
}

/** Scale one item by a portion multiplier (0.5x to 2x). Local, no API call. */
export function scaleItem(item: MealItem, factor: number): MealItem {
  const f = Math.min(2, Math.max(0.5, factor));
  return {
    ...item,
    kcal: Math.round(item.kcal * f),
    protein: r1(item.protein * f),
    carbs: r1(item.carbs * f),
    fat: r1(item.fat * f),
  };
}

/** Cache key for repeat meals: "2 Roti Canai & teh tarik!" -> "2 roti canai and teh tarik" */
export function normalizeDish(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
