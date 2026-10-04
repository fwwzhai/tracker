"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY, kcalGoal, macros, type Activity, type Goal, type Sex } from "@/lib/calories";
import { toCents } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

const field = "h-12 w-full rounded-md border border-line bg-surface px-3 text-base outline-none focus:border-accent";

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-md border border-line p-1">
      {options.map(([v, l]) => (
        <button
          type="button"
          key={v}
          onClick={() => onChange(v)}
          className={`h-10 flex-1 rounded-sm text-sm transition-colors duration-150 ${value === v ? "bg-ink text-bg" : "text-muted"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { profile } = useStore();
  if (!profile) return <p className="label pt-6">Loading</p>;
  return <Form profile={profile} />;
}

function Form({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { updateProfile } = useStore();
  const [age, setAge] = useState(String(profile.age ?? ""));
  const [sex, setSex] = useState<Sex>(profile.sex ?? "male");
  const [height, setHeight] = useState(String(profile.height_cm ?? ""));
  const [weight, setWeight] = useState(String(profile.weight_kg ?? ""));
  const [activity, setActivity] = useState<Activity>(profile.activity ?? "light");
  const [goal, setGoal] = useState<Goal>(profile.goal ?? "maintain");
  const [override, setOverride] = useState(profile.onboarded && profile.kcal_goal ? String(profile.kcal_goal) : "");
  const [macroEdit, setMacroEdit] = useState<{ protein: string; carbs: string; fat: string } | null>(
    profile.onboarded && profile.protein_g != null
      ? { protein: String(profile.protein_g), carbs: String(profile.carb_g), fat: String(profile.fat_g) }
      : null,
  );
  const [steps, setSteps] = useState(String(profile.steps_goal ?? 8000));
  const [budget, setBudget] = useState(profile.monthly_budget_cents ? String(profile.monthly_budget_cents / 100) : "");
  const [busy, setBusy] = useState(false);

  const a = +age, h = +height, w = +weight;
  const valid = a >= 13 && a <= 100 && h >= 120 && h <= 230 && w >= 30 && w <= 300;
  const computed = valid ? kcalGoal({ sex, weightKg: w, heightCm: h, age: a, activity, goal }) : null;
  const kcal = +override > 0 ? Math.round(+override) : computed;
  const auto = kcal && w ? macros(kcal, w) : null;
  const m = macroEdit ? { protein: +macroEdit.protein || 0, carbs: +macroEdit.carbs || 0, fat: +macroEdit.fat || 0 } : auto;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!kcal || !m) return;
    setBusy(true);
    const ok = await updateProfile({
      age: a, sex, height_cm: h, weight_kg: w, activity, goal,
      kcal_goal: kcal, protein_g: m.protein, carb_g: m.carbs, fat_g: m.fat,
      steps_goal: Math.max(0, Math.round(+steps || 0)),
      monthly_budget_cents: toCents(budget) ?? 0,
      onboarded: true,
    });
    setBusy(false);
    if (ok) router.replace("/");
  }

  return (
    <form onSubmit={save} className="pb-8">
      <p className="label pt-4">{profile.onboarded ? "Body and goals" : "One screen setup"}</p>
      <h1 className="num mt-2 text-3xl">{profile.onboarded ? "Adjust your targets." : "Let us set your daily numbers."}</h1>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="label">Age</span>
          <input className={field} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
        </label>
        <label className="space-y-1">
          <span className="label">Height cm</span>
          <input className={field} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" />
        </label>
        <label className="space-y-1">
          <span className="label">Weight kg</span>
          <input className={field} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" />
        </label>
      </div>

      <div className="mt-5 space-y-1">
        <span className="label">Sex (for the BMR formula)</span>
        <Seg value={sex} onChange={setSex} options={[["male", "Male"], ["female", "Female"]]} />
      </div>

      <div className="mt-5 space-y-1">
        <span className="label">Goal</span>
        <Seg value={goal} onChange={setGoal} options={[["lose", "Lose"], ["maintain", "Maintain"], ["gain", "Gain"]]} />
      </div>

      <label className="mt-5 block space-y-1">
        <span className="label">Activity</span>
        <select className={field} value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
          {(Object.keys(ACTIVITY) as Activity[]).map((k) => (
            <option key={k} value={k}>{ACTIVITY[k].label}</option>
          ))}
        </select>
      </label>

      <div className="mt-8 border-t border-line pt-6">
        <span className="label">Daily calories</span>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="num text-6xl">{kcal ?? "—"}</span>
          <span className="text-muted">kcal</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {computed ? `Mifflin St Jeor estimate: ${computed} kcal.` : "Fill in age, height and weight to calculate."}
        </p>
        <label className="mt-3 block space-y-1">
          <span className="label">Override (optional)</span>
          <input className={field} inputMode="numeric" value={override} onChange={(e) => setOverride(e.target.value)} placeholder={computed ? String(computed) : "2000"} />
        </label>

        {m && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(["protein", "carbs", "fat"] as const).map((k) => (
              <label key={k} className="space-y-1">
                <span className="label">{k} g</span>
                <input
                  className={field}
                  inputMode="numeric"
                  value={macroEdit ? macroEdit[k] : String(m[k])}
                  onChange={(e) => setMacroEdit({ protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat), ...macroEdit, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
        )}
        {macroEdit && (
          <button type="button" onClick={() => setMacroEdit(null)} className="mt-2 h-11 text-sm text-accent">
            Reset to default split
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-6">
        <label className="space-y-1">
          <span className="label">Steps goal</span>
          <input className={field} inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="label">Monthly budget RM</span>
          <input className={field} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="2000" />
        </label>
      </div>

      <button
        disabled={!kcal || busy}
        className="mt-8 h-12 w-full rounded-md bg-accent font-medium text-accent-ink transition-opacity duration-150 disabled:opacity-50"
      >
        {busy ? "Saving" : profile.onboarded ? "Save" : "Start tracking"}
      </button>
    </form>
  );
}
