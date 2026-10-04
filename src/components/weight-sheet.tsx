"use client";

import { useState } from "react";
import { Sheet } from "./sheet";
import { useUi } from "@/lib/ui";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { klDate } from "@/lib/time";

export function WeightSheet() {
  const { sheet, close } = useUi();
  const { profile, updateProfile, toast } = useStore();
  const [kg, setKg] = useState("");
  const open = sheet?.kind === "weight";
  const value = parseFloat(kg);

  async function save() {
    if (!(value > 20 && value < 400)) return;
    const { error } = await supabase().from("weights").upsert({ date: klDate(), kg: value });
    if (error) return toast("Could not save weight. Try again online.");
    await updateProfile({ weight_kg: value });
    toast(`${value} kg noted`);
    setKg("");
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Weight">
      <div className="pb-2">
        <div className="flex items-baseline justify-center gap-2 py-6">
          <input
            autoFocus
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder={profile?.weight_kg ? String(profile.weight_kg) : "70.0"}
            className="num w-40 bg-transparent text-center text-6xl outline-none placeholder:text-line"
            aria-label="Weight in kg"
          />
          <span className="text-xl text-muted">kg</span>
        </div>
        <p className="mb-4 text-center text-sm text-muted">One reading a day. Same time each morning is the most useful.</p>
        <button onClick={save} disabled={!(value > 20 && value < 400)} className="h-12 w-full rounded-md bg-accent font-medium text-accent-ink disabled:opacity-40">
          Save
        </button>
      </div>
    </Sheet>
  );
}
