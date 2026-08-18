# InventoriMan Remediation and Delivery Plan

**Created:** 2026-08-18  
**Status:** Phase 1 automated gate passed; owner manual acceptance pending
**Current authorized phase:** Phase 1 — Secure Electron, IPC, authentication, and permissions

## Purpose

This document is the controlling implementation plan for improving InventoriMan. Work must be completed sequentially, one phase at a time. A phase is complete only after its automated checks pass, its manual acceptance checklist passes, and the project owner explicitly approves moving forward.

## Mandatory delivery workflow

Every phase follows this workflow:

1. Review the current phase scope and inspect the working tree.
2. Preserve all existing user changes; never reset or overwrite unrelated work.
3. Create a safe checkpoint before risky implementation work.
4. Add or update tests that demonstrate the targeted defect or requirement.
5. Implement only the work listed in the current phase.
6. Run the phase's unit, integration, static, build, and security checks.
7. Codex performs an application smoke test and writes a concise test report.
8. The project owner performs the manual acceptance checklist.
9. Fix failures and repeat both automated and manual testing.
10. Record the result in the Progress Register.
11. Start the next phase only after explicit owner approval.

## Definition of done for every phase

A phase is not complete unless all applicable conditions are satisfied:

- [ ] Phase scope is implemented without unrelated feature work.
- [ ] New or changed business logic has unit tests.
- [ ] Relevant integration tests pass.
- [ ] Typecheck, lint, Electron syntax checks, and production build pass.
- [ ] Changed UI is responsive at the required viewport sizes with no clipping or unintended horizontal scrolling.
- [ ] Changed UI passes visual review for hierarchy, density, consistency, and professional finish.
- [ ] No unresolved P0 or P1 defect remains in the phase scope.
- [ ] Existing data and unrelated user changes are preserved.
- [ ] Automated test results are documented.
- [ ] Manual acceptance checklist is completed by the owner.
- [ ] Owner explicitly approves progression to the next phase.

## Mandatory UI and responsive-design standard

These requirements apply to every phase that creates or changes user-facing UI.

### Product design direction

- Design InventoriMan as a calm, precise, data-forward retail operations console.
- Favor clarity, speed, and information hierarchy over decorative effects.
- Use a deliberate design system for color, typography, spacing, radii, shadows, icons, and interaction states.
- Keep one restrained visual signature for the product; avoid generic template styling and excessive gradients, glass effects, oversized headings, or decorative cards.
- Use real retail content and realistic empty, loading, error, offline, and permission-denied states.

### Layout and component rules

- Build mobile-first/adaptive layouts and progressively enhance for wider screens.
- Use sensible content maximum widths; forms and settings must not stretch across the full display without reason.
- Keep cards and panels proportionate to their content. Do not use large empty containers, excessive padding, or deeply nested rounded `div` elements.
- Prefer semantic page, section, header, navigation, form, table, and list structures over wrapper-heavy markup.
- Break large UI components into focused components with clear responsibilities.
- Preserve useful information density for POS, inventory, reports, and dashboards.
- Make tables responsive through column prioritization, horizontal containment, or deliberate card/list transformations.
- Keep primary actions visible and predictable; destructive actions must be visually distinct and confirmed.
- Provide consistent focus, hover, pressed, selected, disabled, success, warning, and error states.

### Responsive targets

Test changed desktop/web interfaces at minimum at:

- 360 × 800 — compact phone width.
- 390 × 844 — common phone width.
- 768 × 1024 — tablet/compact window.
- 1024 × 768 — small desktop window.
- 1280 × 800 — primary Electron target.
- 1440 × 900 — large desktop target.

The desktop application does not need to imitate a phone application, but narrowing the window must preserve navigation, readable content, usable forms, and access to every action.

### Accessibility and interaction quality

- Meet WCAG 2.1 AA contrast and keyboard-access requirements.
- Use visible keyboard focus and logical focus order.
- Associate form controls with labels and actionable error messages.
- Maintain touch targets of approximately 44 × 44 pixels on touch layouts.
- Respect reduced-motion preferences and avoid motion that delays work.
- Use plain, consistent UX copy that tells users what happened and how to recover.

### UI verification gate

- Add component or interaction tests for changed UI behavior.
- Add responsive screenshot or visual-regression coverage for critical screens.
- Inspect screenshots at the required viewports after implementation.
- Verify no overlap, clipping, accidental overflow, unreadable chart, hidden action, or oversized empty panel.
- A UI change cannot pass solely because it compiles; it requires automated checks and owner visual acceptance.

