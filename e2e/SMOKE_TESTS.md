# SocialPairly end-to-end smoke tests

Playwright smoke suite that exercises **API + UI** across auth, onboarding, profile, media, events, billing, support, and admin modules.

When a case fails, the error starts with:

```text
FAILING FUNCTIONALITY: <area> — <feature>
```

Test titles follow: `SMOKE | <Area> | <feature>`.

## Prerequisites

1. **Workflow-manager** running on port `9010` (see `src/config/ports.js` / `ports.properties`).
2. **UI** running on port `3001` (`npm run dev`) — required for UI smoke; API smoke can use the Vite `/api` proxy or hit the backend directly.
3. Seeded admin: `admin@socialpairly.com` / `Admin@123` (override with env vars below).
4. Auth login is rate-limited (`login-max=10` / 15 min). Prefer one full `npm run test:smoke` per window. If you hit `429 Too Many Requests`, restart Workflow-manager (in-memory limiter resets) or wait for the window.

## Run

```bash
# Full smoke (API + UI)
npm run test:smoke

# API only (faster; still covers backend end-to-end through HTTP)
npm run test:smoke:api

# UI only (browser flows)
npm run test:smoke:ui

# HTML report after a run
npm run test:smoke:report
```

### Optional env

| Variable | Purpose | Default |
|----------|---------|---------|
| `SMOKE_BASE_URL` | UI origin | `http://127.0.0.1:3001` |
| `SMOKE_API_BASE_URL` | API origin (same-origin proxy or backend) | same as `SMOKE_BASE_URL` |
| `SMOKE_ADMIN_EMAIL` | Admin login | `admin@socialpairly.com` |
| `SMOKE_ADMIN_PASSWORD` | Admin password | `Admin@123` |
| `SMOKE_MEMBER_EMAIL` | Reuse a fixed member instead of registering | _(auto-register)_ |
| `SMOKE_MEMBER_PASSWORD` | Password for fixed member | — |

Example (PowerShell):

```powershell
$env:SMOKE_ADMIN_EMAIL="admin@socialpairly.com"
$env:SMOKE_ADMIN_PASSWORD="Admin@123"
npm run test:smoke
```

## What is covered

### API smoke (`e2e/smoke/api`)

| Area | Checks |
|------|--------|
| Public | Plans catalog, phone country codes, support contact, unauth `/users/me` rejected |
| Auth | Admin login, member register, bad login, logout, forgot-password OTP endpoint |
| Member | Profile, completion, identity/personality onboarding, questions, media, events |
| Billing | Current subscription, payment status, refunds, upgrades |
| Admin | Stats, users, questions, media, identity docs, plans, subscriptions, payments, refunds, upgrades, events, RBAC catalog; member blocked from admin |

### UI smoke (`e2e/smoke/ui`)

| Area | Checks |
|------|--------|
| Auth pages | Sign-in/up render, guest redirect, member login, forgot-password modal |
| Member pages | Identity/personality/faith onboarding, home, profile, media, subscriptions, contact, settings, notifications, logout |
| Admin pages | Login + every `/admin/*` dashboard heading; member blocked from `/admin` |

## Intentionally light / deferred

These need external systems or multi-step fixtures and are **not** deep-smoked:

- Google OAuth / Apple Sign-In
- Firebase SMS phone verification (feature flag off in Phase 1)
- Stripe Checkout redirect + webhook fulfillment (needs Stripe test keys + browser bank flow)
- Full refund bank-details / upgrade fee checkout write paths
- Event RSVP → workspace reactions (needs published event + invited participant fixtures)
- Media upload binary moderation pipeline

## Interpreting failures

1. Open the list reporter line: `SMOKE | Billing | GET /api/subscriptions/current`
2. Read the assertion message: `FAILING FUNCTIONALITY: Subscriptions — current subscription`
3. Optional: `npm run test:smoke:report` for screenshots/traces on UI failures
