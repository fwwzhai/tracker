export function fmtMoney(cents: number, currency = "MYR"): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  const prefix = currency === "MYR" ? "RM" : currency + " ";
  return `${sign}${prefix}${abs.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Whole units only, for hero numbers: RM1,240 */
export function fmtMoneyShort(cents: number, currency = "MYR"): string {
  const prefix = currency === "MYR" ? "RM" : currency + " ";
  const sign = cents < 0 ? "-" : "";
  return `${sign}${prefix}${Math.round(Math.abs(cents) / 100).toLocaleString("en-MY")}`;
}

/** "12.5" -> 1250. Returns null for anything that is not a positive amount. */
export function toCents(input: string): number | null {
  const s = input.replace(/[^\d.]/g, "");
  if (!s || (s.match(/\./g) ?? []).length > 1) return null;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) && n > 0 ? n : null;
}
