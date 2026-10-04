"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCache, writeCache } from "@/lib/cache";
import { klDate } from "@/lib/time";

async function fetchNudge(refresh: boolean): Promise<string | null> {
  try {
    const r = await fetch(`/api/coach/nudge${refresh ? "?refresh=1" : ""}`);
    const d = await r.json();
    if (!r.ok || !d.text) return null;
    writeCache("nudge", { date: klDate(), text: d.text });
    return d.text;
  } catch {
    return null; // offline: keep whatever we had
  }
}

/** Today's nudge. Cached on the device per day, and on the server per day. */
export function useNudge() {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = readCache<{ date: string; text: string }>("nudge");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    if (c?.date === klDate()) setText(c.text);
    else fetchNudge(false).then((t) => t && setText(t));
  }, []);

  return {
    text,
    busy,
    refresh: async () => {
      setBusy(true);
      const t = await fetchNudge(true);
      if (t) setText(t);
      setBusy(false);
    },
  };
}

export function CoachCard() {
  const { text } = useNudge();
  if (!text) return null;
  return (
    <Link href="/coach" className="mt-4 block border-l-2 border-accent pl-3">
      <p className="label">Coach</p>
      <p className="mt-1 text-[15px] leading-snug">{text}</p>
    </Link>
  );
}
