import { NextResponse } from "next/server";
import { analyzeText } from "@/lib/ai";
import { normalizeDish, type MealResult } from "@/lib/meal";
import { mealTypeFor } from "@/lib/time";
import { userFromToken } from "@/lib/token-auth";

export const maxDuration = 30;
const LIMIT = Number(process.env.AI_DAILY_LIMIT || 60);

/**
 * Log a meal by text from a Shortcut (dictate, then POST). Body: {"text": "2 roti canai and teh tarik"}.
 * Same estimate and cache as the in-app text flow; saves straight away with the time-of-day meal type.
 */
export async function POST(req: Request) {
  const auth = await userFromToken(req);
  if (!auth) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const key = normalizeDish(text);
  if (!key) return NextResponse.json({ error: "text is empty" }, { status: 400 });

  const { sb, userId } = auth;
  const { data: hit } = await sb.from("food_cache").select("data").eq("user_id", userId).eq("key", key).maybeSingle();
  let result: MealResult | null = hit?.data ?? null;
  if (!result) {
    const { data: ok } = await sb.rpc("bump_ai_usage_for", { p_user: userId, p_limit: LIMIT });
    if (!ok) return NextResponse.json({ error: `Daily AI limit of ${LIMIT} reached.` }, { status: 429 });
    try {
      result = await analyzeText(text);
    } catch (e) {
      console.error("log/meal AI failed", e);
      return NextResponse.json({ error: "estimate failed, try again" }, { status: 502 });
    }
    if (!result.error) await sb.from("food_cache").upsert({ user_id: userId, key, data: result });
  }
  if (result.error || !result.items.length) return NextResponse.json({ error: result.error || "no food found" }, { status: 422 });

  const t = result.total;
  const { error } = await sb.from("meals").insert({
    user_id: userId,
    meal_type: mealTypeFor(),
    name: result.items.map((i) => i.name).join(" + "),
    kcal: t.kcal,
    protein: t.protein,
    carbs: t.carbs,
    fat: t.fat,
    source: "text",
    raw_json: { items: result.items.map((item) => ({ item, factor: 1 })) },
  });
  if (error) return NextResponse.json({ error: "could not save" }, { status: 500 });
  return NextResponse.json({ ok: true, message: `${t.kcal} kcal: ${result.items.map((i) => i.name).join(", ")}` });
}
