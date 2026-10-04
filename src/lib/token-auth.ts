import "server-only";
import { createHash } from "node:crypto";
import { adminSupabase } from "./supabase/admin";

/** Resolve the owner of a personal API token ("Authorization: Bearer dh_..."), or null. */
export async function userFromToken(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-api-token") || "";
  if (!token) return null;
  const sb = adminSupabase();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await sb.from("api_tokens").select("user_id").eq("token_hash", hash).maybeSingle();
  return data ? { sb, userId: data.user_id as string } : null;
}
