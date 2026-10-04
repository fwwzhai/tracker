@AGENTS.md

# Daily Hub

Single-user mobile-first PWA: log food, money, steps fast. MYR, Asia/Kuala_Lumpur.

## Stack
Next.js 16 App Router + TS + Tailwind v4, Supabase (magic link auth, Postgres + RLS), Lucide icons.
AI: `src/lib/ai` only. Gemini = photos (`GEMINI_MODEL`), OpenAI = all text (`OPENAI_MODEL`). Server-side only.

## Commands
- `npm run dev` / `npm run build` / `npm run lint`
- `npm test` (vitest; tests only for calorie parsing + budget math)
- Schema: `supabase/migrations/*.sql` (paste into Supabase SQL editor, or `supabase db push`)

## Folder map
- `src/app/(app)/*` screens behind auth: home `/`, `expenses`, `steps`, `coach`, `settings`, `onboarding`
- Meal, expense, weight entry are global sheets (`src/components/*-sheet.tsx`) opened via `useUi()` (`src/lib/ui.tsx`)
- `src/app/login`, `src/app/auth/callback` magic link
- `src/app/api/*` route handlers (AI, steps ingest, `log/*` Shortcut logging, push, cron, export, account)
- `src/components/*` UI pieces (sheet, bars, ring, toast, swipe row, bottom bar)
- `src/lib/*` pure logic: `calories.ts`, `budget.ts`, `meal.ts`, `time.ts`, `money.ts`; data: `store.tsx` (shared state, cache, optimistic writes), `outbox.ts`, `cache.ts`; AI: `ai/index.ts`, `ai/guard.ts`, `coach.ts`
- `src/lib/supabase/{client,server,admin}.ts`, `src/proxy.ts` (auth gate)
- `public/sw.js` hand-written service worker (shell cache + offline)

## Conventions
- Money = integer cents. Timestamps UTC in DB; display + "today" via `src/lib/time.ts` (KL).
- Design tokens in `src/app/globals.css` (`--bg --ink --accent ...`) -> Tailwind `bg-bg text-ink border-line`.
  Serif (Newsreader) for big numbers via `font-display`; Instrument Sans for UI.
- 4px spacing base. Tap targets >= 44px. Primary actions in bottom 40%. Motion 150-200ms, state changes only.
- No new libraries without asking. No emoji icons, no gradients, no glass. Lucide, strokeWidth 1.75.
- Client components talk to Supabase directly (RLS); AI, steps ingest, export, account deletion go via `/api`.
- Expense adds are optimistic and go through `outbox.ts` (offline queue).
