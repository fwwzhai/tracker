export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export const ACTIVITY: Record<Activity, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Desk, little exercise" },
  light: { factor: 1.375, label: "Light, 1 to 3 days a week" },
  moderate: { factor: 1.55, label: "Moderate, 3 to 5 days" },
  active: { factor: 1.725, label: "Hard, 6 to 7 days" },
  very_active: { factor: 1.9, label: "Physical job or twice a day" },
};

export const GOAL_DELTA: Record<Goal, number> = { lose: -500, maintain: 0, gain: 300 };

/** Mifflin St Jeor basal metabolic rate, kcal/day. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export function kcalGoal(p: { sex: Sex; weightKg: number; heightCm: number; age: number; activity: Activity; goal: Goal }) {
  const tdee = bmr(p.sex, p.weightKg, p.heightCm, p.age) * ACTIVITY[p.activity].factor;
  const floor = p.sex === "male" ? 1500 : 1200;
  return Math.max(floor, Math.round((tdee + GOAL_DELTA[p.goal]) / 10) * 10);
}

/** Default macro split: protein 1.8 g/kg, fat 25% of kcal, carbs the rest. */
export function macros(kcal: number, weightKg: number) {
  const protein = Math.round(weightKg * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

/** Rough estimate. Factor is user editable (default 0.04 kcal per step). */
export function stepsKcal(steps: number, factor = 0.04): number {
  return Math.round(steps * factor);
}
