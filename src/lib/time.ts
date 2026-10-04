// All "today" logic is Kuala Lumpur time (UTC+8, no DST). DB stores UTC.
export const TZ = "Asia/Kuala_Lumpur";
const OFFSET_MS = 8 * 3600_000;

/** 'YYYY-MM-DD' in KL for a given instant. */
export function klDate(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function klMonth(d: Date = new Date()): string {
  return klDate(d).slice(0, 7);
}

/** UTC ISO bounds [start, end) for a KL calendar day. */
export function dayRange(date: string): [string, string] {
  const start = new Date(`${date}T00:00:00+08:00`);
  return [start.toISOString(), new Date(start.getTime() + 86400_000).toISOString()];
}

/** UTC ISO bounds [start, end) for a KL month 'YYYY-MM'. */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [new Date(`${month}-01T00:00:00+08:00`).toISOString(), new Date(`${next}-01T00:00:00+08:00`).toISOString()];
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function klHour(d: Date = new Date()): number {
  return new Date(d.getTime() + OFFSET_MS).getUTCHours();
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export function mealTypeFor(d: Date = new Date()): MealType {
  const h = klHour(d);
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 18 && h < 22) return "dinner";
  return "snack";
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function fmtDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("en-MY", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
