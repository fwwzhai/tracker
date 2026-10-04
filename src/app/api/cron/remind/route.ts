import webpush from "web-push";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

/**
 * Meal reminder, called by Vercel Cron at 1pm and 8pm KL (see vercel.json).
 * Sends a push only to users who logged no meal in the last 4 hours.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: "VAPID keys not set" }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const sb = adminSupabase();
  const since = new Date(Date.now() - 4 * 3600_000).toISOString();
  const [{ data: subs }, { data: recent }] = await Promise.all([
    sb.from("push_subscriptions").select("*"),
    sb.from("meals").select("user_id").gte("eaten_at", since),
  ]);
  const fed = new Set((recent ?? []).map((m) => m.user_id));
  const hourKL = (new Date().getUTCHours() + 8) % 24;
  const body = hourKL < 17 ? "Lunch not logged yet. Snap it in 2 taps." : "Dinner not logged yet. Snap it in 2 taps.";

  let sent = 0;
  for (const s of (subs ?? []).filter((s) => !fed.has(s.user_id))) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Daily Hub", body, url: "/" }));
      sent++;
    } catch (e) {
      // 404/410 = subscription is gone
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return NextResponse.json({ sent });
}