## Progress Register

Only update a phase to `Complete` after automated testing and explicit manual approval.

| Phase | Status | Automated result | Manual result | Owner approval |
|---|---|---|---|---|
| Phase 0 — Stabilization | Complete | Passed — 37/37 tests and Electron smoke (2026-08-18) | Passed (2026-08-18) | Approved (2026-08-18) |
| Phase 1 — Security boundary | Awaiting manual acceptance | Passed — 50/50 tests, build, security checks, Electron smoke (2026-08-18) | Pending | Pending |
| Phase 2 — POS integrity | Blocked by Phase 1 | Pending | Pending | Pending |
| Phase 3 — Inventory and procurement | Blocked by Phase 2 | Pending | Pending | Pending |
| Phase 4 — Database reliability | Blocked by Phase 3 | Pending | Pending | Pending |
| Phase 5 — Cloud synchronization | Blocked by Phase 4 | Pending | Pending | Pending |
| Phase 6 — Licensing and distribution security | Blocked by Phase 5 | Pending | Pending | Pending |
| Phase 7 — Professional responsive UI, QA, and pilot release | Blocked by Phase 6 | Pending | Pending | Pending |
| Phase 8 — Admin mobile application | Blocked by Phase 7 | Pending | Pending | Pending |

---

## Phase 0 — Stabilize the project

**Test report:** [Phase 0 test report](./PHASE_0_TEST_REPORT.md)  

**Estimated effort:** 2–3 days  
**Goal:** Establish a clean, runnable, testable baseline.

### Scope

- Fix the database worker syntax error.
- Repair malformed System Settings JSX and tax types.
- Resolve TypeScript and ESLint errors.
- Repair failing synchronization tests.
- Fix updater scope and event-wiring errors.
- Add consolidated scripts for typecheck, Electron syntax checking, lint, tests, and build.
- Add an initial CI workflow that runs the same release checks.
- Preserve all existing worktree changes.

### Automated tests

- Run `node --check` on every `electron/*.cjs` file.
- Run TypeScript typechecking.
- Run ESLint.
- Run every existing Node test.
- Produce the Vite production build.
- Launch Electron through an automated startup smoke test.

### Manual acceptance

- Start the desktop application.
- Confirm the login screen appears.
- Log in and visit every page.
- Confirm Settings opens without a blank screen.
- Close and reopen the application.
- Confirm existing database data remains intact.

### Exit gate

- Zero build, syntax, type, or lint errors.
- All automated tests pass.
- Application launches and closes normally.

---

## Phase 1 — Secure Electron, IPC, authentication, and permissions

**Test report:** [Phase 1 test report](./PHASE_1_TEST_REPORT.md)

**Estimated effort:** 5–8 days  
**Goal:** Make Electron's main process the trusted security boundary.

### Scope

- Remove generic renderer invocation and arbitrary SQL IPC.
- Replace raw queries with typed business APIs.
- Validate every IPC payload with strict schemas.
- Maintain the authenticated session in Electron's main process.
- Derive staff identity, role, and store from the trusted session.
- Enforce authorization in every sensitive main-process command.
- Add PIN throttling and temporary lockout.
- Replace the default owner PIN with first-run enrollment.
- Add channel, table, and column allowlists.
- Add a Content Security Policy and block unexpected navigation and windows.

### Automated tests

- Cashier, manager, admin, and owner permission matrix.
- Forged staff and store identifiers are rejected.
- Unknown IPC channels are unavailable.
- Invalid, malformed, and oversized payloads are rejected.
- Repeated incorrect PINs trigger throttling.
- Renderer code cannot execute SQL directly.

### Manual acceptance

- Create owner, admin, manager, and cashier accounts.
- Verify all allowed actions for each role.
- Attempt restricted actions for each role.
- Verify restricted operations remain blocked outside their normal UI paths.

### Exit gate

- No renderer SQL access remains.
- Every sensitive handler has authentication, authorization, validation, and tests.
- Manual role matrix passes.

---

## Phase 2 — POS, payments, returns, exchanges, and stock integrity

**Estimated effort:** 7–10 days  
**Goal:** Ensure financial operations cannot be manipulated or partially committed.

### Scope

