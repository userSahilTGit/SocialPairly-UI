# Test results — feature/ratingsNsupportexperience

Date: 2026-11-22

## Playwright smoke (UI + API)

Command: `npm run test:smoke`  
Servers: UI `3000`, API `9030`

| Suite | Result |
|-------|--------|
| api-smoke | passed |
| ui-smoke | passed |
| **Total** | **66 passed** (1.9m) |

HTML report (local): `playwright-report/index.html`

## Screenshots

- `_test_shots/ratingsNsupportexperience/smoke-66-passed.png` — 66 passed summary
- `_test_shots/ratingsNsupportexperience/smoke-playwright-report.png` — Playwright HTML report

Paired backend JaCoCo screenshots live in Workflow-manager:
`_test_shots/ratingsNsupportexperience/jacoco-bundle.png` and `jacoco-98.5-pass.png`.

## Backend JaCoCo (paired Workflow-manager branch)

Bundle instructions **98.5%**, branches **95.2%**, lines **98.6%** (≥90% proceed threshold **PASS**).

## Decision

Smoke green and backend coverage above 90% → proceed with push / MR / merge to `main`.
