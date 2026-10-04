import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service role client. Bypasses RLS: only for token-auth steps ingest and account deletion. */
export function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
