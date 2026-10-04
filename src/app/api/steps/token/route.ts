import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await ctx.sb.from("api_tokens").select("created_at").maybeSingle();
  return NextResponse.json({ exists: !!data, created_at: data?.created_at ?? null });
}

/** Generate or rotate. The plain token is shown once; only its hash is stored. */
export async function POST() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = "dh_" + randomBytes(24).toString("base64url");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const { error } = await ctx.sb
    .from("api_tokens")
    .upsert({ user_id: ctx.user.id, token_hash, created_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "could not save token" }, { status: 500 });
  return NextResponse.json({ token });
}
