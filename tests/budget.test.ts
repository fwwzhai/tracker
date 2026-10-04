import { describe, expect, it } from "vitest";
import { byCategory, dailySeries, level, monthSummary } from "../src/lib/budget";
import { toCents } from "../src/lib/money";
import { daysInMonth, dayRange, klDate, monthRange } from "../src/lib/time";

describe("budget maths", () => {
  it("colour changes only at 80% and 100%", () => {
    expect(level(79_99, 100_00)).toBe("ok");
    expect(level(80_00, 100_00)).toBe("warn");
    expect(level(99_99, 100_00)).toBe("warn");
    expect(level(100_00, 100_00)).toBe("over");
    expect(level(500, 0)).toBe("ok");
  });
  it("safe to spend per day counts today", () => {
    // RM1500 budget, RM600 spent, 10th of a 30 day month -> RM900 over 21 days
    const s = monthSummary(600_00, 1500_00, 10, 30);
    expect(s.left).toBe(900_00);
    expect(s.remainingDays).toBe(21);
    expect(s.safePerDay).toBe(4285);
    expect(s.pct).toBeCloseTo(0.4);
  });
  it("last day of month gets everything left", () => {
    expect(monthSummary(0, 300_00, 31, 31).safePerDay).toBe(300_00);
  });
  it("over budget means nothing safe to spend", () => {
    const s = monthSummary(1600_00, 1500_00, 10, 30);
    expect(s.left).toBe(-100_00);
    expect(s.safePerDay).toBe(0);
    expect(s.level).toBe("over");
    expect(s.pct).toBe(1);
  });
  it("groups by category and day", () => {
    const rows = [
      { amount_cents: 250, category_id: "food", day: 1 },
      { amount_cents: 300, category_id: "transport", day: 1 },
      { amount_cents: 1000, category_id: "food", day: 3 },
      { amount_cents: 50, category_id: null, day: 3 },
    ];
    expect(byCategory(rows).get("food")).toBe(1250);
    expect(byCategory(rows).get(null)).toBe(50);
    expect(dailySeries(rows, 3)).toEqual([550, 0, 1050]);
  });
  it("parses amounts into cents", () => {
    expect(toCents("2.50")).toBe(250);
    expect(toCents("RM 12")).toBe(1200);
    expect(toCents("0.1")).toBe(10);
    expect(toCents("1.2.3")).toBeNull();
    expect(toCents("0")).toBeNull();
    expect(toCents("")).toBeNull();
  });
});

describe("KL time", () => {
  it("rolls the day at midnight KL, not UTC", () => {
    expect(klDate(new Date("2026-10-03T15:59:00Z"))).toBe("2026-10-03");
    expect(klDate(new Date("2026-10-03T16:00:00Z"))).toBe("2026-10-04");
  });
  it("gives UTC bounds for KL days and months", () => {
    expect(dayRange("2026-10-04")).toEqual(["2026-10-03T16:00:00.000Z", "2026-10-04T16:00:00.000Z"]);
    expect(monthRange("2026-12")).toEqual(["2026-11-30T16:00:00.000Z", "2026-12-31T16:00:00.000Z"]);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});
