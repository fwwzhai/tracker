"use client";

import { useStore } from "@/lib/store";

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(140px+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="anim-sheet pointer-events-auto flex w-full max-w-md items-center justify-between rounded-md bg-ink pl-4 text-bg">
          <span className="py-3 text-sm">{t.text}</span>
          {t.undo && (
            <button
              className="h-11 px-4 text-sm font-semibold text-accent-soft"
              onClick={() => {
                t.undo?.();
                dismissToast(t.id);
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
