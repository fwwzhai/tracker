import { requireUser } from "@/lib/supabase/server";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV with a type column: meals, expenses, steps, weights. Times in UTC ISO. */
export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return new Response("unauthorized", { status: 401 });
  const { sb } = ctx;
  const [m, e, c, s, w] = await Promise.all([
    sb.from("meals").select("eaten_at,meal_type,name,kcal,protein,carbs,fat,source").order("eaten_at"),
    sb.from("expenses").select("spent_at,amount_cents,category_id,note").order("spent_at"),
    sb.from("categories").select("id,name"),
    sb.from("steps_daily").select("date,steps,source").order("date"),
    sb.from("weights").select("date,kg").order("date"),
  ]);
  const cat = new Map((c.data ?? []).map((x) => [x.id, x.name]));
  const head = ["type", "when", "name_or_note", "category_or_meal_type", "amount_rm", "kcal", "protein_g", "carbs_g", "fat_g", "steps", "kg", "source"];
  const rows: unknown[][] = [
    ...(m.data ?? []).map((r) => ["meal", r.eaten_at, r.name, r.meal_type, "", r.kcal, r.protein, r.carbs, r.fat, "", "", r.source]),
    ...(e.data ?? []).map((r) => ["expense", r.spent_at, r.note, cat.get(r.category_id) ?? "", (r.amount_cents / 100).toFixed(2), "", "", "", "", "", "", ""]),
    ...(s.data ?? []).map((r) => ["steps", r.date, "", "", "", "", "", "", "", r.steps, "", r.source]),
    ...(w.data ?? []).map((r) => ["weight", r.date, "", "", "", "", "", "", "", "", r.kg, ""]),
  ];
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="daily-hub-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