- Introduce a central order domain service.
- Load authoritative prices from SQLite.
- Validate quantities, prices, discounts, tax, payment methods, and stock.
- Recalculate all monetary totals in Electron.
- Store money as integer minor units such as paisa.
- Reject insufficient stock instead of silently clamping stock to zero.
- Commit checkout, stock, ledger, audit, and sync-outbox records in one transaction.
- Make order creation idempotent.
- Calculate refunds using original order-item values.
- Prevent duplicate and excessive returns or exchanges.

### Automated tests

- Retail and wholesale checkout.
- Zero, negative, decimal, and excessive quantities.
- Manipulated renderer price or total.
- Insufficient stock and concurrent sale attempts.
- Duplicate checkout request.
- Simulated transaction failure and rollback.
- Partial, complete, duplicate, and excessive returns.
- Higher-cost and lower-cost exchanges.
- Cash refund and customer-credit outcomes.
- Tax and rounding edge cases.

### Manual acceptance

- Complete cash, card, and bank sales.
- Apply discounts and taxes.
- Attempt an out-of-stock sale.
- Process partial and full refunds.
- Process both exchange balance outcomes.
- Restart and verify totals, stock, and history.

### Exit gate

For every transaction, order, items, stock, ledger, audit, and outbox records must all commit or all roll back.

---

## Phase 3 — Inventory, customers, suppliers, and purchase orders

**Estimated effort:** 5–7 days  
**Goal:** Make operational modules tenant-safe and transactionally correct.

### Scope

- Migrate remaining renderer queries to typed services.
- Enforce store scoping on every operation.
- Add store-scoped uniqueness for SKUs, brands, and references.
- Validate customer and supplier data.
- Make purchase-order creation and editing atomic.
- Make purchase-order receiving atomic and idempotent.
- Prevent receiving cancelled or previously received orders.
- Include ledger and outbox records in the same receiving transaction.
- Add bulk-import validation and actionable error reporting.

### Automated tests

- Identical SKUs in different stores.
- Cross-store access attempts.
- Duplicate brands and references.
- Valid and invalid CSV imports.
- Partial PO failure rollback.
- Receiving a PO twice.
- Editing a received PO.
- Deleting referenced records.

### Manual acceptance

- Create and edit products, brands, customers, and suppliers.
- Import valid and invalid CSV files.
- Create, edit, cancel, and receive purchase orders.
- Verify every stock change has a ledger record.
- Confirm Store A cannot see Store B data.

### Exit gate

- Every operation is store-scoped.
- Purchase-order receiving cannot double stock.
- No operational module uses renderer SQL.

---

## Phase 4 — Database reliability, migrations, backup, and recovery

**Estimated effort:** 4–6 days  
**Goal:** Protect local data from corruption and failed upgrades.

### Scope

- Enable WAL, foreign keys, busy timeout, and appropriate synchronization settings.
- Handle database-worker errors and unexpected exits.
- Make migrations transactional and fail startup safely.
- Add schema-health checks and required indexes.
- Define complete factory-reset semantics.
- Validate backup integrity and schema compatibility.
- Create an automatic pre-restore backup.
- Restore through a temporary file and atomic replacement.

### Automated tests

- Fresh database creation.
- Upgrade from every supported schema version.
- Failure halfway through a migration.
- Worker crash handling.
- Corrupt or incompatible backup rejection.
- Successful backup and restore.
- Factory-reset completeness.
- Interrupted restore protection.

### Manual acceptance

- Create data and take a backup.
- Make changes and restore the backup.
- Verify exact data recovery.
- Attempt to restore an invalid file.
- Restart after an upgrade.
- Perform a factory reset on disposable data.

### Exit gate

- Failed migrations cannot produce a partially usable application.
- Backup and restore pass with realistic data.

---

## Phase 5 — Reliable offline-first cloud synchronization

**Estimated effort:** 8–12 days  
**Goal:** Guarantee eventual synchronization without missed changes or tenant leakage.

### Scope

- Finalize the transactional outbox.
- Store cloud sessions in the operating system credential vault.
- Implement token refresh and expiry handling.
- Add idempotency keys, retry scheduling, and dead-letter management.
- Add server change-log cursors for catch-up synchronization.
- Add deletion tombstones.
- Replace timestamp-based vector-clock behavior with explicit versions.
- Whitelist conflict-resolution fields.
- Use cloud transactions or RPCs for aggregate records.
- Automate Supabase schema and RLS migrations.
- Add sync diagnostics and reconciliation.

