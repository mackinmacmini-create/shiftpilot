# ShiftPilot — Test Checklist

## 1. Auth

- [ ] Sign up with email + password — confirm redirect to /dashboard
- [ ] Log in with correct credentials — confirm session
- [ ] Log in with incorrect credentials — confirm error message shown
- [ ] Log out — confirm redirect to /login, session cleared
- [ ] Session persistence — reload page while logged in, stay logged in
- [ ] Auth callback route (`/auth/callback`) — confirm it creates profile row on first login
- [ ] Admin bootstrap — sign up with `SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL` address, confirm `is_admin = true` in profiles table
- [ ] **TODO:** Password reset flow (not yet implemented — wire Supabase reset email)

---

## 2. RLS Verification

Create two test users (User A, User B) via Supabase Auth.

For each user-owned table, using the Supabase REST endpoint or Supabase client with the **anon key** and each user's session:

- [ ] `profiles`: User A cannot SELECT User B's profile row
- [ ] `profiles`: User A cannot UPDATE User B's profile row
- [ ] `availability_windows`: User A cannot SELECT User B's windows
- [ ] `availability_windows`: User A cannot INSERT with `user_id = B.id`
- [ ] `opportunity_logs`: User A cannot SELECT User B's logs
- [ ] `earnings_entries`: User A cannot SELECT User B's entries
- [ ] `notification_preferences`: User A cannot SELECT User B's prefs
- [ ] `driver_station_preferences`: User A cannot SELECT User B's preferences
- [ ] `stations`: Any authenticated user can SELECT (public read)
- [ ] `audit_logs`: Authenticated (non-admin) user gets 0 rows
- [ ] `notification_events`: User can INSERT — expected: **BLOCKED** (no INSERT policy)
- [ ] `audit_logs`: User can INSERT — expected: **BLOCKED** (no INSERT policy)

---

## 3. Safety Audit (run before every merge)

```bash
# Must return EMPTY (zero hits in src/, supabase/, public/)
# Hits in SAFETY.md, README.md, and UI disclaimer strings are acceptable.

grep -ri "flex\.amazon" src/ supabase/ public/ 2>/dev/null
grep -ri "uber\.com" src/ supabase/ public/ 2>/dev/null
grep -ri "doordash\.com" src/ supabase/ public/ 2>/dev/null
grep -ri "instacart\.com" src/ supabase/ public/ 2>/dev/null
grep -ri "puppeteer" src/ supabase/ public/ 2>/dev/null
grep -ri "playwright" src/ supabase/ public/ 2>/dev/null
grep -ri "selenium" src/ supabase/ public/ 2>/dev/null
# Check for headless browser patterns (not the word in UI copy):
grep -ri "headlessBrowser\|puppeteer\|new Browser\|launch.*headless" src/ supabase/ public/ 2>/dev/null

# Combined one-liner:
grep -ri "flex\.amazon\|uber\.com\|doordash\.com\|instacart\.com\|puppeteer\|playwright\|selenium\|headlessBrowser" src/ supabase/ public/ 2>/dev/null
```

Expected: zero results (or only in SAFETY.md / README.md disclaimer prose).

---

## 4. Per-Page Smoke Tests

For each page, confirm: loads without JS console errors, renders real content, all CRUD flows work end-to-end.

### Landing (`/`)
- [ ] Renders hero, 4 feature cards, disclaimer box, CTA buttons
- [ ] Logged-out: shows login/signup links
- [ ] Logged-in: redirects to /dashboard

### Auth
- [ ] `/login` — form submits, redirects on success, shows error on failure
- [ ] `/signup` — form submits, creates user, creates profile row

### Dashboard (`/dashboard`)
- [ ] Loads with no data — empty states for all sections
- [ ] Loads with data — shows today's ops, earnings sparkline, upcoming windows
- [ ] "Log opportunity" CTA navigates to /log

### Profile (`/profile`)
- [ ] Loads existing profile values into form
- [ ] Saves changes — confirm in DB
- [ ] Platform dropdown is labeled "informational only"
- [ ] Logout button works

### Stations (`/stations`)
- [ ] Lists all stations from seed data
- [ ] Search filter works
- [ ] Platform filter works
- [ ] Add to preferences — appears in "My preferences" section
- [ ] Remove from preferences — disappears

### Availability (`/availability`)
- [ ] Calendar renders week view with today highlighted
- [ ] Add window form — creates window, appears in list + calendar
- [ ] Delete window — disappears
- [ ] Recurring window — shows recurring indicator

