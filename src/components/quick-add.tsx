"use client";

import { Camera, PencilLine, Receipt, Scale } from "lucide-react";
import { Sheet } from "./sheet";
import { useUi } from "@/lib/ui";

export function QuickAdd() {
  const { sheet, open, close } = useUi();
  const row = "flex h-16 w-full items-center gap-4 border-b border-line text-left text-lg";
  return (
    <Sheet open={sheet?.kind === "quick"} onClose={close} title="Add">
      <label className={`${row} cursor-pointer`}>
        <Camera size={22} strokeWidth={1.75} className="text-accent" />
        <span className="flex-1">Photo meal</span>
        <span className="text-sm text-muted">camera or gallery</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) open({ kind: "meal", file });
          }}
        />
      </label>
      <button className={row} onClick={() => open({ kind: "meal", text: true })}>
        <PencilLine size={22} strokeWidth={1.75} className="text-accent" />
        <span className="flex-1">Describe a meal</span>
      </button>
      <button className={row} onClick={() => open({ kind: "expense" })}>
        <Receipt size={22} strokeWidth={1.75} className="text-accent" />
        <span className="flex-1">Expense</span>
      </button>
      <button className={`${row} border-b-0`} onClick={() => open({ kind: "weight" })}>
        <Scale size={22} strokeWidth={1.75} className="text-accent" />
        <span className="flex-1">Note weight</span>
      </button>
    </Sheet>
  );
}
