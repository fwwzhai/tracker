"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/** Swipe left past the threshold to delete, tap to edit. */
export function SwipeRow({ onDelete, onTap, children }: { onDelete: () => void; onTap: () => void; children: React.ReactNode }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const THRESHOLD = 96;

  return (
    <div className={`relative overflow-hidden transition-[max-height,opacity] duration-200 ${gone ? "max-h-0 opacity-0" : "max-h-40"}`}>
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 bg-danger px-5 text-bg" style={{ width: Math.max(0, -dx) }}>
        <Trash2 size={18} strokeWidth={1.75} className="ml-auto" />
      </div>
      <div
        className="relative bg-bg"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 180ms ease-out", touchAction: "pan-y" }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          moved.current = false;
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const x = e.clientX - start.current.x;
          if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(e.clientY - start.current.y)) moved.current = true;
          if (moved.current) setDx(Math.min(0, x));
        }}
        onPointerUp={() => {
          const del = dx < -THRESHOLD;
          start.current = null;
          setDragging(false);
          if (del) {
            setDx(-400);
            setGone(true);
            setTimeout(onDelete, 180);
          } else setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
        onClick={() => !moved.current && onTap()}
      >
        {children}
      </div>
    </div>
  );
}
