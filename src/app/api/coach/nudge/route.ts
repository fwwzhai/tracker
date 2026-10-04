import { NextResponse } from "next/server";
import { writeText } from "@/lib/ai";
import { aiFailed, aiGuard } from "@/lib/ai/guard";
import { buildSummary, COACH_STYLE } from "@/lib/coach";
import { klDate } from "@/lib/time";

/** Once per day nudge, cached in coach_cache. ?refresh=1 regenerates (counts towards the limit). */
export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const auth = await aiGuard(false);
  if ("error" in auth) return auth.error;
  const date = klDate();
  if (!refresh) {
    const { data } = await auth.ctx.sb.from("coach_cache").select("text").eq("date", date).maybeSingle();
    if (data) return NextResponse.json({ text: data.text, date });
  }
  const g = await aiGuard();
  if ("error" in g) return g.error;
  try {
    const summary = await buildSummary(g.ctx.sb);
    const text = await writeText(
      `${COACH_STYLE}\nWrite one nudge for right now: at most 2 short sentences, under 40 words.`,
      summary,
      300,
    );
    if (text) await g.ctx.sb.from("coach_cache").upsert({ user_id: g.ctx.user.id, date, text });
    return NextResponse.json({ text, date });
  } catch (e) {
    return aiFailed(e);
  }
}
