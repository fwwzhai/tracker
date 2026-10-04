# Daily Hub

Log food, money and steps in under 5 seconds each. Mobile-first PWA, MYR, Kuala Lumpur time.

## Run it on your laptop

1. Node 20+ (`node -v`), then `npm install`.
2. Create a free Supabase project. In **SQL Editor**, paste and run `supabase/setup.sql` (both migrations in one file).
3. Supabase **Authentication > URL Configuration**: Site URL `http://localhost:3000`, add redirect
   `http://localhost:3000/auth/callback` (and your Vercel URL later).
4. Supabase **Authentication > Emails > Magic Link** template: add `Your code: {{ .Token }}` so the
   email also carries a 6 digit code. Needed when the app is installed on iOS (links open in Safari,
   not the home screen app).
5. `cp .env.example .env.local` and fill in the Supabase URL, anon key, service role key, and the
   Gemini and OpenAI keys.
6. `npm run dev`, open http://localhost:3000, sign in with your email.

To try it on your phone over Wi-Fi: `npm run dev -- -H 0.0.0.0` and open `http://<laptop-ip>:3000`
(add that URL to the Supabase redirect list). Install as an app needs HTTPS, so deploy for that.

## Deploy (Vercel)

Import the repo in Vercel, add the same env vars, deploy, then add `https://<app>.vercel.app/auth/callback`
to the Supabase redirect URLs. On iPhone: Safari > Share > Add to Home Screen.

## Steps from iPhone

Settings > Steps sync: create a token, then follow the Shortcut steps shown there. The Shortcut POSTs
`{"steps": 8123}` to `/api/steps` with `Authorization: Bearer <token>`. Highest count per day wins.

## Log without opening the app

Settings > "Log without opening the app" has Shortcut recipes for `POST /api/log/expense` and
`POST /api/log/meal` (same token as steps). Bind them to the Action Button, Back Tap or Siri.

## Meal reminders (optional)

Run `supabase/migrations/0002_shortcuts_push.sql`, then `npx web-push generate-vapid-keys` and set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` in Vercel. `vercel.json`
schedules the check at 1pm and 8pm KL (two daily crons fit the Hobby plan). Turn it on in Settings, from the
installed app on iOS 16.4+.

## Models

- Photos: Gemini, `GEMINI_MODEL` (default `gemini-3.5-flash-lite`; `gemini-2.5-flash-lite` retires Oct 2026).
- All text (text meals, coach): OpenAI, `OPENAI_MODEL` (default `gpt-5-nano`, the cheapest current tier).
- AI calls are capped per user per day by `AI_DAILY_LIMIT` (default 60).

`npm test` runs the calorie parsing and budget maths tests.