### Automated tests

- Offline transaction followed by reconnect.
- Crash before, during, and after sync.
- Duplicate event delivery.
- Expired authentication session.
- Device offline during remote changes and deletion.
- Two-device edit conflicts.
- Concurrent stock changes.
- Cross-store RLS attempts.
- Malformed cloud payloads.
- Retry-limit and dead-letter behavior.

### Manual acceptance

- Use two clean application profiles for separate stores.
- Test offline sales and reconnection.
- Test missed remote updates and deletions.
- Test conflicting edits and duplicate sync attempts.
- Confirm strict Store A and Store B isolation.

### Exit gate

- No committed local transaction can be lost.
- Missed realtime events are recovered after reconnect.
- One store cannot access another store's data.

---

## Phase 6 — Licensing, updater, secrets, and dependency security

**Estimated effort:** 3–5 days  
**Goal:** Secure distribution and commercial controls.

### Scope

- Replace arbitrary license activation with signed entitlements.
- Add offline verification and explicit grace-period behavior.
- Detect clock rollback.
- Redact credentials and license keys from logs.
- Repair updater events and installation.
- Upgrade or replace vulnerable dependencies.
- Add dependency auditing to CI.
- Configure signing and release provenance.

### Automated tests

- Valid, invalid, expired, altered, and revoked licenses.
- Offline grace period and clock rollback.
- Secret redaction.
- Update available, downloaded, and installation events.
- Dependency audit with documented exceptions.

### Manual acceptance

- Activate valid and invalid licenses.
- Test offline license behavior.
- Download and install an update.
- Confirm logs contain no secrets.

### Exit gate

- No exploitable critical or high production dependency issue remains.
- Licensing and updater pass in packaged applications.

---

## Phase 7 — Professional responsive UI, QA automation, and pilot release

**Estimated effort:** 8–12 days  
**Goal:** Deliver a polished, responsive professional interface and establish a repeatable production-release process.

### Scope

- Audit every screen against the Mandatory UI and Responsive-Design Standard.
- Define and document the final visual direction before broad UI implementation.
- Consolidate color, typography, spacing, radius, shadow, icon, and state tokens.
- Refactor oversized panels, excessive whitespace, inconsistent cards, and wrapper-heavy components.
- Establish consistent page headers, toolbars, filters, forms, tables, modals, feedback states, and navigation.
- Make dashboards, reports, inventory, settings, customer, sales, and purchase-order screens responsive at every required viewport.
- Make charts resize safely and keep labels, tooltips, legends, and values readable.
- Add professional loading, empty, error, offline, and permission-denied states.
- Add React component and interaction tests.
- Add Electron end-to-end tests with Playwright.
- Add accessibility and keyboard-navigation checks.
- Add responsive screenshot and visual-regression tests for critical screens.
- Add macOS and Windows CI matrices.
- Add database performance and packaged-app smoke tests.
- Add release, rollback, and known-risk documentation.
- Add privacy-safe operational logging.

### Coverage targets

- Domain and financial services: at least 90%.
- Authentication and authorization: at least 90%.
- Sync engine: at least 85%.
- Overall meaningful coverage: at least 75–80%.
- All critical user journeys covered by end-to-end tests.
- Critical screens covered by responsive visual-regression baselines.

### Manual acceptance

- Complete owner, manager, and cashier workflows.
- Complete the sale, return, exchange, and PO lifecycle.
- Test offline operation and reconnection.
- Test backup and disaster recovery.
- Test multi-store isolation.
- Verify barcode scanner, thermal printer, and receipts.
- Verify packaged installation on macOS and Windows.
- Resize every critical desktop screen through the required viewport sizes.
- Verify no oversized empty container, hidden action, clipped content, or unintended horizontal page scroll remains.
- Review the final interface for consistent hierarchy, density, typography, spacing, and interaction feedback.

### Exit gate

- All automated checks pass.
- Manual UAT is approved.
- No P0 or P1 defect remains.
- Recovery and rollback are verified.
- Packaged builds work on target hardware.
- Owner approves the professional responsive UI through screenshot and hands-on review.

---

## Phase 8 — Admin mobile application

**Estimated effort:** 6–10 weeks for a tested MVP  
**Goal:** Give business owners and authorized administrators a secure mobile view of live sales, dashboards, inventory, returns, and business-event notifications.

