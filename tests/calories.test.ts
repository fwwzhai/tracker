import { describe, expect, it } from "vitest";
import { bmr, kcalGoal, macros, stepsKcal } from "../src/lib/calories";
import { normalizeDish, parseMeal, scaleItem, sumItems } from "../src/lib/meal";

describe("calorie goal", () => {
  it("matches Mifflin St Jeor", () => {
    expect(bmr("male", 70, 175, 30)).toBeCloseTo(1648.75);
    expect(bmr("female", 60, 165, 30)).toBeCloseTo(1320.25);
  });
  it("applies activity and goal, rounds to 10", () => {
    // 1648.75 * 1.55 = 2555.6 - 500 = 2055.6 -> 2060
    expect(kcalGoal({ sex: "male", weightKg: 70, heightCm: 175, age: 30, activity: "moderate", goal: "lose" })).toBe(2060);
  });
  it("never goes below a safe floor", () => {
    expect(kcalGoal({ sex: "female", weightKg: 40, heightCm: 145, age: 70, activity: "sedentary", goal: "lose" })).toBe(1200);
  });
  it("macro split adds up to the goal", () => {
    const m = macros(2000, 70);
    expect(m.protein).toBe(126);
    expect(Math.abs(m.protein * 4 + m.carbs * 4 + m.fat * 9 - 2000)).toBeLessThan(10);
  });
  it("estimates steps burn", () => {
    expect(stepsKcal(10000)).toBe(400);
    expect(stepsKcal(10000, 0.05)).toBe(500);
  });
});

describe("meal parsing", () => {
  const raw = {
    items: [
      { name: "Nasi lemak", portion: "1 plate", kcal: 644, protein: 18, carbs: 80, fat: 28, confidence: 0.8 },
      { name: "Teh tarik", portion: "1 cup", kcal: 120.4, protein: 3, carbs: 20, fat: 3.15, confidence: 90 },
    ],
    total: { kcal: 9999, protein: 0, carbs: 0, fat: 0 },
    error: null,
  };

  it("recomputes totals instead of trusting the model", () => {
    const m = parseMeal(raw);
    expect(m.total).toEqual({ kcal: 764, protein: 21, carbs: 100, fat: 31.2 });
    expect(m.error).toBeNull();
  });
  it("normalises 0-100 confidence to 0-1", () => {
    expect(parseMeal(raw).items[1].confidence).toBe(0.9);
  });
  it("accepts JSON strings, including fenced ones", () => {
    expect(parseMeal("```json\n" + JSON.stringify(raw) + "\n```").items).toHaveLength(2);
  });
  it("coerces numeric strings and clamps negatives", () => {
    const m = parseMeal({ items: [{ name: "Roti canai", portion: "1", kcal: "301", protein: -4, carbs: "40", fat: "12", confidence: 0.7 }], error: null });
    expect(m.items[0]).toMatchObject({ kcal: 301, protein: 0, carbs: 40, fat: 12 });
  });
  it("passes through the not-food error", () => {
    const m = parseMeal({ items: [], total: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, error: "Not food" });
    expect(m.error).toBe("Not food");
    expect(m.items).toHaveLength(0);
  });
  it("flags garbage", () => {
    expect(parseMeal("not json").error).toBeTruthy();
    expect(parseMeal({}).error).toBeTruthy();
  });
  it("drops nameless items", () => {
    expect(parseMeal({ items: [{ name: " ", kcal: 100 }, { name: "Laksa", kcal: 430 }] }).items).toHaveLength(1);
  });
  it("scales portions locally and clamps to 0.5x..2x", () => {
    const item = parseMeal(raw).items[0];
    expect(scaleItem(item, 1.5)).toMatchObject({ kcal: 966, protein: 27, carbs: 120, fat: 42 });
    expect(scaleItem(item, 5).kcal).toBe(1288);
    expect(scaleItem(item, 0.1).kcal).toBe(322);
  });
  it("sums items", () => {
    expect(sumItems([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
  it("normalises dish names for the repeat cache", () => {
    expect(normalizeDish("  2 Roti Canai & Teh-Tarik! ")).toBe("2 roti canai and teh tarik");
  });
});
