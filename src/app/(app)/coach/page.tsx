"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { useNudge } from "@/components/coach-card";
import { readCache, writeCache } from "@/lib/cache";

type Msg = { role: "user" | "coach"; text: string };

const STARTERS = ["What should I eat for dinner?", "Am I on track this week?", "Where is my money going?"];

export default function Coach() {
  const nudge = useNudge();
  const [msgs, setMsgsState] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const setMsgs = (m: Msg[]) => {
    setMsgsState(m);
    writeCache("chat", m.slice(-20));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setMsgsState(readCache<Msg[]>("chat") ?? []);
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function ask(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, text: t }];
    setMsgs(next);
    setQ("");
    setBusy(true);
    try {
      const r = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-6) }),
      });
      const d = await r.json();
      setMsgs([...next, { role: "coach", text: r.ok ? d.text : d.error || "No answer, try again." }]);
    } catch {
      setMsgs([...next, { role: "coach", text: "You look offline. Ask again when connected." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col">
      <div className="flex items-center justify-between pt-4">
        <p className="label">Today&rsquo;s nudge</p>
        <button onClick={nudge.refresh} disabled={nudge.busy} aria-label="New nudge" className="-mr-3 flex h-11 w-11 items-center justify-center text-muted">
          <RefreshCw size={18} strokeWidth={1.75} className={nudge.busy ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="num text-2xl leading-snug">{nudge.text ?? (nudge.busy ? "Thinking about your day…" : "Log a meal or two and I will have something useful to say.")}</p>

      <div className="mt-8 flex-1 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`anim-row ${m.role === "user" ? "ml-10 text-right" : "mr-6"}`}>
            <p className={`inline-block rounded-md px-3 py-2 text-left ${m.role === "user" ? "bg-ink text-bg" : "bg-surface"}`}>{m.text}</p>
          </div>
        ))}
        {busy && <Loader2 size={18} className="animate-spin text-muted" />}
        {!msgs.length && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="h-11 rounded-full border border-line px-4 text-sm">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] mt-4 flex gap-2 bg-bg py-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the coach" className="h-12 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 outline-none focus:border-accent" />
        <button disabled={!q.trim() || busy} aria-label="Send" className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-ink disabled:opacity-40">
          <ArrowUp size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
