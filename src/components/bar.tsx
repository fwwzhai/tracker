import type { Level } from "@/lib/budget";

const tone: Record<Level, string> = { ok: "bg-accent", warn: "bg-warn", over: "bg-danger" };

/** Slim progress bar. Width animates on change only. */
export function Bar({ pct, level = "ok", className = "" }: { pct: number; level?: Level; className?: string }) {
  const w = Math.max(0, Math.min(1, pct)) * 100;
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-200 ease-out ${tone[level]}`} style={{ width: `${w}%` }} />
    </div>
  );
}
