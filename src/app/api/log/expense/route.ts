import { NextResponse } from "next/server";
import { userFromToken } from "@/lib/token-auth";
import { toCents } from "@/lib/money";

/**
 * Log an expense from an iOS Shortcut / Siri / Action Button, no app open.
 * Body: {"amount": "12.50", "category": "Food", "note": "Lunch"}  (category and note optional)
 */
export async function POST(req: Request) {
  const auth = await userFromToken(req);
  if (!auth) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const cents = toCents(String(body?.amount ?? ""));
  if (!cents || cents > 100_000_000) return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });

  const { data: cats } = await auth.sb.from("categories").select("id,name").eq("user_id", auth.userId);
  const want = String(body?.category ?? "").trim().toLowerCase();
  const cat = (cats ?? []).find((c) => c.name.toLowerCase() === want) ?? (cats ?? []).find((c) => c.name === "Other") ?? null;
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 120) : null;

  const { error } = await auth.sb
    .from("expenses")
    .insert({ user_id: auth.userId, amount_cents: cents, category_id: cat?.id ?? null, note });
  if (error) return NextResponse.json({ error: "could not save" }, { status: 500 });
  return NextResponse.json({ ok: true, message: `RM${(cents / 100).toFixed(2)} ${cat?.name ?? ""}`.trim() });
}