### Sequencing and dependencies

- This phase starts only after Phase 7 is complete and explicitly approved.
- Phase 5 must provide the reliable cloud event stream, catch-up synchronization, tenant isolation, and canonical cloud records consumed by mobile.
- The mobile application must connect to the cloud platform; it must never connect directly to a desktop SQLite database.
- The first release is read-only for business data. Mobile write operations require a separately approved scope after the read-only MVP is stable.
- React Native with Expo is the proposed implementation because the project already uses React and TypeScript; the final framework decision will be confirmed at this phase's kickoff.

### MVP scope

- Secure owner/admin authentication and session management.
- Store and multi-branch selection based on authorized memberships.
- Real-time sales feed with order value, payment method, cashier, store, and timestamp.
- Dashboard for daily, weekly, and monthly revenue and transaction metrics.
- Sales trends and store/branch comparisons.
- Inventory list with search, current stock, low-stock indicators, and out-of-stock indicators.
- Returns feed with order reference, returned items, value, reason, staff member, store, and timestamp.
- Push notifications when a sale or return is completed.
- Per-store and per-event notification preferences.
- Reconnect handling, last-updated indicators, and cached read-only data for weak connections.
- Privacy-safe error reporting and notification content.
- Responsive, professional phone and tablet layouts with compact data presentation and no oversized empty cards.

### Mobile architecture

- Use Supabase Auth or the approved cloud identity provider with RLS-enforced queries.
- Store mobile credentials in iOS Keychain and Android Keystore-backed secure storage.
- Use realtime subscriptions for live updates plus the Phase 5 cursor API for missed-event recovery.
- Generate notifications on the trusted server side after committed sale/return events.
- Deliver notifications through Expo Notifications or direct APNs/FCM after a documented architecture decision.
- Never embed service-role credentials or other privileged cloud secrets in the application.
- Reuse shared TypeScript contracts for stores, orders, products, returns, dashboard metrics, and events.

### Automated tests

- Unit tests for dashboard calculations, formatting, filtering, and notification preferences.
- Component tests for loading, empty, error, stale, and populated states.
- Authentication and role-authorization tests.
- RLS and cross-store isolation integration tests.
- Realtime sale and return delivery tests.
- Missed-event catch-up and duplicate-event tests.
- Secure token storage and logout tests.
- Push-notification registration, delivery, deep-link, and preference tests.
- Offline-cache and reconnect tests.
- End-to-end tests for critical owner/admin journeys on iOS and Android.
- Accessibility tests for primary screens.
- Visual-regression tests for compact phone, standard phone, large phone, and tablet layouts.

### Manual acceptance

- Sign in as an owner and as an authorized admin.
- Verify an unauthorized user cannot access any store.
- Switch between two authorized stores and confirm strict data isolation.
- Complete a desktop sale and verify it appears live on mobile.
- Complete a desktop return and verify it appears live on mobile.
- Verify sale and return push notifications on a physical iPhone and Android phone.
- Disable one notification type and confirm the preference is respected.
- Disconnect the phone, create sales and returns, reconnect, and verify missed events are recovered without duplicates.
- Verify dashboard totals match the desktop/cloud reports for identical date ranges.
- Verify stock and low-stock values match the authoritative cloud state.
- Test logout, token expiry, application restart, and lost-network behavior.
- Review dashboard, sales, stock, returns, and settings on small and large phones and a tablet.
- Verify charts, filters, lists, and alerts remain readable with larger accessibility text sizes.

### Exit gate

- iOS and Android builds pass automated and manual acceptance testing.
- Dashboard, sales, stock, and return values reconcile with authoritative cloud data.
- Sale and return notifications are delivered once, respect preferences, and never leak another store's data.
- No service-role secret or sensitive session value is exposed.
- No unresolved P0 or P1 mobile defect remains.
- Owner explicitly approves the mobile MVP before distribution.
- Owner approves the final mobile UI for responsiveness, density, hierarchy, accessibility, and professional finish.

## Phase completion report template

At the end of each phase, record:

```markdown
## Phase N Completion Report

- Scope completed:
- Files changed:
- Architecture decisions:
- Unit tests added:
- Integration/E2E tests added:
- Automated commands and results:
- Manual checklist result:
- Defects found and resolved:
- Remaining risks:
- Owner approval to proceed: Pending / Approved
```