### Wishlist (`/wishlist`)
- [ ] Add rule — creates desired_block row
- [ ] Delete rule — removes row
- [ ] Rules display correct day/time/pay constraints

### Log (`/log`)
- [ ] Log form — all fields, submits, appears in list
- [ ] Pagination — works for >20 entries
- [ ] Delete entry — removes row
- [ ] Outcome badges display correctly

### Earnings (`/earnings`)
- [ ] Add earnings entry form — all fields, submits
- [ ] Chart renders with data (or empty state without)
- [ ] Totals update on add/delete
- [ ] Delete entry — removes row

### Analytics (`/analytics`)
- [ ] Station tab — bar chart + station list with pay rates
- [ ] Day-of-week tab — bar chart + day grid
- [ ] Empty state with no data

### Settings — Notifications (`/settings/notifications`)
- [ ] Toggle push/email — saves to DB
- [ ] SMS toggle is disabled with "coming soon" label
- [ ] Quiet hours save correctly
- [ ] Min minutes before window saves correctly

### Admin pages (admin user only)
- [ ] `/admin` — stat cards render, recent audit events list
- [ ] `/admin/users` — searchable user list, toggle admin works
- [ ] `/admin/audit` — paginated log, entity type filter works
- [ ] `/admin/config` — edit config value, save updates DB

---

## 5. Admin Gating

- [ ] Non-admin user visits `/admin` — redirected (to /dashboard)
- [ ] Non-admin user visits `/admin/users` — redirected
- [ ] Non-admin user visits `/admin/audit` — redirected
- [ ] Non-admin user visits `/admin/config` — redirected
- [ ] Admin API actions called without admin session — return error

---

## 6. Audit Log Integrity

- [ ] Create a profile update — confirm `audit_logs` row with `action = "update"`, `entity_type = "profile"`
- [ ] Create an availability window — confirm `audit_logs` row
- [ ] Create an opportunity log — confirm `audit_logs` row
- [ ] Create an earnings entry — confirm `audit_logs` row
- [ ] Non-admin user tries to INSERT directly into `audit_logs` via REST — expect 403/blocked
- [ ] `audit_logs` has no UPDATE or DELETE policies — confirm via Supabase policy inspector

---

## 7. Notification Dispatcher Stub

To verify the stub is safe:

```bash
# 1. Start a local tcpdump or use a network proxy (e.g., mitmproxy)
# 2. POST to /api/notifications/dispatch
# 3. Inspect outbound traffic:
#    - Expected: ONLY calls to your Supabase project URL
#    - Expected: ZERO calls to amazon.com, uber.com, doordash.com, instacart.com, etc.

# Alternatively, wrap fetch() in dev with a blocklist:
# In next.config.ts (dev only), add a custom fetch wrapper that throws on disallowed hosts.

curl -X POST http://localhost:3000/api/notifications/dispatch
```

Expected response:
```json
{
  "dispatched": <n>,
  "note": "STUB: Notification events inserted but no outbound push/email calls made...",
  "ts": "..."
}
```

- [ ] `notification_events` rows are inserted with `delivered = null` and error noting it's a stub
- [ ] No outbound HTTP calls to any gig platform (verify via network capture or fetch wrapper)
- [ ] Quiet hours are respected (no events during quiet window)
- [ ] Frequency cap is respected (no more than N events per user per hour)

---

## 8. PWA

- [ ] `manifest.json` is valid — run through https://www.pwabuilder.com/
- [ ] Service worker registers on first load (check DevTools > Application > Service Workers)
- [ ] App is installable on mobile Chrome / Safari
- [ ] App loads offline (shows cached shell) after first visit
- [ ] Push notification permission prompt works
- [ ] Notification click opens /dashboard

---

## Suggested Automated Test Setup

```bash
# Unit/integration tests: Vitest + @testing-library/react
npm install -D vitest @testing-library/react @testing-library/user-event @vitejs/plugin-react jsdom

# E2E: Playwright
npm install -D @playwright/test

# Suggested test files:
# tests/unit/utils.test.ts       — formatCents, durationMinutes, payRatePerHour
# tests/unit/actions.test.ts     — server action validation (zod schemas)
# tests/e2e/auth.spec.ts         — signup, login, logout flows
# tests/e2e/log.spec.ts          — opportunity log CRUD
# tests/e2e/earnings.spec.ts     — earnings CRUD + chart render
# tests/e2e/admin.spec.ts        — admin gating + config edit
# tests/e2e/rls.spec.ts          — two-user RLS cross-contamination
```
