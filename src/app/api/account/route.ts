import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

/** Deletes the auth user; every table cascades from auth.users. */
export async function DELETE() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await adminSupabase().auth.admin.deleteUser(ctx.user.id);
  if (error) return NextResponse.json({ error: "could not delete" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
