# ShiftPilot — Supabase Setup

## Apply Migrations

Run migrations in order against your Supabase project:

```bash
# Option 1 — Supabase CLI (recommended)
supabase db push

# Option 2 — psql directly
psql "$DATABASE_URL" -f migrations/0001_schema.sql
psql "$DATABASE_URL" -f migrations/0002_rls.sql
psql "$DATABASE_URL" -f migrations/0003_seed.sql
```

## Reset (dev only)

```bash
supabase db reset
```

## Migration order

| File | Purpose |
|------|---------|
| `0001_schema.sql` | All 11 tables, indexes, updated_at triggers |
| `0002_rls.sql` | RLS enable + all policies + `is_admin()` helper |
| `0003_seed.sql` | Sample stations + platform_config defaults |

## Getting your keys

1. Go to Supabase dashboard > your project > Settings > API
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
