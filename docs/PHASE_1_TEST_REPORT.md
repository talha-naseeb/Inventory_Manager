# Phase 1 — Security Boundary Test Report

**Date:** 2026-08-18
**Branch:** `codex/phase-1-security-boundary`
**Status:** Complete — automated and manual gates passed; owner approved

## Implemented scope

- Made Electron's main process the trusted owner of local staff sessions, roles, and active store scope.
- Removed the generic preload `invoke` function and all renderer SQL/query/execute access.
- Replaced renderer database access with fixed product, customer, order, report, procurement, staff, settings, maintenance, license, and synchronization APIs.
- Added trusted-renderer checks, centralized role permissions, exact-key payload schemas, type/range/length/array/total-size limits, and fixed SQL statements.
- Added one-time first-run owner enrollment with hashed PIN storage and no shared default PIN.
- Added failed-PIN throttling and a five-minute temporary lockout.
- Added structured login failures so the application displays remaining PIN attempts and the exact lockout retry duration without an expected IPC handler stack.
- Derived `staff_id` and `store_id` from the main-process session for mutations, inventory logs, and sync outbox rows.
- Added a restrictive Content Security Policy and blocked unexpected navigation, redirects, and new windows.
- Kept the packaged Content Security Policy strict while allowing Vite's inline React-refresh bootstrap only during local development.
- Moved cloud synchronization commands behind the same authenticated and authorized IPC router.
- Added a compact, responsive owner-enrollment screen with mismatch feedback and accessible form labels.

## Automated evidence

The complete project gate passed:

```text
npm run release:check
```

| Check | Result |
|---|---|
| Electron syntax | Passed — 24 `.cjs` files |
| ESLint | Passed — 0 errors |
| TypeScript | Passed — 0 errors |
| Node unit/integration/security tests | Passed — 50/50 |
| Vite production build | Passed |
| Electron startup smoke | Passed — isolated fresh database and renderer mount |

Security coverage includes the four-role permission matrix, main-process identity derivation, forged staff/store fields, unknown channels, untrusted senders, malformed and oversized payloads, PIN lockout, single-use owner enrollment, environment-specific CSP rules, session-derived database records, and a static assertion that no renderer SQL bridge remains.

The Electron smoke test used a temporary user-data directory and did not read or modify the production database.

## Codex UI verification

- Owner enrollment rendered successfully in a real Chromium browser with a desktop-API mock.
- PIN mismatch feedback appeared and submission remained disabled.
- No runtime console errors were reported.
- The compact 360 × 640 stress viewport had `scrollWidth === innerWidth` and, after spacing refinement, `scrollHeight === innerHeight`.
- The required 360 × 800, 390 × 844, 768 × 1024, 1024 × 768, 1280 × 800, and 1440 × 900 viewports all had no horizontal overflow and kept the enrollment fields visible.
- The production Electron renderer mounted successfully under the configured CSP.

## Non-blocking observations

- Vite still reports a large renderer bundle and mixed static/dynamic imports for `src/services/database.ts`. This is a performance optimization item, not a Phase 1 security blocker.
- Phase 2 must make prices, totals, tax, discounts, quantities, and stock calculations authoritative in Electron. Phase 1 secures who may call an operation and which store it affects; it intentionally does not implement Phase 2 financial-integrity changes.

## Owner manual acceptance checklist

Use a safe test database or backup current data first, then start the app with `npm run dev:electron`.

### Enrollment and login

- [x] On a fresh test database, confirm the app asks to set up the owner instead of accepting a default PIN.
- [x] Enter mismatching PINs and confirm setup remains blocked with a clear message.
- [x] Create the owner, log out, and log back in with the new PIN.
- [x] Enter an incorrect PIN five times and confirm login is temporarily locked.
- [x] Restart after successful enrollment and confirm the enrollment form cannot be opened again.

### Create the role matrix

- [x] As owner, create one admin, manager, and cashier with unique PINs.
- [x] Log out and log in separately as each account.

### Cashier

- [x] Confirm POS, sales lookup, and customer work are available.
- [x] Confirm inventory management, procurement, reports, staff, database maintenance, cloud settings, and refund/return processing are unavailable or denied.

### Manager

- [x] Confirm POS, inventory editing/adjustment, procurement, reports, and return processing work.
- [x] Confirm product deletion, staff management, business-setting edits, database maintenance, cloud activation, license activation, and update installation are unavailable or denied.

### Admin and owner

- [x] Confirm administrative settings, staff management, backups, and authorized destructive operations work after confirmation.
- [x] Confirm neither account can delete or deactivate its own active administrative session through staff management.

### Restart and regression

- [x] Complete one safe allowed action for each role, close the app, reopen it, and confirm data is preserved.
- [x] Confirm no blank page, unexpected external window, clipped enrollment form, or horizontal scrolling appears.
- [x] Report the failed checklist item, role, screen, and exact action if anything behaves unexpectedly.

## Owner approval

Approved by the project owner on 2026-08-18. Phase 1 is complete and Phase 2 is authorized.
