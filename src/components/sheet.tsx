"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className={`anim-sheet relative flex w-full max-w-md flex-col rounded-t-[14px] border-t border-line bg-bg pb-[max(16px,env(safe-area-inset-bottom))] ${
          tall ? "h-[92dvh]" : "max-h-[92dvh]"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <h2 className="label">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center text-muted">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
      </div>
    </div>
  );
}
