import type { Activity, Goal, Sex } from "./calories";
import type { MealType } from "./time";

export type Profile = {
  id: string;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
  goal: Goal | null;
  kcal_goal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
  steps_goal: number;
  monthly_budget_cents: number;
  steps_factor: number;
  currency: string;
  units: string;
  onboarded: boolean;
};

export type Category = { id: string; name: string; monthly_budget_cents: number | null; color: string; sort: number };
export type Preset = { id: string; label: string; amount_cents: number; category_id: string | null; sort: number };
export type Recurring = { id: string; amount_cents: number; category_id: string | null; note: string | null; day_of_month: number };

export type Expense = {
  id: string;
  spent_at: string;
  amount_cents: number;
  category_id: string | null;
  note: string | null;
  recurring_id?: string | null;
  pending?: boolean;
};

export type Meal = {
  id: string;
  eaten_at: string;
  meal_type: MealType;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: number;
  source: "photo" | "text" | "manual";
  thumb_url: string | null;
  raw_json?: unknown;
};

export type StepsDay = { date: string; steps: number; source: string };
