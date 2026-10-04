import { NextResponse } from "next/server";
import { analyzeText } from "@/lib/ai";
import { aiFailed, aiGuard } from "@/lib/ai/guard";
import { normalizeDish } from "@/lib/meal";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const key = normalizeDish(text);
  if (!key) return NextResponse.json({ error: "Describe what you ate." }, { status: 400 });

  const auth = await aiGuard(false);
  if ("error" in auth) return auth.error;
  // Repeat meals ("2 roti canai and teh tarik") come from cache and cost nothing.
  const { data: hit } = await auth.ctx.sb.from("food_cache").select("data").eq("key", key).maybeSingle();
  if (hit) return NextResponse.json({ ...hit.data, cached: true });

  const g = await aiGuard();
  if ("error" in g) return g.error;
  try {
    const result = await analyzeText(text);
    if (!result.error) await g.ctx.sb.from("food_cache").upsert({ user_id: g.ctx.user.id, key, data: result });
    return NextResponse.json(result);
  } catch (e) {
    return aiFailed(e);
  }
}
