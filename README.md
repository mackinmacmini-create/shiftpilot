# ShiftPilot

A mobile-first PWA for gig drivers to plan availability, track work blocks, manually log opportunities and earnings, and get reminder notifications.

**Safety first:** ShiftPilot never logs into, scrapes, or acts on any gig platform. See [SAFETY.md](./SAFETY.md).

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS 4** (`@import "tailwindcss"` syntax)
- **Supabase** (Auth + Postgres), `@supabase/ssr`
- **Recharts** for earnings charts
- **React Hook Form + zod** for forms
- **lucide-react** for icons
- **PWA**: hand-rolled manifest + service worker

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, never expose to browser) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (e.g. `https://shiftpilot.app`) |
| `SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL` | No | First signup with this email is auto-promoted to admin. Clear after use. |
| `CRON_SECRET` | Yes (prod) | Random string. Vercel cron sends it as `Authorization: Bearer …` to the dispatcher. If unset, the dispatcher refuses every request. |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | No | OneSignal app id for browser SDK. Unset → push delivery is skipped (events still recorded). |
| `ONESIGNAL_REST_API_KEY` | No | OneSignal REST key for server-side delivery. Server-only — never expose to the browser. |

**Never add env vars for Amazon, Uber, DoorDash, or any gig platform credentials. See SAFETY.md.**

---

## Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Settings > API and copy your Project URL, anon key, and service_role key
3. Apply migrations in order:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually via psql
psql "$DATABASE_URL" -f supabase/migrations/0001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_seed.sql
```

See [supabase/README.md](./supabase/README.md) for details.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000.

---

## Build

```bash
npm run build
npm start
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo into Vercel
3. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
   - `SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL` (optional, clear after first use)
4. Build command: `next build`
5. Output directory: `.next` (default)
6. Domain: set in Vercel dashboard. Update `NEXT_PUBLIC_APP_URL` to match.

### First Admin

1. Set `SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL` in Vercel env vars
2. Sign up with that exact email address at `/signup`
3. The auth callback will set `is_admin = true` on your profile
4. Remove `SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL` from env vars (or set to empty) to prevent others from using it

---

## Notification Dispatcher (Cron)

`/api/notifications/dispatch` is wired to **OneSignal** for push delivery and is
invoked every minute by **Vercel cron** (see `vercel.json`).

Auth: the route refuses every request unless `Authorization: Bearer <CRON_SECRET>`
is present. Vercel cron attaches that header automatically when `CRON_SECRET` is
set in project env.

Provider behavior:
- If `NEXT_PUBLIC_ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are set, the
  dispatcher calls `https://api.onesignal.com/notifications` and targets users
  by `external_user_id` (their Supabase user_id).
- If either is unset, the dispatcher still records `notification_events` rows
  with `delivered=false` and an error reason, so the dashboard surfaces it.

The OneSignal Web SDK is initialized client-side in `src/components/OneSignalInit.tsx`
and calls `OneSignal.login(user.id)` after Supabase auth, so we never store
OneSignal player_ids in our database.

**Safety contract:** the dispatcher only calls `api.onesignal.com`. It must
NEVER call any gig-platform API. The Vitest safety suite enforces this.

---

## PWA / App Icons

Place icon files in `public/icons/` before deploying. See `public/icons/README.md` for required sizes. Use the teal (`#2dd4bf`) accent color — no Amazon orange, Uber black-white, or DoorDash red.

---

## Testing

```bash
npm test          # Vitest unit suite (safety guards + dispatcher rules)
npm run test:watch
npm run e2e:install   # one-time, installs Chromium for Playwright
npm run e2e           # Playwright smoke (auth + protected routes)
```

The safety suite (`tests/unit/safety.test.ts`) greps the entire `src/` tree for
gig-platform hosts and browser-automation libraries on every CI run — if any
ever appear, the build fails.

## Safety Audit

Run before every PR merge:

```bash
npm test          # automated guard
# or, ad-hoc:
grep -ri "flex\.amazon\|uber\.com\|doordash\.com\|instacart\.com\|puppeteer\|playwright\|selenium\|headlessBrowser" src/ supabase/ public/ 2>/dev/null
```

Expected: zero results (hits in SAFETY.md and disclaimer prose are OK).

---

## License

Private — not licensed for redistribution.

ShiftPilot is not affiliated with, endorsed by, or otherwise connected to Amazon Flex, Uber, DoorDash, Instacart, or any other gig platform. All trademarks belong to their respective owners.
