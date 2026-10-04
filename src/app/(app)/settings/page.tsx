"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, Download, LogOut, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { clearCache } from "@/lib/cache";
import { fmtMoney, toCents } from "@/lib/money";
import type { Category, Recurring } from "@/lib/types";

const field = "h-11 rounded-md border border-line bg-surface px-3 outline-none focus:border-accent";
const iconBtn = "flex h-11 w-11 shrink-0 items-center justify-center text-muted";

function Section({ id, title, children, note }: { id?: string; title: string; children: React.ReactNode; note?: string }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4 border-t border-line pt-4">
      <h2 className="label mb-3">{title}</h2>
      {children}
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </section>
  );
}

/** Text input that commits on blur or Enter. Re-keyed on value so server updates show. */
function Commit({ value, onCommit, className = "", ...rest }: { value: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue">) {
  return (
    <input
      {...rest}
      key={value}
      defaultValue={value}
      onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`${field} ${className}`}
    />
  );
}

export default function SettingsPage() {
  const s = useStore();
  const p = s.profile;
  if (!p) return <p className="label pt-6">Loading</p>;

  return (
    <div className="pb-10">
      <h1 className="num pt-4 text-4xl">Settings</h1>

      <Link href="/onboarding" className="mt-6 flex min-h-14 items-center justify-between border-y border-line">
        <span>
          Body and goals
          <span className="block text-sm text-muted">
            {p.kcal_goal} kcal · P {p.protein_g} C {p.carb_g} F {p.fat_g} · {p.weight_kg} kg
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} className="text-muted" />
      </Link>

      <Section title="Targets">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="label">Monthly budget</span>
            <Commit
              inputMode="decimal"
              value={p.monthly_budget_cents ? String(p.monthly_budget_cents / 100) : ""}
              placeholder="0"
              onCommit={(v) => s.updateProfile({ monthly_budget_cents: toCents(v) ?? 0 })}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="label">Steps goal</span>
            <Commit inputMode="numeric" value={String(p.steps_goal)} onCommit={(v) => s.updateProfile({ steps_goal: Math.max(0, Math.round(+v || 0)) })} className="w-full" />
          </label>
          <label className="space-y-1">
            <span className="label">kcal per step</span>
            <Commit inputMode="decimal" value={String(p.steps_factor)} onCommit={(v) => +v > 0 && +v < 0.2 && s.updateProfile({ steps_factor: +v })} className="w-full" />
          </label>
          <div className="space-y-1">
            <span className="label">Currency</span>
            <p className="flex h-11 items-center text-muted">MYR (RM)</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">Units are metric (kg, cm). Step burn is a rough estimate; 0.04 kcal per step suits most adults.</p>
      </Section>

      <Categories />
      <Presets />
      <RecurringList />
      <StepsSync />
      <QuickLog />
      <Reminders />
      <Data />

      <p className="mt-10 text-xs text-muted">
        Daily Hub gives general food and spending tips, not medical or financial advice. Talk to a doctor or dietitian before big changes.
      </p>
    </div>
  );
}

