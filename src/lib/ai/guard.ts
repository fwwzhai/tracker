import "server-only";
import { NextResponse } from "next/server";
import { requireUser } from "../supabase/server";

const LIMIT = Number(process.env.AI_DAILY_LIMIT || 60);

/** Auth + per user daily AI rate limit. Returns a response to send on failure. */
export async function aiGuard(countCall = true) {
  const ctx = await requireUser();
  if (!ctx) return { error: NextResponse.json({ error: "Sign in again." }, { status: 401 }) } as const;
  if (countCall) {
    const { data: ok, error } = await ctx.sb.rpc("bump_ai_usage", { p_limit: LIMIT });
    if (error) return { error: NextResponse.json({ error: "Could not check usage." }, { status: 500 }) } as const;
    if (!ok) return { error: NextResponse.json({ error: `Daily AI limit of ${LIMIT} reached. Log it manually or try tomorrow.` }, { status: 429 }) } as const;
  }
  return { ctx } as const;
}

export function aiFailed(e: unknown) {
  console.error("AI call failed", e);
  return NextResponse.json({ error: "The food model did not answer. Try again, or enter it by text." }, { status: 502 });
}
