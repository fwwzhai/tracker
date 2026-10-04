import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { addDays, klDate } from "@/lib/time";

/**
 * Steps ingest for iOS Shortcuts / Tasker / Health Sync.
 * Auth: "Authorization: Bearer <token>" (personal token from Settings).
 * Body: {"steps": 8123, "date": "2026-10-04"} (date optional, defaults to today in KL)
 *   or {"days": [{"date": "...", "steps": ...}, ...]} for backfill.
 * Merge rule: highest count per day wins, sources are never summed.
 */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-api-token") || "";
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const sb = adminSupabase();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: owner } = await sb.from("api_tokens").select("user_id").eq("token_hash", hash).maybeSingle();
  if (!owner) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const list: unknown[] = Array.isArray(body?.days) ? body.days : [body];
  const today = klDate();
  const source = typeof body?.source === "string" ? body.source.slice(0, 20) : "shortcut";
  const saved: { date: string; steps: number }[] = [];

  for (const raw of list.slice(0, 60)) {
    const d = raw as { date?: unknown; steps?: unknown };
    const steps = Math.round(Number(String(d?.steps ?? "").replace(/[^\d.]/g, "")));
    const date = typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(d.date) ? d.date.slice(0, 10) : today;
    if (!Number.isFinite(steps) || steps < 0 || steps > 200_000) continue;
    if (date > addDays(today, 1) || date < addDays(today, -400)) continue;
    const { error } = await sb.rpc("upsert_steps", { p_user: owner.user_id, p_date: date, p_steps: steps, p_source: source });
    if (!error) saved.push({ date, steps });
  }
  if (!saved.length) return NextResponse.json({ error: "no valid {date, steps} in body" }, { status: 400 });
  return NextResponse.json({ ok: true, saved });
}
