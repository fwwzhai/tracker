import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await req.json().catch(() => null);
  const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }
  const { error } = await ctx.sb.from("push_subscriptions").upsert({ user_id: ctx.user.id, endpoint, p256dh, auth });
  return error ? NextResponse.json({ error: "could not save" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await ctx.sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
