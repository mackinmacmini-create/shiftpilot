# Supabase Project Decision — Pro Upgrade vs Reuse Inactive

**Decision owner:** London. **Status:** pending before ShiftPilot prod deploy.

ShiftPilot needs a Supabase project to host auth + Postgres + RLS in production. Two paths:

**Option A — Upgrade the current Supabase project to Pro.** $25/mo per org. Project keeps its current ref, migrations, and seed.

**Option B — Reuse an inactive free-tier Supabase project.** No new spend. Re-apply migrations from scratch.

## Trade-offs

| Dimension | Pro upgrade ($25/mo) | Reuse inactive free |
|---|---|---|
| Monthly cost | $25/mo per org (covers up to 8 paused-free projects too) | $0 |
| DB size cap | 8 GB included, scales | 500 MB hard cap |
| File storage | 100 GB included | 1 GB hard cap |
| Bandwidth / egress | 250 GB included | 5 GB hard cap |
| Monthly active users | 100,000 | 50,000 |
| Daily backups | Yes, 7-day retention | No |
| Point-in-time recovery | Add-on ($100/mo) | No |
| Auto-pause on inactivity | Never | Pauses after 7 days idle — login fails until you unpause manually |
| Custom SMTP for auth emails | Yes | No (rate-limited shared sender) |
| Log retention | 7 days | 1 day |
| Data isolation | One project per app, clean | Shared project — mixing apps means careful schema namespacing |
| Migration friction today | None — `db push` against the same ref | Full re-apply: `0001_schema.sql`, `0002_rls.sql`, `0003_seed.sql` in order |
| Future scale story | Stays usable past free-tier walls | Hit a wall at 500 MB / 50K MAU and have to migrate anyway |

## What this actually means for ShiftPilot today

- ShiftPilot's schema is small (11 tables, all RLS-gated). It fits inside the free tier for a long time.
- The real free-tier risk for ShiftPilot is **auto-pause**. A reminder dispatcher that fires every minute against a paused project = silent failure + a user-visible "can't sign in" Monday morning. Free-tier projects only auto-pause if there's **zero database activity for 7 days**, so a steady cron actually keeps it awake — but the moment usage stalls (vacation, beta gap), pause kicks in.
- Daily backups + PITR matter the moment real user data lands. On free tier, a bad migration = no rewind.

## Recommendation

**Option A — upgrade to Pro.** Reasons in order:

1. ShiftPilot writes to `audit_logs` continuously. Losing that history to a bad migration on free tier (no backups) is an irreversible compliance regression — SAFETY.md framing of this product means audit logs are evidence of lawful use.
2. Auto-pause + magic-link auth = a real "user can't sign in" failure mode if usage is bursty. Pro removes the variable.
3. $25/mo is one Fractal client invoice line — not a real cost gate for a product that is meant to actually ship to users. Reusing an inactive project to save $25 trades real product risk for ambient budget anxiety; bad trade.
4. Reuse-inactive only makes sense if ShiftPilot is staying internal-only. The PWA + push + reminders shape says external users are the point.

If you genuinely want to defer the spend until first paying user, **Option B is acceptable for a closed personal-use beta with you as the only user** — the auto-pause and backup risks are tolerable when blast radius = London. Switch to Pro the day a second user signs up.

## What to do today

### If you pick Option A (Pro upgrade — recommended)

1. Supabase dashboard → org → Billing → upgrade to Pro plan.
2. Confirm the existing project is on the upgraded org.
3. Note the project ref (in the URL) — pass to skill section 2: `supabase link --project-ref <REF>`.
4. Continue with the `jarvis-nextjs-supabase-deploy` skill from step 2.

### If you pick Option B (reuse inactive)

1. Supabase dashboard → pick the inactive project → unpause if needed.
2. **Wipe the existing schema first** so RLS doesn't conflict — in SQL editor: `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;`
3. Note the project ref and rotate `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role → "Reset").
4. Continue with the `jarvis-nextjs-supabase-deploy` skill from step 2 — `db push` will re-apply all migrations against the clean schema.
5. Set a reminder to upgrade to Pro the moment a real user signs up, and back up `audit_logs` weekly to a CSV in the meantime.
