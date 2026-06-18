# ShiftPilot Safety Contract

This document is the authoritative safety contract for ShiftPilot. Every contributor — human or AI agent — must read this before touching the codebase.

## What ShiftPilot Is

ShiftPilot is a **personal planning assistant** for gig drivers. It is a calendar, journal, analytics tool, and reminder system that the user configures themselves. The user operates their own gig apps. ShiftPilot only stores what the user manually enters.

## Hard Rules — Non-Negotiable

### 1. No third-party platform credentials
ShiftPilot must NEVER collect, store, request, prompt for, or process:
- Passwords for Amazon Flex, Uber Eats, DoorDash, Instacart, or any other gig platform
- OAuth tokens for any gig platform
- Session cookies from any gig platform
- API keys for any gig platform

The `profiles` table has zero credential fields for external platforms. The `primary_platform` column is a free-text label for display purposes only.

### 2. No scraping, no API calls to gig platforms
ShiftPilot must make ZERO HTTP requests to:
- amazon.com, flex.amazon.com, or any Amazon domain
- uber.com, ubereats.com, or any Uber domain
- doordash.com or any DoorDash domain
- instacart.com or any Instacart domain
- Any other gig platform domain

The codebase must contain zero fetch/axios/request/HTTP calls to any gig platform.

**Audit command (run this before every PR merge):**
```bash
grep -ri "amazon\|flex\.amazon\|uber\.com\|doordash\.com\|instacart\.com\|puppeteer\|playwright\|selenium\|headless" src/ supabase/ public/ 2>/dev/null
```
Expected result: empty (or hits only in SAFETY.md, README.md, and disclaimer copy strings).

### 3. No automation against gig platforms
ShiftPilot must NEVER:
- Auto-grab, auto-click, or perform any automated action on any gig platform
- Bypass CAPTCHAs
- Use headless browsers (Puppeteer, Playwright, Selenium) against any gig platform
- Run background workers that "act as the user" on a gig platform
- Impersonate a user on any external platform

### 4. Reminders only
When ShiftPilot decides "now is a good time to check," it:
- Sends a notification to the user (push, email, or in-app)
- The notification text says something like: "Your availability window is starting. Open your gig app and check for offers."
- ShiftPilot does NOT open the app, does NOT log in, does NOT grab a block

The user opens their own Flex/Uber/DoorDash app and acts manually.

### 5. Manual opportunity logging only
Users type in what they grabbed (time, pay, station). There is NO:
- "Import from Flex" feature
- "Sync with Uber" feature
- "Connect my account" feature
- Any form of automated data import from a gig platform

## What ShiftPilot IS Allowed To Do

- Store user-entered data in Supabase (availability windows, opportunity logs, earnings, preferences)
- Send in-app / push / email notifications that remind the user to check their own apps
- Compute analytics from the user's own manually-entered data
- Make calls to its own Supabase backend, Supabase Auth, and (in the future) its own push notification provider (FCM/OneSignal/APNs)
- Make calls to a push provider like Firebase Cloud Messaging — but ONLY to deliver ShiftPilot's own reminders, never to interact with a gig platform

## Guardrails for Future Development

Before adding any new feature, ask:
1. Does this require connecting to a gig platform API? → STOP.
2. Does this store a gig platform credential? → STOP.
3. Does this automate any action on a gig platform on the user's behalf? → STOP.
4. Does this import data from a gig platform without the user manually entering it? → STOP.

If the answer to any of these is "yes," redesign the feature or do not build it.

## Disclaimers in Product Copy

The following disclaimer must appear on:
- The marketing landing page (/)
- The signup page
- The SafetyBanner component (every authenticated page footer)
- The README

> "ShiftPilot is a personal planning tool. It does not connect to, log into, scrape, or act on Amazon Flex, Uber Eats, DoorDash, Instacart, or any other gig platform on your behalf. All actions on those platforms are taken by you."

Amazon Flex, Uber, DoorDash, and Instacart are trademarks of their respective owners. ShiftPilot is not affiliated with, endorsed by, or otherwise connected to any gig platform.
