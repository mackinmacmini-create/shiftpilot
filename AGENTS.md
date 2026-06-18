# ShiftPilot — Agent Instructions

## What This Is

ShiftPilot is a mobile-first PWA for gig drivers (Amazon Flex, Uber Eats, DoorDash, Instacart, etc.) to plan availability, track desired work blocks, manually log opportunities and earnings, and get reminder notifications.

**This is a productivity assistant. The user does all platform actions themselves.**

## Stack

- **Next.js 15** App Router, TypeScript strict mode
- **Tailwind CSS 4** (`@import "tailwindcss"` syntax in `globals.css`)
- **Supabase** Auth + Postgres, `@supabase/ssr` for server client
- **Recharts** for earnings charts
- **React Hook Form + zod** for forms
- **lucide-react** for icons
- **Package manager:** npm

## Architecture

```
src/
├── app/
│   ├── (auth)/          # login, signup, auth/callback
│   ├── (app)/           # all authenticated user pages + bottom nav layout
│   ├── admin/           # admin-only pages, separate layout with admin gate
│   └── api/             # API routes (opportunities GET, notifications/dispatch POST)
├── components/
│   ├── ui/              # button, card, input, label, select, textarea, badge, tabs
│   └── *.tsx            # BottomNav, CalendarGrid, EarningsChart, OpportunityForm, etc.
├── lib/
│   ├── supabase/        # client.ts, server.ts, middleware.ts
│   ├── types/db.ts      # TypeScript types for all 11 tables
│   ├── actions/         # Server actions per domain (profile, stations, availability, etc.)
│   ├── audit.ts         # Append-only audit log writer (uses service client)
│   └── utils.ts         # cn(), formatCents(), etc.
```

## Key Files

- `SAFETY.md` — **READ THIS FIRST** before any new feature work
- `supabase/migrations/0001_schema.sql` — 11-table schema
- `supabase/migrations/0002_rls.sql` — RLS policies + `is_admin()` helper
- `supabase/migrations/0003_seed.sql` — sample stations + platform_config
- `src/app/api/notifications/dispatch/route.ts` — OneSignal-backed dispatcher (bearer-gated; called by Vercel cron)
- `src/components/OneSignalInit.tsx` — client SDK init, tags Supabase user as `external_user_id`
- `src/components/ServiceWorkerRegistrar.tsx` — registers `public/sw.js` in production builds
- `src/lib/types/db.ts` — hand-written Database type. Replace with `supabase gen types typescript` output once the live project is up. Type errors from `never` row inference are runtime-safe but should be fixed before strict CI.
- `vercel.json` — registers the dispatcher cron schedule
- `vitest.config.ts` + `tests/unit/` — safety guards + dispatcher logic
- `playwright.config.ts` + `tests/e2e/` — smoke tests (browser install deferred to CI)
- `middleware.ts` — Supabase auth middleware, route protection

## Safety Contract (summary)

1. Never collect, store, or request gig-platform credentials
2. Never make HTTP calls to Amazon, Uber, DoorDash, Instacart, or any gig platform
3. Never automate, scrape, or act on a gig platform on the user's behalf
4. Reminders only — notify the user to check their own app, that's all
5. Manual data entry only — users type in what they earned/grabbed

See `SAFETY.md` for the full contract.

## Conventions

- Server components by default; `"use client"` only where interactive
- All mutations go through server actions in `src/lib/actions/`
- Every mutation calls `logAudit()` from `src/lib/audit.ts`
- Admin pages live in `src/app/admin/` with an admin-gate layout
- The bottom nav covers 5 items: Dashboard / Availability / Log / Earnings / More (profile)
- Safety banner appears on every authenticated page footer

## DB Color Coding

| Table | Owner | Notes |
|-------|-------|-------|
| profiles | user (PK = auth.uid()) | No external platform credentials |
| stations | admin-managed | Public read for all authenticated users |
| driver_station_preferences | user | junction: user ↔ station |
| availability_windows | user | with optional RRULE recurrence |
| desired_blocks | user | wishlist rules for reminders |
| opportunity_logs | user | manual only — what the user saw/grabbed |
| earnings_entries | user | what the user actually earned |
| notification_preferences | user (PK = user_id) | |
| notification_events | system writes via service role | user can read own |
| audit_logs | system writes via service role | admin read only, append-only |
| platform_config | admin writes | authenticated read |

## When Adding New Features

1. Read `SAFETY.md`
2. Check if any new table needs RLS (add to `0002_rls.sql`)
3. Add TypeScript types to `src/lib/types/db.ts`
4. Create server actions in `src/lib/actions/`
5. Call `logAudit()` in every mutation
6. Run the safety grep: `grep -ri "amazon\|flex.amazon\|uber.com\|doordash.com\|puppeteer\|playwright\|selenium\|headless" src/ supabase/ public/`
