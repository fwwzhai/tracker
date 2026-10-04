import { NextResponse } from "next/server";
import { writeText } from "@/lib/ai";
import { aiFailed, aiGuard } from "@/lib/ai/guard";
import { buildSummary, COACH_STYLE } from "@/lib/coach";

type Msg = { role: "user" | "coach"; text: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const history: Msg[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m: Msg) => (m?.role === "user" || m?.role === "coach") && typeof m.text === "string")
    .slice(-6)
    .map((m: Msg) => ({ role: m.role, text: m.text.slice(0, 600) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Ask something." }, { status: 400 });
  }
  const g = await aiGuard();
  if ("error" in g) return g.error;
  try {
    const summary = await buildSummary(g.ctx.sb);
    const convo = history.map((m) => `${m.role === "user" ? "Me" : "Coach"}: ${m.text}`).join("\n");
    const text = await writeText(
      `${COACH_STYLE}\nAnswer in under 80 words. Data summary (last 7 days, totals only):\n${summary}`,
      convo,
      600,
    );
    return NextResponse.json({ text });
  } catch (e) {
    return aiFailed(e);
  }
}