function Categories() {
  const { categories, reload } = useStore();
  const [name, setName] = useState("");
  const patch = async (c: Category, v: Partial<Category>) => {
    await supabase().from("categories").update(v).eq("id", c.id);
    reload();
  };
  return (
    <Section title="Categories and budgets" note="Leave a budget empty to only count it towards the monthly total.">
      {categories.map((c) => (
        <div key={c.id} className="flex items-center gap-2 py-1">
          <Commit value={c.name} onCommit={(v) => v.trim() && patch(c, { name: v.trim() })} className="min-w-0 flex-1" aria-label="Category name" />
          <Commit
            inputMode="decimal"
            value={c.monthly_budget_cents ? String(c.monthly_budget_cents / 100) : ""}
            placeholder="No limit"
            onCommit={(v) => patch(c, { monthly_budget_cents: toCents(v) })}
            className="w-28"
            aria-label={`${c.name} monthly budget`}
          />
          <button
            className={iconBtn}
            aria-label={`Delete ${c.name}`}
            onClick={async () => {
              if (!confirm(`Delete ${c.name}? Its expenses stay, without a category.`)) return;
              await supabase().from("categories").delete().eq("id", c.id);
              reload();
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await supabase().from("categories").insert({ name: name.trim(), sort: categories.length });
          setName("");
          reload();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className={`${field} flex-1`} />
        <button className={`${iconBtn} rounded-md border border-line text-ink`} aria-label="Add category">
          <Plus size={18} strokeWidth={1.75} />
        </button>
      </form>
    </Section>
  );
}

function AddMoneyRow({ onAdd, labelPlaceholder, withDay }: { onAdd: (v: { label: string; cents: number; cat: string | null; day: number }) => Promise<void>; labelPlaceholder: string; withDay?: boolean }) {
  const { categories } = useStore();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<string>(categories[0]?.id ?? "");
  const [day, setDay] = useState("1");
  const cents = toCents(amount);
  return (
    <form
      className="mt-2 grid grid-cols-[1fr_6rem] gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!label.trim() || !cents) return;
        await onAdd({ label: label.trim(), cents, cat: cat || null, day: Math.min(31, Math.max(1, +day || 1)) });
        setLabel("");
        setAmount("");
      }}
    >
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={labelPlaceholder} className={field} />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${field} num`} />
      <div className="col-span-2 flex gap-2">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${field} min-w-0 flex-1`} aria-label="Category">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {withDay && (
          <label className="flex items-center gap-2 text-sm text-muted">
            day
            <input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${field} w-16`} aria-label="Day of month" />
          </label>
        )}
        <button disabled={!label.trim() || !cents} className="h-11 rounded-md bg-accent px-4 text-accent-ink disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

function Presets() {
  const { presets, categories, reload } = useStore();
  return (
    <Section title={`One tap presets (${presets.length}/6)`} note="Presets sit above the bottom bar on Today. One tap adds them, with undo.">
      {presets.map((p) => (
        <div key={p.id} className="flex min-h-12 items-center gap-2 border-b border-line">
          <span className="flex-1">
            {p.label} <span className="text-sm text-muted">{categories.find((c) => c.id === p.category_id)?.name}</span>
          </span>
          <span className="num">{fmtMoney(p.amount_cents)}</span>
          <button
            className={iconBtn}
            aria-label={`Remove ${p.label}`}
            onClick={async () => {
              await supabase().from("presets").delete().eq("id", p.id);
              reload();
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      {presets.length < 6 && (
        <AddMoneyRow
          labelPlaceholder="Teh tarik"
          onAdd={async ({ label, cents, cat }) => {
            await supabase().from("presets").insert({ label, amount_cents: cents, category_id: cat, sort: presets.length });
            reload();
          }}
        />
      )}
    </Section>
  );
}

function RecurringList() {
  const { categories, reload } = useStore();
  const [rows, setRows] = useState<Recurring[]>([]);
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    supabase()
      .from("recurring")
      .select("*")
      .order("day_of_month")
      .then(({ data }) => setRows(data ?? []));
  }, [version]);
  return (
    <Section title="Recurring" note="Added automatically on their day each month (the last day for short months).">
      {rows.length === 0 && <p className="text-sm text-muted">Rent, phone plan, streaming. Add them once and stop thinking about them.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex min-h-12 items-center gap-2 border-b border-line">
          <span className="flex-1">
            {r.note} <span className="text-sm text-muted">day {r.day_of_month} · {categories.find((c) => c.id === r.category_id)?.name}</span>
          </span>
          <span className="num">{fmtMoney(r.amount_cents)}</span>
          <button
            className={iconBtn}
            aria-label={`Remove ${r.note}`}
            onClick={async () => {
              await supabase().from("recurring").delete().eq("id", r.id);
              load();
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <AddMoneyRow
        withDay
        labelPlaceholder="Rent"
        onAdd={async ({ label, cents, cat, day }) => {
          await supabase().from("recurring").insert({ note: label, amount_cents: cents, category_id: cat, day_of_month: day });
          await supabase().rpc("apply_recurring");
          load();
          reload();
        }}
      />
    </Section>
  );
}

function CopyBtn({ text, what, copied, copy }: { text: string; what: string; copied: string; copy: (t: string, w: string) => void }) {
  return (
    <button onClick={() => copy(text, what)} className={iconBtn} aria-label={`Copy ${what}`}>
      {copied === what ? <Check size={18} strokeWidth={1.75} className="text-accent" /> : <Copy size={18} strokeWidth={1.75} />}
    </button>
  );
}

function StepsSync() {
  const [info, setInfo] = useState<{ exists: boolean; created_at: string | null } | null>(null);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState("");
  const endpoint = typeof location !== "undefined" ? `${location.origin}/api/steps` : "/api/steps";

  useEffect(() => {
    fetch("/api/steps/token").then(async (r) => {
      if (r.ok) setInfo(await r.json());
    });
  }, []);

  async function rotate() {
    if (info?.exists && !confirm("Make a new token? The old one stops working, so update your Shortcut.")) return;
    const r = await fetch("/api/steps/token", { method: "POST" });
    if (r.ok) {
      const { token } = await r.json();
      setToken(token);
      setInfo({ exists: true, created_at: new Date().toISOString() });
    }
  }

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(""), 1500);
    });
  };


  return (
    <Section id="steps" title="Steps sync from iPhone">
      <p className="text-sm text-muted">
        Web apps cannot read Apple Health, so a Shortcut sends today&rsquo;s steps here. If several sources report a day, the highest count wins.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-3 py-3 text-sm">{endpoint}</code>
        <CopyBtn text={endpoint} what="URL" copied={copied} copy={copy} />
      </div>

      {token ? (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-accent bg-accent-soft px-3 py-3 text-sm">{token}</code>
            <CopyBtn text={token} what="token" copied={copied} copy={copy} />
          </div>
          <p className="mt-1 text-xs text-muted">Shown once. Copy it into the Shortcut now.</p>
        </div>
      ) : (
        <button onClick={rotate} className="mt-2 h-11 rounded-md border border-line px-4">
          {info?.exists ? "Rotate token" : "Create token"}
        </button>
      )}
      {info?.exists && !token && info.created_at && (
        <p className="mt-1 text-xs text-muted">Current token created {new Date(info.created_at).toLocaleDateString("en-MY")}.</p>
      )}

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>Shortcuts app, Automation tab, New: Time of Day, 9:30 pm, Daily, Run Immediately.</li>
        <li>
          Add <b>Find Health Samples</b>: Type Steps, Start Date is Today. Then <b>Calculate Statistics</b>: Sum of the
          samples (or use <b>Get Details of Health Sample</b>, Value, then Calculate Statistics Sum).
        </li>
        <li>
          Add <b>Get Contents of URL</b>: the URL above, Method POST, Headers <code>Authorization</code> ={" "}
          <code>Bearer YOUR_TOKEN</code>, Request Body JSON with key <code>steps</code> (Number) set to the Sum.
        </li>
        <li>Run it once by hand and check today&rsquo;s steps here. Add a second run at lunch time if you want fresher numbers.</li>
      </ol>
      <p className="mt-3 text-xs text-muted">
        Android later: Tasker or Health Sync can POST the same JSON to the same URL. Optional body fields: <code>date</code>{" "}
        (YYYY-MM-DD) and <code>source</code>.
      </p>
    </Section>
  );
}

function QuickLog() {
  const base = typeof location !== "undefined" ? location.origin : "";
  return (
    <Section id="quicklog" title="Log without opening the app">
      <p className="text-sm text-muted">
        Two more Shortcuts, same token as steps. Start them from the Action Button, Back Tap (Settings, Accessibility, Touch), Siri, or a
        Lock Screen button, so a log takes about three taps from a locked phone.
      </p>
      <p className="mt-4 text-sm font-medium">Log expense</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        <li><b>Ask for Input</b> (Number) with the prompt &ldquo;RM?&rdquo;.</li>
        <li><b>Choose from Menu</b> with your category names (Food, Transport, ...), and a <b>Text</b> action holding the choice in each branch.</li>
        <li>
          <b>Get Contents of URL</b>: <code>{base}/api/log/expense</code>, POST, header <code>Authorization: Bearer YOUR_TOKEN</code>, JSON body{" "}
          <code>amount</code> (the number) and <code>category</code> (the chosen text). Optional <code>note</code>.
        </li>
        <li><b>Show Result</b> or <b>Speak Text</b> with <code>message</code> from the response.</li>
      </ol>
      <p className="mt-4 text-sm font-medium">Log meal by voice</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        <li><b>Dictate Text</b> (say &ldquo;two roti canai and teh tarik&rdquo;).</li>
        <li>
          <b>Get Contents of URL</b>: <code>{base}/api/log/meal</code>, POST, same header, JSON body <code>text</code> = Dictated Text. The meal
          type comes from the time of day.
        </li>
        <li><b>Show Result</b> with <code>message</code>, e.g. &ldquo;764 kcal: Nasi lemak, Teh tarik&rdquo;.</li>
      </ol>
      <p className="mt-3 text-xs text-muted">Name a Shortcut &ldquo;Log expense&rdquo; and say &ldquo;Hey Siri, log expense&rdquo; to run it hands free.</p>
    </Section>
  );
}

function urlBase64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function Reminders() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<"checking" | "unsupported" | "off" | "on" | "denied">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [key]);

  async function toggle() {
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        return setState("off");
      }
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(key!) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setError("Could not change reminders. Try again.");
    }
  }

  return (
    <Section title="Meal reminders" note="A nudge at 1pm and 8pm, only if you have not logged a meal in the last 4 hours.">
      {state === "unsupported" && (
        <p className="text-sm text-muted">
          Needs the app installed to your Home Screen (Safari, Share, Add to Home Screen), iOS 16.4 or later, and the server&rsquo;s push keys set.
        </p>
      )}
      {state === "denied" && <p className="text-sm text-muted">Notifications are blocked. Allow them for Daily Hub in iPhone Settings, then come back.</p>}
      {(state === "on" || state === "off") && (
        <button onClick={toggle} className={`h-11 rounded-md px-4 ${state === "on" ? "border border-line" : "bg-accent text-accent-ink"}`}>
          {state === "on" ? "Turn reminders off" : "Turn reminders on"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Section>
  );
}

function Data() {
  const router = useRouter();
  return (
    <Section title="Your data">
      <a href="/api/export" className="flex h-12 items-center gap-3 border-b border-line">
        <Download size={18} strokeWidth={1.75} className="text-muted" /> Export everything as CSV
      </a>
      <button
        onClick={async () => {
          await supabase().auth.signOut();
          clearCache();
          router.replace("/login");
        }}
        className="flex h-12 w-full items-center gap-3 border-b border-line text-left"
      >
        <LogOut size={18} strokeWidth={1.75} className="text-muted" /> Sign out
      </button>
      <button
        onClick={async () => {
          if (prompt('This deletes your account and every log. Type "delete" to confirm.') !== "delete") return;
          const r = await fetch("/api/account", { method: "DELETE" });
          if (!r.ok) return alert("Could not delete the account. Try again.");
          await supabase().auth.signOut();
          clearCache();
          router.replace("/login");
        }}
        className="flex h-12 w-full items-center gap-3 text-left text-danger"
      >
        <Trash2 size={18} strokeWidth={1.75} /> Delete account
      </button>
    </Section>
  );
}
