"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { stepsKcal } from "@/lib/calories";
import { addDays, fmtDay, klDate } from "@/lib/time";
import { Bar } from "@/components/bar";
import { BarChart } from "@/components/bar-chart";

export default function Steps() {
  const { steps, profile, setSteps, toast } = useStore();
  const today = klDate();
  const [entry, setEntry] = useState("");
  const [date, setDate] = useState(today);
  const goal = profile?.steps_goal ?? 8000;
  const factor = profile?.steps_factor ?? 0.04;
  const todaySteps = steps.find((s) => s.date === today);
  const n = todaySteps?.steps ?? 0;

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const values = days.map((d) => steps.find((s) => s.date === d)?.steps ?? 0);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / 7);
  const hit = values.filter((v) => v >= goal).length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Math.round(+entry);
    if (!(v >= 0 && v < 200000)) return;
    await setSteps(date, v);
    toast(`${v.toLocaleString("en-MY")} steps saved`);
    setEntry("");
  }

  return (
    <div>
      <p className="label pt-4">Steps today</p>
      <p className="num mt-1 text-7xl leading-none">{n.toLocaleString("en-MY")}</p>
      <Bar pct={goal ? n / goal : 0} className="mt-4" />
      <p className="mt-2 flex justify-between text-sm text-muted">
        <span>
          {n >= goal ? "Goal reached" : `${(goal - n).toLocaleString("en-MY")} to go`} of {goal.toLocaleString("en-MY")}
        </span>
        <span>
          about <span className="num text-base text-ink">{stepsKcal(n, factor)}</span> kcal, estimate
        </span>
      </p>
      {todaySteps && <p className="mt-1 text-xs text-muted">Source: {todaySteps.source}</p>}

      <section className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="label">Last 7 days</p>
          <p className="text-sm text-muted">
            avg <span className="num text-base text-ink">{avg.toLocaleString("en-MY")}</span> · goal hit {hit}/7
          </p>
        </div>
        <BarChart
          values={values}
          labels={days.map((d) => fmtDay(d, { weekday: "short", day: "numeric" }))}
          format={(v) => `${v.toLocaleString("en-MY")} steps`}
          reference={goal}
          highlight={6}
          ariaLabel="Steps per day, last 7 days"
        />
      </section>

      <form onSubmit={save} className="mt-8 border-t border-line pt-6">
        <p className="label mb-2">Enter manually</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-12 rounded-md border border-line bg-surface px-3 outline-none focus:border-accent"
            aria-label="Date"
          />
          <input
            inputMode="numeric"
            value={entry}
            onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))}
            placeholder="8000"
            className="num h-12 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-xl outline-none focus:border-accent"
            aria-label="Steps"
          />
          <button disabled={!entry} className="h-12 rounded-md bg-accent px-5 font-medium text-accent-ink disabled:opacity-40">
            Save
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Manual entries replace that day. To sync automatically from Apple Health, set up the Shortcut in{" "}
          <Link href="/settings#steps" className="text-accent underline underline-offset-2">Settings</Link>.
        </p>
      </form>
    </div>
  );
}
